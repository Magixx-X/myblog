/**
 * 端口工具：检测占用 + 释放端口。
 *
 * ── 为什么不用 netstat 判定是否"被占用" ──
 * 实测在 Windows + Git Bash 下，`netstat -ano [-p TCP|TCPv6]` 对 vite 的
 * 监听端口经常**什么都查不到**（进程挂在独立会话里时尤为明显），
 * 但服务其实活着、端口确实被占。
 * 所以「是否被占」一律用 **TCP 连接探测** 判定 —— 能不能连上，
 * 比 netstat 说了什么更接近事实。
 *
 * netstat 只保留一个用途：**在确认被占之后，尽力查出是哪个 PID**，
 * 以便给出可读的提示、并尝试结束它。查不到 PID 不影响判定结论。
 */
import { execSync } from 'node:child_process'
import { createConnection } from 'node:net'

/* ------------------------------------------------------------------ *
 * 连接探测
 * ------------------------------------------------------------------ */

/** 尝试连一下 host:port，能连上说明有人在监听 */
export function probePort(port, host = '127.0.0.1', timeoutMs = 700) {
  return new Promise((resolve) => {
    const sock = createConnection({ port, host })
    let settled = false

    const done = (result) => {
      if (settled) return
      settled = true
      sock.destroy()
      resolve(result)
    }

    sock.setTimeout(timeoutMs)
    sock.once('connect', () => done(true))
    sock.once('timeout', () => done(false))
    sock.once('error', () => done(false))
  })
}

/**
 * 端口是否被占用。
 * 同时探 IPv4 与 IPv6 —— vite 默认可能只绑 IPv6（`[::1]`）。
 */
export async function isPortInUse(port) {
  const [v4, v6] = await Promise.all([
    probePort(port, '127.0.0.1'),
    probePort(port, '::1')
  ])
  return v4 || v6
}

/* ------------------------------------------------------------------ *
 * PID 查表（尽力而为）
 * ------------------------------------------------------------------ */

/**
 * 从 netstat 文本里找 LISTENING 在指定端口上的 PID。
 *
 * 端口必须精确匹配到字段结尾，否则 `:5173` 会误中 `:51737`。
 * 导出仅为单测使用。
 */
export function parseNetstatForPort(out, port) {
  for (const raw of out.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    const parts = line.split(/\s+/)
    if (parts.length < 5) continue

    // 字段：Proto LocalAddress ForeignAddress State PID
    const local = parts[1]
    const state = parts[3]
    const pidStr = parts[parts.length - 1]

    if (!/^LISTENING$/i.test(state)) continue
    if (!new RegExp(`:${port}$`).test(local)) continue

    const pid = Number(pidStr)
    if (Number.isInteger(pid) && pid > 0) return pid
  }
  return null
}

/** 查端口上的 PID。查不到返回 null（不代表端口没被占） */
export function findPidOnPort(port) {
  const attempts = [
    'netstat -ano',
    'netstat -ano -p TCP',
    'netstat -ano -p TCPv6'
  ]

  for (const cmd of attempts) {
    try {
      const out = execSync(cmd, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      })
      const pid = parseNetstatForPort(out, port)
      if (pid != null) return pid
    } catch {
      /* 换下一种方式 */
    }
  }
  return null
}

/**
 * 结束进程。
 *
 * 默认按 **进程树** 结束，这一点很关键：
 * 我们用 `shell: true` 起 `npx vite`，真实结构是
 *   node(launcher) → cmd.exe → node(npx) → node(vite) → esbuild
 * 只杀直接子进程会留下 vite 和 esbuild，端口继续被占 —— 这正是
 * 「停止后端口没释放、下次启动打不开」的成因。
 *
 * Windows 用 `taskkill /T /F`（/T = 连同子进程树）；
 * POSIX 优先杀进程组，失败再退化为单进程。
 *
 * 成功返回 true。
 */
export function killPid(pid, { tree = true } = {}) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
    } else if (tree) {
      // 先试进程组（负 PID），失败再退化为单进程
      try {
        process.kill(-pid, 'SIGKILL')
      } catch {
        process.kill(pid, 'SIGKILL')
      }
    } else {
      process.kill(pid, 'SIGKILL')
    }
    return true
  } catch {
    // taskkill 有时返回非零（进程已退出、部分子进程不存在），
    // 但这不代表目标还活着 —— 交给调用方用端口探测复核
    return false
  }
}

/**
 * 结束进程树并确认端口真的空出来。
 * 比 killPid 更彻底：若首次没杀掉，再试一次，最后用端口探测兜底判断。
 */
export async function killPidAndVerify(pid, port, { timeoutMs = 6000 } = {}) {
  killPid(pid, { tree: true })

  let freed = await waitForFree(port, timeoutMs)
  if (freed) return true

  // 再试一次：有些情况下父进程已死、只剩子进程占着端口
  const remaining = findPidOnPort(port)
  if (remaining != null && remaining !== pid) {
    killPid(remaining, { tree: true })
    freed = await waitForFree(port, 3000)
  }
  return freed
}

/* ------------------------------------------------------------------ *
 * 对外主流程
 * ------------------------------------------------------------------ */

/**
 * 释放端口：检测 → 尝试结束占用进程 → 等端口真正空出来。
 *
 * 返回 { port, inUse, pid, killed, freed }
 */
export async function freePort(port, { log = () => {}, timeoutMs = 6000 } = {}) {
  const inUse = await isPortInUse(port)

  if (!inUse) {
    log(`端口 ${port} 空闲`)
    return { port, inUse: false, pid: null, killed: false, freed: true }
  }

  const pid = findPidOnPort(port)

  if (pid == null) {
    // 占用是真的，但查不到 PID —— 常见于进程在其它会话/沙箱里
    log(`端口 ${port} 被占用，但查不到对应进程（可能在其它终端会话中）`)
    return { port, inUse: true, pid: null, killed: false, freed: false }
  }

  // 按进程树结束：vite 是 cmd.exe 的孙子进程，
  // 只杀父进程会留下它继续占着端口。
  const freed = await killPidAndVerify(pid, port, { timeoutMs })

  log(
    freed
      ? `端口 ${port} 被 PID ${pid} 占用，已结束`
      : `端口 ${port} 的 PID ${pid} 已结束，但端口仍被占用`
  )

  return {
    port,
    inUse: true,
    pid,
    killed: true,
    freed
  }
}

/** 批量释放 */
export async function freePorts(ports, opts) {
  const out = []
  for (const p of ports) out.push(await freePort(p, opts))
  return out
}

/** 轮询等端口变为空闲 */
export async function waitForFree(port, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!(await isPortInUse(port))) return true
    await new Promise((r) => setTimeout(r, 250))
  }
  return !(await isPortInUse(port))
}

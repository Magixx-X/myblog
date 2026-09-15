/**
 * 端到端验证启动脚本。
 *
 * 场景：
 *   1. 先起一个"孤儿" vite 占住 5173
 *   2. 再运行 npm run dev，确认它能发现占用、清掉孤儿、成功接管 5173
 *   3. 清理现场
 *
 * 注意：判定"被占用"一律用 TCP 连接探测，不用 netstat。
 * 实测 netstat 在 Windows 上经常查不到 vite 的监听端口。
 *
 * 用法：node scripts/test-launcher.mjs
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { isPortInUse, findPidOnPort, killPid, freePort } from './port-utils.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PORT = 5173

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? `  ${detail}` : ''}`)
  ok ? pass++ : fail++
}

const children = []

async function killAll() {
  for (const c of children) {
    try { c.kill('SIGKILL') } catch { /* ignore */ }
  }
  // 关键：先杀我们记录的进程，再按进程树清端口上的占用者。
  // vite 是 cmd.exe 的孙子进程，只杀直接子进程清不干净。
  for (let i = 0; i < 3; i++) {
    const pid = findPidOnPort(PORT)
    if (pid == null) break
    killPid(pid, { tree: true })
    await sleep(600)
  }
  // 兜底：直接调用 freePort 把所有相关进程都收掉
  await freePort(PORT, { log: () => {} })
}

async function waitForServer(url, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) })
      if (res.ok) return true
    } catch { /* retry */ }
    await sleep(400)
  }
  return false
}

async function waitGone(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(1000) })
    } catch {
      return true
    }
    await sleep(300)
  }
  return false
}

/** 等输出里出现某个模式 */
async function waitOutput(getOutput, re, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (re.test(getOutput())) return true
    await sleep(200)
  }
  return re.test(getOutput())
}

/** 等端口上的 PID 变成不同于 oldPid 的新值 */
async function waitNewPid(port, oldPid, timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const pid = findPidOnPort(port)
    if (pid != null && pid !== oldPid) return pid
    await sleep(300)
  }
  return findPidOnPort(port)
}

try {
  console.log('\n[1] 确保起始状态：5173 空闲')
  const pid0 = findPidOnPort(PORT)
  if (pid0 != null) { killPid(pid0); await sleep(300) }
  const busyAtStart = await isPortInUse(PORT)
  check('起始时 5173 空闲', !busyAtStart, busyAtStart ? '端口被占用且无法自动清理' : '')
  if (busyAtStart) throw new Error('起始端口不干净，无法继续测试')

  console.log('\n[2] 起一个孤儿 vite 占住 5173')
  const orphan = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT, stdio: 'ignore', shell: true
  })
  children.push(orphan)

  const orphanUp = await waitForServer(`http://localhost:${PORT}/`, 40000)
  check('孤儿进程已占住 5173（探测可达）', orphanUp)
  if (!orphanUp) throw new Error('孤儿进程没起来，无法继续测试')

  check('isPortInUse 判定为占用', await isPortInUse(PORT))
  console.log(`      netstat 查到的 PID: ${findPidOnPort(PORT) ?? '（查不到，属正常）'}`)

  console.log('\n[3] 运行启动脚本，应自动接管 5173')
  const orphanPid = findPidOnPort(PORT)
  console.log(`      孤儿 PID: ${orphanPid ?? '（netstat 查不到）'}`)

  const launcher = spawn('node', ['scripts/start-dev.mjs'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(PORT), NO_OPEN: '1' }, shell: false
  })
  children.push(launcher)

  let output = ''
  launcher.stdout.on('data', (d) => { output += d.toString() })
  launcher.stderr.on('data', (d) => { output += d.toString() })

  let launcherExited = null
  launcher.on('exit', (code) => { launcherExited = code ?? 0 })

  // 关键：不能只等"服务可访问" —— 孤儿进程本身就在响应 5173，
  // 那样会把孤儿的服务误判成启动脚本的成果。
  // 必须等端口上的进程真的换成新 PID。
  const newPid = await waitNewPid(PORT, orphanPid, 45000)
  check('端口占用者已更换（说明接管成功）', newPid != null && newPid !== orphanPid,
    `${orphanPid ?? '?'} → ${newPid ?? '?'}`)

  const gotPortLog = await waitOutput(() => output, /端口\s*5173/, 15000)
  check('输出提到了端口处理', gotPortLog,
    output.split('\n').map((l) => l.trim()).find((l) => /端口/.test(l)) || '(输出中未出现)')

  check('启动脚本进程仍在运行', launcherExited === null,
    launcherExited === null ? '' : `已退出 code=${launcherExited}`)

  console.log('\n[4] 站点真的能打开')
  try {
    const res = await fetch(`http://localhost:${PORT}/`, { signal: AbortSignal.timeout(5000) })
    const html = await res.text()
    check('返回 200', res.status === 200, `status=${res.status}`)
    check('HTML 含 app 挂载点', html.includes('id="app"'))
    check('加载的是 vite 客户端', html.includes('/@vite/client'))
  } catch (e) {
    check('站点可访问', false, e.message)
  }

  // ---------- 生命周期 ----------
  //
  // 重要：Windows 上 child.kill('SIGTERM') 等价于强制终止（TerminateProcess），
  // Node 的 SIGTERM 处理器根本不会触发 —— 所以「信号转发」在硬杀场景下不可依赖。
  // 同理，任务管理器结束进程、终端被直接关掉，都会留下孤儿。
  //
  // 因此真正的保证不是「退出时永不残留」，而是 **自愈**：
  // 下次启动能清掉遇到的任何残留。这才是用户「打不开」问题的根治点。
  // 在 POSIX 上额外验证一次优雅退出确实会释放端口。
  console.log('\n[5] 强杀后必须能自愈（这是关键保证）')

  launcher.kill('SIGKILL') // 模拟任务管理器结束进程 / 终端被直接关闭
  await sleep(3000)

  // 强杀之后端口上很可能有残留——这没关系，重点是接下来能否自愈
  const leftoverPid = findPidOnPort(PORT)
  const leftover = await isPortInUse(PORT)
  console.log(`      强杀后端口状态: ${leftover ? `被残留进程占用（PID ${leftoverPid ?? '?'}）` : '已释放'}`)

  const reviver = spawn('node', ['scripts/start-dev.mjs'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(PORT), NO_OPEN: '1' }, shell: false
  })
  children.push(reviver)

  let reviveOutput = ''
  reviver.stdout.on('data', (d) => { reviveOutput += d.toString() })
  reviver.stderr.on('data', (d) => { reviveOutput += d.toString() })

  // 同样不能只看"能访问"——残留进程也在响应。
  // 必须确认端口占用者换成了新进程。
  const revivedPid = await waitNewPid(PORT, leftoverPid, 45000)
  check(
    '残留被清掉且由新进程接管',
    revivedPid != null && revivedPid !== leftoverPid,
    `${leftoverPid ?? '无残留'} → ${revivedPid ?? '?'}`
  )

  const reviveExited = await new Promise((r) => {
    let done = false
    reviver.on('exit', (c) => { if (!done) { done = true; r(c ?? 0) } })
    setTimeout(() => { if (!done) { done = true; r(null) } }, 1500)
  })
  check('自愈过程中启动脚本未异常退出', reviveExited === null,
    reviveExited === null ? '' : `退出 code=${reviveExited}`)

  try {
    const res = await fetch(`http://localhost:${PORT}/`, { signal: AbortSignal.timeout(5000) })
    const html = await res.text()
    check('自愈后站点返回 200', res.status === 200, `status=${res.status}`)
    check('自愈后渲染的是本站', html.includes('id="app"'))
  } catch (e) {
    check('自愈后站点返回 200', false, e.message)
  }

  // POSIX 平台额外验证优雅退出
  if (process.platform !== 'win32') {
    console.log('\n[5b] POSIX：优雅退出应释放端口')
    reviver.kill('SIGTERM')
    await sleep(3000)
    check('SIGTERM 后端口已释放', !(await isPortInUse(PORT)))
  } else {
    console.log('\n[5b] Windows：跳过优雅退出断言')
    console.log('      child.kill 在 Windows 上是强制终止，无法触发 SIGTERM 处理器')
  }
} catch (err) {
  check('测试执行未抛异常', false, err.message)
} finally {
  console.log('\n[6] 清理与收尾')
  await killAll()
  await sleep(1000)
  const gone = await waitGone(`http://localhost:${PORT}/`, 15000)
  check('最终端口已释放', gone)

  console.log(`\n${'='.repeat(46)}`)
  console.log(`通过 ${pass}/${pass + fail}`)
  if (fail) { console.log('有失败项 ✗'); process.exit(1) }
  console.log('全部通过 ✓\n')
  process.exit(0)
}

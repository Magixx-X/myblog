/**
 * 启动开发服务器。
 *
 * 比直接 `vite` 多做四件事：
 *   1. 启动前释放端口 —— 清掉上次被强杀留下的孤儿 vite 进程
 *   2. 用 --strictPort —— 端口被占就明确报错，而不是静默换到 5174 让用户找不着
 *   3. 自动打开浏览器
 *   4. 退出时按进程树清理，尽量不留孤儿
 *
 * 为什么需要 1 和 4：
 *   vite 是通过 cmd.exe 起的，进程链是
 *     node(本脚本) → cmd.exe → node(npx) → node(vite) → esbuild
 *   只杀直接子进程会留下孙子进程继续占着端口。
 *   而 Windows 上「强制结束进程」「直接关终端」又不会触发我们的退出处理器，
 *   所以**自愈比完美清理更重要** —— 启动时清理是最终保障。
 *
 * 用法：npm run dev
 *       PORT=3000 npm run dev     # 换端口
 *       NO_OPEN=1 npm run dev     # 不自动开浏览器（测试 / CI）
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { freePort, findPidOnPort, killPid } from './port-utils.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const rawPort = process.env.PORT
const PORT = rawPort == null || rawPort === '' ? 5173 : Number(rawPort)
const HOST = 'localhost'

// 端口合法性必须在这里拦下。否则越界的值会一路传到 net.connect，
// 抛 ERR_SOCKET_BAD_PORT 并甩出一串 Node 内部堆栈——对用户毫无信息量。
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error(
    `\n  ✗ PORT 取值非法：${JSON.stringify(rawPort)}\n` +
      `    需要 1–65535 之间的整数，例如  PORT=3000 npm run dev\n`
  )
  process.exit(1)
}

// 测试 / CI / 远程环境不需要弹浏览器，用 NO_OPEN=1 关掉。
const NO_OPEN = process.env.NO_OPEN === '1' || process.env.NO_OPEN === 'true'

const CYAN = '\x1b[36m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

const log = (msg) => console.log(`${CYAN}  ▸${RESET} ${msg}`)

console.log(`
${CYAN}  ╭──────────────────────────────────────────╮
  │   我的博客  ·  开发服务器                │
  ╰──────────────────────────────────────────╯${RESET}
`)

/* ---------------- 先检查依赖，再启动 ---------------- */

if (!existsSync(join(ROOT, 'node_modules'))) {
  console.log(`${YELLOW}  依赖尚未安装，正在执行 npm install...${RESET}\n`)
  const install = spawn('npm', ['install', '--no-fund', '--no-audit'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true
  })
  install.on('exit', (code) => {
    if (code !== 0) {
      console.error(`\n${RED}  ✗ 依赖安装失败，请手动执行 npm install 查看详情${RESET}\n`)
      process.exit(code || 1)
    }
    start()
  })
} else {
  start()
}

async function start() {
  /* -------- 1. 释放端口 -------- */
  const result = await freePort(PORT, { log })

  if (result.inUse && !result.freed) {
    // 端口腾不出来：明确告诉用户，不要静默换端口让人困惑
    console.log('')
    console.error(
      `${RED}  ✗ 端口 ${PORT} 仍被占用，无法启动。${RESET}\n` +
        `${DIM}    换个端口重试：  PORT=3000 npm run dev${RESET}\n` +
        `${DIM}    或先手动清理：  npm run free-port${RESET}\n`
    )
    process.exit(1)
  }

  /* -------- 2. 起 vite -------- */
  console.log('')
  const viteArgs = ['vite', '--port', String(PORT), '--strictPort', '--host', HOST]
  if (!NO_OPEN) viteArgs.push('--open')

  const vite = spawn('npx', viteArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true
  })

  vite.on('error', (err) => {
    console.error(`\n${RED}  ✗ 启动失败: ${err.message}${RESET}\n`)
    process.exit(1)
  })

  vite.on('exit', (code, signal) => {
    // 正常停止：退出码 0，或被信号终止。
    // Ctrl+C 会让 vite 以 130(SIGINT)/143(SIGTERM) 退出，
    // 这是用户主动停止，不是错误——不能报成红的吓人。
    const normal =
      code === 0 ||
      code == null ||
      signal != null ||
      code === 130 || // 128 + SIGINT
      code === 143 || // 128 + SIGTERM
      code === 137    // 128 + SIGKILL

    if (normal) {
      console.log(`\n${DIM}  服务已停止${RESET}\n`)
    } else {
      // 非零退出码有两种成因，别一律说成"异常"吓人：
      //   a) 终端被关闭 / 进程被外部结束（很常见，vite 来不及自己收尾）
      //   b) vite 自身报错（端口被抢、配置写错等）
      // 这里无法区分，所以给出中性描述 + 排错方向。
      console.error(
        `\n${YELLOW}  ▸ vite 退出（code ${code}）${RESET}\n` +
          `${DIM}    如果你没有主动停止，通常是终端被关闭或进程被外部结束${RESET}\n` +
          `${DIM}    若是启动就失败，请往上翻看 vite 的报错；换端口：PORT=3000 npm run dev${RESET}\n`
      )
    }

    // 退出前把端口上残留的进程树收干净。
    // vite 是通过 cmd.exe 起的，只 kill 直接子进程会留下孙子进程继续占着端口，
    // 那正是「下次启动静默换端口 / 打不开」的成因。
    void cleanupPort().finally(() => process.exit(normal ? 0 : (code ?? 1)))
  })

  /* -------- 3. 退出时清理，避免留下孤儿 -------- */

  let cleaningUp = false
  async function cleanupPort() {
    if (cleaningUp) return
    cleaningUp = true
    const pid = findPidOnPort(PORT)
    if (pid != null) killPid(pid, { tree: true })
  }

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      // 先让 vite 优雅退出，它自己退出后会触发上面的 exit 处理器做清理
      try { vite.kill(sig) } catch { /* ignore */ }
      // 兜底：若 vite 没在预期时间内退出，直接按树清理
      setTimeout(() => {
        void cleanupPort().finally(() => process.exit(0))
      }, 2500).unref()
    })
  }
}

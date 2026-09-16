/** 主题截图：分别抓暗色/亮色的关键页面，用于视觉核对 */
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = process.argv[3] || 'screenshots-theme'
const shotDir = join(process.cwd(), OUT)
mkdirSync(shotDir, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const dir = mkdtempSync(join(tmpdir(), 'shot-'))

const chrome = spawn(
  'C:\\Users\\Bill\\.agent-browser\\browsers\\chrome-153.0.8010.36\\chrome.exe',
  ['--headless=new', '--remote-debugging-port=9336', `--user-data-dir=${dir}`,
   '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'],
  { stdio: 'ignore' }
)

let t = null
for (let i = 0; i < 40; i++) {
  try {
    const l = await (await fetch('http://127.0.0.1:9336/json/list')).json()
    t = l.find((x) => x.type === 'page')
    if (t) break
  } catch { /* wait */ }
  await sleep(250)
}

const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))

let id = 0
const p = new Map()
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && p.has(m.id)) { p.get(m.id)(m); p.delete(m.id) }
})
const send = (method, params = {}) =>
  new Promise((r) => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

await send('Page.enable')
await send('Runtime.enable')

/* 桌面 + 窄屏两种视窗 */
const viewports = [
  ['desktop', 1440, 1000, 2, false],
  ['mobile', 390, 844, 2, true]
]

const pages = [
  ['home', '/'],
  ['post', '/posts/vue-markdown-blog'],
  ['tags', '/tags'],
  ['categories', '/categories'],
  ['archive', '/archive'],
  ['about', '/about'],
  ['404', '/no-such-page']
]

/** 用 localStorage 决定主题，再整页刷新让内联脚本先生效 */
async function setTheme(theme) {
  await send('Runtime.evaluate', {
    expression: `localStorage.setItem('blog-theme', ${JSON.stringify(theme)})`
  })
}

for (const theme of ['dark', 'light']) {
  await send('Page.navigate', { url: `${BASE}/` })
  await sleep(1200)
  await setTheme(theme)

  for (const [vp, w, h, dpr, mobile] of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: dpr, mobile
    })
    for (const [name, path] of pages) {
      // 窄屏只抓关键页，省时间
      if (vp === 'mobile' && !['home', 'post', 'about'].includes(name)) continue
      await send('Page.navigate', { url: `${BASE}${path}` })
      await sleep(1800)
      const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
      if (r.result?.data) {
        const file = `${theme}-${vp}-${name}.png`
        writeFileSync(join(shotDir, file), Buffer.from(r.result.data, 'base64'))
        console.log(`  ✓ ${file}`)
      } else {
        console.log(`  ✗ ${theme}-${vp}-${name} 失败`)
      }
    }
  }
}

chrome.kill()
await sleep(300)
try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
console.log(`\n截图目录: ${shotDir}`)
process.exit(0)

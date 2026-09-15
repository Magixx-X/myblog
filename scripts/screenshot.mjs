/** 截图工具：抓取指定页面用于人工核对视觉效果 */
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = process.argv[3] || 'screenshots'
const shotDir = join(process.cwd(), OUT)
mkdirSync(shotDir, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const dir = mkdtempSync(join(tmpdir(), 'shot-'))

const chrome = spawn(
  'C:\\Users\\Bill\\.agent-browser\\browsers\\chrome-153.0.8010.36\\chrome.exe',
  ['--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${dir}`,
   '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'],
  { stdio: 'ignore' }
)

let t = null
for (let i = 0; i < 40; i++) {
  try {
    const l = await (await fetch('http://127.0.0.1:9335/json/list')).json()
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
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440, height: 1000, deviceScaleFactor: 2, mobile: false
})

const pages = [
  ['01-home', '/'],
  ['02-post', '/posts/vue-markdown-blog'],
  ['03-tags', '/tags'],
  ['04-categories', '/categories'],
  ['05-archive', '/archive'],
  ['06-about', '/about'],
  ['07-404', '/no-such-page']
]

for (const [name, path] of pages) {
  await send('Page.navigate', { url: `${BASE}${path}` })
  await sleep(2200)
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  if (r.result?.data) {
    writeFileSync(join(shotDir, `${name}.png`), Buffer.from(r.result.data, 'base64'))
    console.log(`  ✓ ${name}.png  ${path}`)
  } else {
    console.log(`  ✗ ${name} 失败`)
  }
}

chrome.kill()
await sleep(300)
try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
console.log(`\n截图目录: ${shotDir}`)
process.exit(0)

/**
 * 交互状态核对：把搜索面板、移动端菜单、亮色主题下的关键组件抓成图。
 * 这些状态依赖运行时交互，静态截图脚本抓不到。
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = process.argv[3] || 'screenshots-states'
const shotDir = join(process.cwd(), OUT)
mkdirSync(shotDir, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const dir = mkdtempSync(join(tmpdir(), 'shot-'))

const chrome = spawn(
  'C:\\Users\\Bill\\.agent-browser\\browsers\\chrome-153.0.8010.36\\chrome.exe',
  ['--headless=new', '--remote-debugging-port=9337', `--user-data-dir=${dir}`,
   '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'],
  { stdio: 'ignore' }
)

let t = null
for (let i = 0; i < 40; i++) {
  try {
    const l = await (await fetch('http://127.0.0.1:9337/json/list')).json()
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

const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', {
    expression: `(() => { ${expression} })()`,
    returnByValue: true,
    awaitPromise: true
  })
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.text)
  return r.result?.result?.value
}

const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' })
  if (r.result?.data) {
    writeFileSync(join(shotDir, `${name}.png`), Buffer.from(r.result.data, 'base64'))
    console.log(`  ✓ ${name}.png`)
  } else {
    console.log(`  ✗ ${name} 失败`)
  }
}

const setViewport = (w, h, mobile = false) =>
  send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile })

await send('Page.enable')
await send('Runtime.enable')

/* ---- 1. 亮色主题下的搜索面板 ---- */
await setViewport(1440, 900)
await send('Page.navigate', { url: `${BASE}/` })
await sleep(1400)
await evaluate(`localStorage.setItem('blog-theme', 'light'); return true`)
await send('Page.navigate', { url: `${BASE}/` })
await sleep(1600)
await evaluate(`
  const btn = document.querySelector('.actions .icon-btn')
  btn.click()
  return true
`)
await sleep(700)
await evaluate(`
  const input = document.querySelector('.search-box input')
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, 'Vite')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  return true
`)
await sleep(400)
await shot('light-search-panel')

/* ---- 2. 暗色主题下的搜索面板 ---- */
await evaluate(`localStorage.setItem('blog-theme', 'dark'); return true`)
await send('Page.navigate', { url: `${BASE}/` })
await sleep(1600)
await evaluate(`
  document.querySelector('.actions .icon-btn').click()
  return true
`)
await sleep(700)
await shot('dark-search-panel')

/* ---- 3. 移动端菜单展开 ---- */
await setViewport(390, 844, true)
await send('Page.navigate', { url: `${BASE}/` })
await sleep(1500)
await evaluate(`
  const burger = document.querySelector('.burger')
  if (burger) burger.click()
  return true
`)
await sleep(700)
await shot('dark-mobile-menu')

/* ---- 4. 亮色主题下的移动端首页 ---- */
await evaluate(`localStorage.setItem('blog-theme', 'light'); return true`)
await send('Page.navigate', { url: `${BASE}/` })
await sleep(1600)
await shot('light-mobile-home')

/* ---- 5. 搜索结果态（亮色桌面） ---- */
await setViewport(1440, 900)
await send('Page.navigate', { url: `${BASE}/?q=Vite` })
await sleep(1600)
await shot('light-search-results')

chrome.kill()
await sleep(300)
try { rmSync(dir, { recursive: true, force: true }) } catch { /* ignore */ }
console.log(`\n截图目录: ${shotDir}`)
process.exit(0)

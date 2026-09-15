/**
 * 验证 GitHub Pages 深链兜底是否生效。
 *
 * 背景：GitHub Pages 是纯静态托管，没有服务端路由。直接访问 /posts/xxx
 * 在服务器上并不存在该文件，GitHub 会返回自己的 404 页面
 * （"File not found ... does not contain the requested file"）。
 *
 * 本项目靠 vite.config.js 的 spaFallback404 插件在构建时产出 404.html：
 * 它把目标路径存进 sessionStorage 再跳回站点根目录，应用启动后由
 * src/router/index.js 还原路径。
 *
 * 本脚本起一个**模仿 GitHub Pages 行为的静态服务器**（文件不存在时返回
 * 404.html 且状态码为 404，不做 SPA 兜底），然后用真实浏览器访问深链，
 * 断言路径被正确还原、页面正常渲染。
 *
 * 用法（需先以对应 base 构建）：
 *   VITE_BASE=/myblog/ npx vite build
 *   node scripts/test-404-fallback.mjs /myblog/
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, extname, sep } from 'node:path'

const BASE = (process.argv[2] || '/myblog/').replace(/\/*$/, '/')
const DIST = resolve(process.cwd(), 'dist')
const SERVE_PORT = 4180
const CHROME = 'C:\\Users\\Bill\\.agent-browser\\browsers\\chrome-153.0.8010.36\\chrome.exe'
const CDP_PORT = 9335

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
}

/* ------------------------- 模拟 GitHub Pages 的静态服务 ------------------------- */

async function readMaybe(file) {
  try {
    const s = await stat(file)
    return s.isFile() ? await readFile(file) : null
  } catch {
    return null
  }
}

const server = createServer(async (req, res) => {
  let pathname
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  } catch {
    pathname = '/'
  }

  if (pathname.startsWith(BASE)) {
    const rel = pathname.slice(BASE.length)
    for (const candidate of rel === '' ? ['index.html'] : [rel, `${rel}/index.html`]) {
      const file = resolve(DIST, candidate)
      // 防目录穿越
      if (!file.startsWith(DIST + sep)) continue
      const body = await readMaybe(file)
      if (body) {
        res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
        res.end(body)
        return
      }
    }
  }

  // 关键：这里刻意「不做 SPA 兜底」，完全复刻 GitHub Pages 的行为
  const fallback = await readMaybe(join(DIST, '404.html'))
  res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
  res.end(fallback || 'not found')
})

/* ---------------------------------- CDP ---------------------------------- */

class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.pageErrors = []
    this.consoleErrors = []
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
        return
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails
        this.pageErrors.push(d.exception?.description || d.text)
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push(msg.params.args.map((a) => a.description || a.value).join(' '))
      }
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`CDP timeout: ${method}`))
        }
      }, 20000)
    })
  }

  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression: `(() => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true
    })
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
    }
    return r.result.value
  }

  async goto(url) {
    this.pageErrors = []
    this.consoleErrors = []
    await this.send('Page.navigate', { url })
    // 深链会经历「404.html → 根目录 → 还原路径」两次跳转，多等一会
    await sleep(2200)
  }
}

/* --------------------------------- 开始 -------------------------------- */

const results = []
const check = (name, pass, detail = '') => {
  results.push({ name, pass })
  console.log(`${pass ? '  ✓' : '  ✗'} ${name}${detail ? `  ${detail}` : ''}`)
}

let exitCode = 0
let chrome
let cdp
let userDir

try {
  // 1) 产物里的 404.html 是否用对了 base
  console.log(`\n[1] 构建产物检查（base=${BASE}）`)
  const html404 = await readMaybe(join(DIST, '404.html'))
  check('dist/404.html 已生成', !!html404, html404 ? `${Buffer.byteLength(html404)} 字节` : '缺失')
  if (html404) {
    const text = html404.toString('utf8')
    check(
      '404.html 内嵌的 base 正确',
      text.includes(JSON.stringify(BASE)),
      `期望包含 ${JSON.stringify(BASE)}`
    )
    check(
      '404.html 会把目标路径存入 sessionStorage',
      text.includes('blog:spa-redirect'),
      ''
    )
  }
  const indexHtml = await readMaybe(join(DIST, 'index.html'))
  check(
    'index.html 资源路径带 base 前缀',
    !!indexHtml && indexHtml.toString('utf8').includes(`${BASE}assets/`),
    ''
  )

  // 2) 静态服务
  await new Promise((r) => server.listen(SERVE_PORT, '127.0.0.1', r))
  console.log(`\n[2] 启动模仿 GitHub Pages 的静态服务 :${SERVE_PORT}`)

  userDir = mkdtempSync(join(tmpdir(), 'blog-404-'))
  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${userDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-gpu',
      '--window-size=1440,900',
      'about:blank'
    ],
    { stdio: 'ignore' }
  )

  let target = null
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json()
      target = list.find((t) => t.type === 'page')
      if (target) break
    } catch {
      /* 还没起来 */
    }
    await sleep(250)
  }
  if (!target) throw new Error('Chrome DevTools 端口未就绪')

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((res2, rej) => {
    ws.addEventListener('open', res2)
    ws.addEventListener('error', () => rej(new Error('WebSocket 连接失败')))
  })
  cdp = new CDP(ws)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  // 3) 服务器对深链确实返回 404（确认测试环境模拟到位）
  console.log('\n[3] 确认服务器行为与 GitHub Pages 一致')
  const deep = `${BASE}posts/vue-markdown-blog`
  const raw = await fetch(`http://127.0.0.1:${SERVE_PORT}${deep}`, { redirect: 'manual' })
  check('深链在服务器侧是 404', raw.status === 404, `HTTP ${raw.status}`)
  const body = await raw.text()
  check('404 响应体就是我们的 404.html', body.includes('blog:spa-redirect'))

  // 4) 真实浏览器访问深链
  console.log('\n[4] 浏览器直接访问深链（含刷新场景）')
  await cdp.goto(`http://127.0.0.1:${SERVE_PORT}${deep}`)
  const after = await cdp.eval(`
    const main = document.querySelector('.app-main')
    return {
      path: location.pathname,
      search: location.search,
      h1: document.querySelector('.app-main h1')?.textContent.trim() || '',
      len: main ? main.innerText.trim().length : -1,
      pendingRedirect: sessionStorage.getItem('blog:spa-redirect')
    }
  `)
  check('地址栏还原为原始深链', after.path === deep, `实际 ${after.path}`)
  check('文章内容已渲染', after.len > 200 && after.h1.length > 0, `h1="${after.h1}"`)
  check('跳转标记已清理', after.pendingRedirect === null, `残留=${after.pendingRedirect}`)
  check('无 JS 错误', cdp.pageErrors.length === 0, cdp.pageErrors[0] || '')

  // 5) 带查询参数的深链
  const queryDeep = `${BASE}posts/vue-markdown-blog`
  await cdp.goto(`http://127.0.0.1:${SERVE_PORT}${BASE}?q=Vue`)
  const withQuery = await cdp.eval(`return { path: location.pathname, search: location.search }`)
  check('带查询参数访问正常', withQuery.path === BASE, `path=${withQuery.path}`)

  // 6) 渲染后再刷新一次（模拟用户按 F5）
  await cdp.goto(`http://127.0.0.1:${SERVE_PORT}${queryDeep}`)
  await cdp.send('Page.reload')
  await sleep(2200)
  const reloaded = await cdp.eval(`
    const main = document.querySelector('.app-main')
    return {
      path: location.pathname,
      len: main ? main.innerText.trim().length : -1,
      h1: document.querySelector('.app-main h1')?.textContent.trim() || ''
    }
  `)
  check('刷新深链后仍正常', reloaded.path === queryDeep && reloaded.len > 200, `path=${reloaded.path}`)
} catch (err) {
  console.error('\n脚本异常：', err.message)
  exitCode = 1
} finally {
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${'='.repeat(56)}\n通过 ${results.length - failed.length}/${results.length}`)
  if (failed.length) {
    failed.forEach((f) => console.log(`  ✗ ${f.name}`))
    exitCode = 1
  } else if (results.length) {
    console.log('全部通过 ✓')
  }

  try {
    cdp?.ws.close()
  } catch {
    /* ignore */
  }
  chrome?.kill()
  server.close()
  await sleep(300)
  if (userDir) {
    try {
      rmSync(userDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
  process.exit(exitCode)
}

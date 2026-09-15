/**
 * 站点冒烟测试：用 CDP 直接驱动 Chrome，逐页检查渲染结果。
 *
 * 为什么不用 agent-browser CLI：它每次调用都是独立进程/session，
 * 打开页面后下一条命令已切回 about:blank，无法跨命令断言页面状态。
 * 这里一次性在同一个 CDP 连接里跑完全部断言。
 *
 * 用法：node scripts/smoke-test.mjs [baseUrl]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.argv[2] || 'http://localhost:5173'
const CHROME = 'C:\\Users\\Bill\\.agent-browser\\browsers\\chrome-153.0.8010.36\\chrome.exe'
const PORT = 9333

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------------------------------- CDP ---------------------------------- */

class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.consoleErrors = []
    this.consoleWarns = []
    this.pageErrors = []
    /** 全程累积的告警，不随导航重置（用于最后统一断言） */
    this.allWarns = []

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result)
        return
      }
      // 收集页面异常
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails
        this.pageErrors.push(d.exception?.description || d.text)
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.description || a.value).join(' ')
        if (msg.params.type === 'error') this.consoleErrors.push(text)
        // Vue 的组件用法告警全部走 console.warn，必须收集：
        // 「多根组件放进 Transition」这类问题不报错，但会让页面整片空白
        if (msg.params.type === 'warning') {
          this.consoleWarns.push(text)
          this.allWarns.push(text)
        }
      }
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
        this.pageErrors.push(msg.params.entry.text)
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

  /** 在页面里求值，返回 JSON 化的结果 */
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression: `(() => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true
    })
    if (r.exceptionDetails) {
      throw new Error(
        r.exceptionDetails.exception?.description || r.exceptionDetails.text
      )
    }
    return r.result.value
  }

  async goto(url) {
    this.consoleErrors = []
    this.consoleWarns = []
    this.pageErrors = []
    await this.send('Page.navigate', { url })
    // 等 load + 一点渲染时间
    await sleep(1400)
  }
}

/* --------------------------------- 启动 ---------------------------------- */

const userDir = mkdtempSync(join(tmpdir(), 'blog-smoke-'))
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
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

let cdp
let exitCode = 0

try {
  // 等 DevTools 端口就绪
  let target = null
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await res.json()
      target = list.find((t) => t.type === 'page')
      if (target) break
    } catch {
      /* 还没起来 */
    }
    await sleep(250)
  }
  if (!target) throw new Error('Chrome DevTools 端口未就绪')

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve)
    ws.addEventListener('error', () => reject(new Error('WebSocket 连接失败')))
  })

  cdp = new CDP(ws)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')

  /* -------------------------------- 断言 -------------------------------- */

  const results = []
  const check = (name, pass, detail = '') => {
    results.push({ name, pass, detail })
    console.log(`${pass ? '  ✓' : '  ✗'} ${name}${detail ? `  ${detail}` : ''}`)
  }

  /**
   * 把页面里取到的 href 解析成绝对地址。
   * 注意：部署到 GitHub Pages 时 base 是 /<repo>/，页面里的 href 会带这个前缀
   * （/myblog/posts/xxx），所以不能直接和 BASE 做字符串拼接，必须走 URL 解析。
   */
  const abs = (href) => new URL(href, `${BASE.replace(/\/$/, '')}/`).href

  // ---------- 1. 首页 ----------
  console.log('\n[1] 首页 — 文章列表')
  await cdp.goto(`${BASE}/`)

  const home = await cdp.eval(`
    return {
      title: document.title,
      cards: document.querySelectorAll('.pcard').length,
      headings: [...document.querySelectorAll('.pcard h2, .pcard h3')].map(h => h.textContent.trim()),
      hasDraft: document.body.innerText.includes('未完成的文章'),
      tagPills: document.querySelectorAll('.tag-pill').length
    }
  `)
  check('页面标题正确', home.title.includes('我的博客'), `title="${home.title}"`)
  check('文章卡片已渲染', home.cards === 6, `找到 ${home.cards} 张卡片（期望 6）`)
  check('草稿被过滤', !home.hasDraft)
  check('卡片含文章标题', home.headings.length > 0, `首条="${home.headings[0] || ''}"`)
  check('首页无 JS 错误', cdp.pageErrors.length === 0, cdp.pageErrors[0] || '')

  // 置顶优先 + 日期倒序
  const order = await cdp.eval(`
    const dates = [...document.querySelectorAll('.pcard')].map(c => {
      const t = c.querySelector('time')?.getAttribute('datetime') || c.innerText.match(/\\d{4}-\\d{2}-\\d{2}/)?.[0] || ''
      return t
    })
    return dates
  `)
  const sorted = [...order].filter(Boolean).sort().reverse()
  check(
    '日期倒序排列',
    JSON.stringify(order.filter(Boolean)) === JSON.stringify(sorted),
    `首篇=${order[0]} 末篇=${order[order.length - 1]}`
  )

  // ---------- 2. 文章详情 ----------
  console.log('\n[2] 文章详情 — Markdown 渲染')
  const slug = await cdp.eval(`
    const a = document.querySelector('.pcard a[href*="/posts/"]')
    return a ? a.getAttribute('href') : null
  `)
  if (!slug) throw new Error('找不到文章链接')

  await cdp.goto(abs(slug))
  const detail = await cdp.eval(`
    return {
      h1: document.querySelector('article h1, .post h1, h1')?.textContent.trim() || '',
      codeBlocks: document.querySelectorAll('pre code, pre').length,
      highlighted: document.querySelectorAll('pre .hljs-keyword, pre .hljs-string, pre [class^="hljs-"]').length,
      tables: document.querySelectorAll('article table, .markdown table').length,
      blockquotes: document.querySelectorAll('article blockquote, .markdown blockquote').length,
      lists: document.querySelectorAll('article ul li, article ol li').length,
      h2anchors: document.querySelectorAll('h2[id], h3[id]').length,
      toc: document.querySelectorAll('a[href^="#"]').length,
      paras: document.querySelectorAll('article p, .markdown p').length,
      updated: document.querySelectorAll('time').length
    }
  `)
  check('文章标题渲染', detail.h1.length > 0, `h1="${detail.h1}"`)
  check('Markdown 段落渲染', detail.paras > 3, `${detail.paras} 个段落`)
  check('代码块渲染', detail.codeBlocks > 0, `${detail.codeBlocks} 个代码块`)
  check('代码高亮生效', detail.highlighted > 0, `${detail.highlighted} 个高亮 token`)
  check('表格渲染', detail.tables > 0, `${detail.tables} 个表格`)
  check('引用块渲染', detail.blockquotes > 0, `${detail.blockquotes} 个引用`)
  check('列表渲染', detail.lists > 0, `${detail.lists} 个列表项`)
  check('标题锚点生成', detail.h2anchors > 0, `${detail.h2anchors} 个锚点`)
  check('详情页无 JS 错误', cdp.pageErrors.length === 0, cdp.pageErrors[0] || '')

  // 上下篇导航（href 可能带 base 前缀，所以不能锚定行首）
  const nav = await cdp.eval(`
    const links = [...document.querySelectorAll('a')].map(a => a.getAttribute('href') || '')
    return { prevNext: links.filter(h => /\\/posts\\//.test(h)).length }
  `)
  check('相邻文章导航存在', nav.prevNext > 0, `${nav.prevNext} 个文章链接`)

  // ---------- 3. 标签页 ----------
  console.log('\n[3] 标签页')
  await cdp.goto(`${BASE}/tags`)
  const tags = await cdp.eval(`
    return {
      items: document.querySelectorAll('a[href*="/tags/"]').length,
      text: document.body.innerText.slice(0, 200)
    }
  `)
  check('标签列表渲染', tags.items > 0, `${tags.items} 个标签链接`)
  check('标签页无 JS 错误', cdp.pageErrors.length === 0, cdp.pageErrors[0] || '')

  // 单个标签详情
  const tagHref = await cdp.eval(`
    const a = document.querySelector('a[href*="/tags/"]')
    return a ? a.getAttribute('href') : null
  `)
  if (tagHref) {
    console.log('\n[4] 标签详情')
    await cdp.goto(abs(tagHref))
    const tagDetail = await cdp.eval(`
      return {
        cards: document.querySelectorAll('.pcard').length,
        h1: document.querySelector('h1')?.textContent.trim() || '',
        text: document.body.innerText.slice(0, 120)
      }
    `)
    check('标签筛选出文章', tagDetail.cards > 0, `${tagDetail.cards} 篇（${tagHref}）`)
    check('标签页无 JS 错误', cdp.pageErrors.length === 0, cdp.pageErrors[0] || '')
  }

  // ---------- 5. 分类页 ----------
  console.log('\n[5] 分类页')
  await cdp.goto(`${BASE}/categories`)
  const cats = await cdp.eval(`
    return {
      items: document.querySelectorAll('.cat').length,
      names: [...document.querySelectorAll('.cat-name')].map(n => n.textContent.trim()),
      posts: document.querySelectorAll('.cat-posts li').length,
      hasEmpty: !!document.querySelector('.empty')
    }
  `)
  check('分类列表渲染', cats.items > 0, `${cats.items} 个分类：${cats.names.join(' / ')}`)
  check('分类下文章已列出', cats.posts > 0, `${cats.posts} 条`)
  check('分类页非空状态', !cats.hasEmpty)
  check('分类页无 JS 错误', cdp.pageErrors.length === 0, cdp.pageErrors[0] || '')

  // ---------- 6. 归档页 ----------
  console.log('\n[6] 归档页')
  await cdp.goto(`${BASE}/archive`)
  const arch = await cdp.eval(`
    return {
      links: document.querySelectorAll('a[href*="/posts/"]').length,
      years: (document.body.innerText.match(/\\d{4}\\s*年/g) || []).length
    }
  `)
  check('归档列出全部文章', arch.links >= 6, `${arch.links} 条`)
  check('归档页无 JS 错误', cdp.pageErrors.length === 0, cdp.pageErrors[0] || '')

  // ---------- 7. 关于页 ----------
  console.log('\n[7] 关于页')
  await cdp.goto(`${BASE}/about`)
  const about = await cdp.eval(`
    return { len: document.body.innerText.length, h1: document.querySelector('h1')?.textContent.trim() || '' }
  `)
  check('关于页有内容', about.len > 200, `${about.len} 字符`)
  check('关于页无 JS 错误', cdp.pageErrors.length === 0, cdp.pageErrors[0] || '')

  // ---------- 8. 搜索 ----------
  console.log('\n[8] 首页搜索')
  await cdp.goto(`${BASE}/`)
  const search = await cdp.eval(`
    const form = document.querySelector('.searchbar form')
    const input = form?.querySelector('input')
    if (!form || !input) return { found: false }

    const total = document.querySelectorAll('.pcard').length

    // 触发 Vue 的 v-model：必须用原生 setter + input 事件
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(input, 'Vue')
    input.dispatchEvent(new Event('input', { bubbles: true }))

    // 搜索是「提交式」的：直接 submit 表单，等价于点「搜索」按钮
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          found: true,
          total,
          keyword: input.value,
          url: location.search,
          cards: document.querySelectorAll('.pcard').length,
          resultBar: document.querySelector('.result-bar')?.innerText.trim() || '',
          hasEmpty: !!document.querySelector('.empty')
        })
      }, 800)
    })
  `)
  check('搜索框存在', search.found)
  if (search.found) {
    check('搜索写入 URL 查询参数', /q=/.test(search.url), `url="${search.url}"`)
    check(
      '搜索过滤生效',
      search.cards > 0 && search.cards < search.total,
      `"${search.keyword}" → ${search.cards} 篇（原 ${search.total} 篇）`
    )
    check('搜索结果显示计数', /找到/.test(search.resultBar), search.resultBar.replace(/\n/g, ' '))
    check('搜索结果无 JS 错误', cdp.pageErrors.length === 0, cdp.pageErrors[0] || '')
  }

  // 无结果的关键词应落到空状态
  await cdp.goto(`${BASE}/?q=zzzzz-nonexistent-keyword`)
  const noHit = await cdp.eval(`
    return {
      cards: document.querySelectorAll('.pcard').length,
      hasEmpty: !!document.querySelector('.empty')
    }
  `)
  check('无结果时展示空状态', noHit.hasEmpty && noHit.cards === 0, `${noHit.cards} 篇`)

  // ---------- 9. 404 ----------
  console.log('\n[9] 404 兜底')
  await cdp.goto(`${BASE}/this-page-does-not-exist`)
  const nf = await cdp.eval(`
    return { text: document.body.innerText.slice(0, 200) }
  `)
  check('未知路由有兜底页', /404|未找到|不存在/.test(nf.text), nf.text.replace(/\n/g, ' ').slice(0, 60))

  /* ---------- 10. 客户端路由跳转（回归测试） ----------
   * 上面 [1]~[9] 全部是 Page.navigate 整页加载，完全绕过了 vue-router
   * 的客户端导航与 <Transition> 动画。历史事故：PostView.vue 曾是多根组件
   * （.progress + .container），放进 <Transition mode="out-in"> 后 leave
   * 永不结束 → 从文章页返回任何页面，主内容区整片空白。整页刷新又正常，
   * 所以冒烟全绿却漏掉了它。这一段专门补上真实点击的动线。
   */
  console.log('\n[10] 客户端路由跳转（真实点击，非整页加载）')

  const probe = `
    const main = document.querySelector('.app-main')
    return {
      path: location.pathname + location.search,
      len: main ? main.innerText.trim().length : -1,
      children: main ? main.children.length : -1,
      cards: document.querySelectorAll('.pcard').length
    }
  `

  const enterPost = async () => {
    await cdp.goto(`${BASE}/`)
    await cdp.eval(`document.querySelector('.pcard a[href*="/posts/"]').click(); return true`)
    await sleep(950)
    return cdp.eval(probe)
  }

  const clickNav = async (label) => {
    const found = await cdp.eval(`
      const a = [...document.querySelectorAll('.nav-link')].find(x => x.textContent.trim() === ${JSON.stringify(label)})
      if (!a) return false
      a.click()
      return true
    `)
    await sleep(950)
    return found ? cdp.eval(probe) : null
  }

  const entered = await enterPost()
  check('点击进入文章页', entered.len > 200, `path=${entered.path} 正文 ${entered.len} 字符`)

  for (const label of ['首页', '标签', '分类', '归档', '关于']) {
    const enteredPost = await enterPost()
    if (enteredPost.len < 100) {
      check(`文章页 → ${label}`, false, '前置步骤失败：文章页本身没渲染出来')
      continue
    }
    const r = await clickNav(label)
    check(
      `文章页 → ${label}`,
      !!r && r.len > 150 && r.children > 0,
      r ? `path=${r.path} 正文 ${r.len} 字符 / main 子节点 ${r.children}` : '找不到导航项'
    )
  }

  // 浏览器后退键同样走客户端导航
  await enterPost()
  await cdp.eval(`history.back(); return true`)
  await sleep(950)
  const viaBack = await cdp.eval(probe)
  check(
    '浏览器后退回到首页',
    viaBack.len > 150 && viaBack.cards > 0,
    `path=${viaBack.path} 正文 ${viaBack.len} 字符 / ${viaBack.cards} 张卡片`
  )

  // 视图组件必须单根，否则 <Transition mode="out-in"> 会卡死（本次事故的成因）
  const rootWarns = cdp.allWarns.filter((w) => /non-element root node/.test(w))
  check(
    '无「多根组件放进 Transition」告警',
    rootWarns.length === 0,
    rootWarns.length ? rootWarns[0].split('\n')[0].slice(0, 80) : ''
  )

  /* ------------------------------- 汇总 -------------------------------- */

  const failed = results.filter((r) => !r.pass)
  console.log(
    `\n${'='.repeat(56)}\n通过 ${results.length - failed.length}/${results.length}`
  )
  if (failed.length) {
    console.log('失败项：')
    failed.forEach((f) => console.log(`  ✗ ${f.name} ${f.detail}`))
    exitCode = 1
  } else {
    console.log('全部通过 ✓')
  }
} catch (err) {
  console.error('\n冒烟测试异常：', err.message)
  exitCode = 1
} finally {
  try {
    cdp?.ws.close()
  } catch {
    /* ignore */
  }
  chrome.kill()
  await sleep(400)
  try {
    rmSync(userDir, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
  process.exit(exitCode)
}

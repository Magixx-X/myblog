import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import { splitFrontMatter } from './frontmatter.js'

/* ------------------------------------------------------------------ *
 * highlight.js —— 只注册用得到的语言
 * 全量引入约 1MB，按需注册后降到 100KB 以内。
 * 需要新语言时在下面的数组里加一行 import 即可。
 * ------------------------------------------------------------------ */
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import nginx from 'highlight.js/lib/languages/nginx'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

const LANGS = {
  bash, sh: bash, shell: bash,
  css, scss,
  diff,
  go, golang: go,
  java,
  javascript, js: javascript,
  json,
  markdown, md: markdown,
  nginx,
  python, py: python,
  rust,
  sql,
  typescript, ts: typescript,
  xml, html: xml,
  yaml, yml: yaml
}

for (const [name, lang] of Object.entries(LANGS)) {
  hljs.registerLanguage(name, lang)
}

/* ------------------------------------------------------------------ *
 * Markdown 渲染器
 * ------------------------------------------------------------------ */

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        const { value } = hljs.highlight(str, { language: lang, ignoreIllegals: true })
        return `<pre class="hljs"><code class="language-${lang}">${value}</code></pre>`
      } catch (_) {
        /* 落到下面的兜底 */
      }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

// 给 h2 / h3 加 id，供文章目录锚点跳转
md.use(anchor, {
  level: [2, 3],
  slugify: (s) =>
    encodeURIComponent(
      String(s).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')
    )
})

/* ------------------------------------------------------------------ *
 * 工具函数
 * ------------------------------------------------------------------ */

/** 从 Markdown 正文中剥掉代码块/语法符号，得到纯文本，用于摘要与阅读时长 */
function toPlainText(mdText) {
  return mdText
    .replace(/```[\s\S]*?```/g, ' ')       // 代码块
    .replace(/`[^`]*`/g, ' ')              // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 -> 保留文字
    .replace(/^#{1,6}\s+/gm, '')           // 标题标记
    .replace(/^\s*>\s?/gm, '')             // 引用
    .replace(/[*_~]{1,3}/g, '')            // 强调
    .replace(/^\s*[-*+]\s+/gm, '')         // 无序列表
    .replace(/^\s*\d+\.\s+/gm, '')         // 有序列表
    .replace(/^\s*\|.*\|\s*$/gm, ' ')      // 表格
    .replace(/<[^>]+>/g, ' ')              // 内联 HTML
    .replace(/\s+/g, ' ')
    .trim()
}

/** 中英混排的粗略字数统计 + 阅读时长（按 300 字/分钟） */
function readingStats(plain) {
  const cjk = (plain.match(/[\u4e00-\u9fa5]/g) || []).length
  const words = (plain.replace(/[\u4e00-\u9fa5]/g, ' ').match(/\b[\w'-]+\b/g) || []).length
  const chars = plain.replace(/\s/g, '').length
  const minutes = Math.max(1, Math.round(cjk / 300 + words / 200))
  return { chars, words: cjk + words, minutes }
}

/** 生成 URL 友好的 slug，中文标题兜底为拼音无关的稳定 key */
function makeSlug(raw) {
  const s = String(raw).trim().toLowerCase()
  const ascii = s.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return ascii || `post-${hashString(String(raw))}`
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

/**
 * 归一化日期。
 *
 * 注意：YAML 里未加引号的 `date: 2026-09-12` 如果交给 Date 解析会带上时区，
 * 直接 String() 会得到 "Sat Sep 12 2026 08:00:00 GMT+0800"，字典序排序会错乱。
 * 所以这里一律产出 `YYYY-MM-DD` 字符串，排序和展示都基于它。
 *
 * 时区陷阱：YAML 的 `2026-09-12` 被按 UTC 解析，在东八区取本地日期仍是 12 号；
 * 但为了彻底避免跨时区漂移，优先从原始字符串里直接提取日期。
 */
function normalizeDate(raw) {
  const pad = (n) => String(n).padStart(2, '0')

  // 已经是 Date 对象（外部传入 Date 时）
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    // 用 UTC 取值：YAML 的裸日期按 UTC 解析，用本地取值会跨时区偏移一天
    return `${raw.getUTCFullYear()}-${pad(raw.getUTCMonth() + 1)}-${pad(raw.getUTCDate())}`
  }

  const s = String(raw ?? '').trim()
  if (!s) {
    const now = new Date()
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  }

  // 直接匹配 YYYY-MM-DD 前缀，避开时区转换
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`

  // 兜底：交给 Date 解析
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) {
    const now = new Date()
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  }
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** 把 `YYYY-MM-DD` 渲染成人话 */
function formatDateText(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  return `${m[1]} 年 ${m[2]} 月 ${m[3]} 日`
}

/* ------------------------------------------------------------------ *
 * 文章装载：Vite 在构建期把 content/ 下所有 .md 内联进来
 * ------------------------------------------------------------------ */

const rawFiles = import.meta.glob('../../content/posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
})

/** 从文件路径推倒目录名，作为「分类」兜底 */
function categoryFromPath(path) {
  const m = path.match(/content\/posts\/(.+)\/[^/]+\.md$/)
  return m ? m[1] : '未分类'
}

function parsePost(path, raw) {
  const { data: fm, content: body } = splitFrontMatter(raw)
  if (fm.draft === true) return null

  const title = fm.title || '无标题'
  const slug = fm.slug ? makeSlug(fm.slug) : makeSlug(path.match(/([^/]+)\.md$/)[1])
  const date = normalizeDate(fm.date)
  const plain = toPlainText(body)
  const stats = readingStats(plain)

  const summary =
    fm.summary || fm.description || plain.slice(0, 120) + (plain.length > 120 ? '…' : '')

  return {
    slug,
    path,
    title,
    date,
    dateText: formatDateText(date),
    tags: Array.isArray(fm.tags) ? fm.tags : fm.tags ? [fm.tags] : [],
    category: fm.category || categoryFromPath(path),
    summary,
    cover: fm.cover || '',
    author: fm.author || '',
    pinned: fm.pinned === true,
    minutes: stats.minutes,
    chars: stats.chars,
    plain,
    // 渲染结果缓存，避免列表页重复渲染
    _html: null
  }
}

/** 全部文章，按日期倒序（置顶优先） */
export const posts = Object.entries(rawFiles)
  .map(([path, raw]) => {
    try {
      return parsePost(path.replace(/\\/g, '/'), raw)
    } catch (err) {
      // 单篇文章的 front-matter 写错不应该拖垮整站构建，
      // 但要明确报出来，否则只表现为"文章凭空消失了"
      console.error(`[blog] 解析失败，已跳过: ${path}\n      ${err.message}`)
      return null
    }
  })
  .filter(Boolean)
  .sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.date.localeCompare(a.date)
  })

/**
 * 取原始 Markdown 文本。
 *
 * Windows 上 glob 的 key 可能是反斜杠，直接查表会拿到 undefined
 * 导致 matter(undefined) 抛错、详情页白屏。所以这里做一次规范化查表。
 */
function getRaw(path) {
  if (rawFiles[path] != null) return rawFiles[path]
  const alt = path.replace(/\//g, '\\')
  if (rawFiles[alt] != null) return rawFiles[alt]
  // 再兜一层：忽略分隔符差异做匹配
  const target = path.replace(/\\/g, '/')
  const hit = Object.keys(rawFiles).find((k) => k.replace(/\\/g, '/') === target)
  return hit != null ? rawFiles[hit] : null
}

/** 把某篇文章的正文渲染成 HTML（惰性渲染 + 缓存，列表页不会触发） */
export function renderPost(post) {
  if (post._html) return post._html

  const raw = getRaw(post.path)
  if (raw == null) {
    console.error(`[blog] 找不到原文，无法渲染: ${post.path}`)
    post._html = '<p class="render-error">正文加载失败，请检查构建日志。</p>'
    return post._html
  }

  try {
    const { content } = splitFrontMatter(raw)
    post._html = md.render(content)
  } catch (err) {
    console.error(`[blog] 渲染失败: ${post.path}\n      ${err.message}`)
    post._html = '<p class="render-error">正文解析失败，请检查 front-matter 格式。</p>'
  }
  return post._html
}

export function getPostBySlug(slug) {
  return posts.find((p) => p.slug === slug) || null
}

/** 上一篇 / 下一篇（在按日期排序的时间线上） */
export function getNeighbors(slug) {
  const i = posts.findIndex((p) => p.slug === slug)
  if (i === -1) return { prev: null, next: null }
  return {
    prev: i > 0 ? posts[i - 1] : null,
    next: i < posts.length - 1 ? posts[i + 1] : null
  }
}

/** 相关文章：同分类或同标签重合度最高的若干篇 */
export function getRelated(slug, limit = 3) {
  const cur = getPostBySlug(slug)
  if (!cur) return []
  return posts
    .filter((p) => p.slug !== slug)
    .map((p) => {
      let score = 0
      if (p.category === cur.category) score += 2
      score += p.tags.filter((t) => cur.tags.includes(t)).length * 3
      return { post: p, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map((x) => x.post)
}

/* ------------------------------------------------------------------ *
 * 聚合：标签、分类、归档
 * ------------------------------------------------------------------ */

export const tagList = (() => {
  const map = new Map()
  for (const p of posts) {
    for (const t of p.tags) {
      if (!map.has(t)) map.set(t, [])
      map.get(t).push(p)
    }
  }
  return [...map.entries()]
    .map(([name, list]) => ({ name, count: list.length, posts: list }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
})()

export const categoryList = (() => {
  const map = new Map()
  for (const p of posts) {
    if (!map.has(p.category)) map.set(p.category, [])
    map.get(p.category).push(p)
  }
  return [...map.entries()]
    .map(([name, list]) => ({ name, count: list.length, posts: list }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
})()

export const archiveList = (() => {
  const map = new Map()
  for (const p of posts) {
    const year = p.date.slice(0, 4)
    if (!map.has(year)) map.set(year, [])
    map.get(year).push(p)
  }
  return [...map.entries()]
    .map(([year, list]) => ({ year, count: list.length, posts: list }))
    .sort((a, b) => b.year.localeCompare(a.year))
})()

export const siteStats = {
  total: posts.length,
  tags: tagList.length,
  categories: categoryList.length,
  chars: posts.reduce((s, p) => s + p.chars, 0)
}

/* ------------------------------------------------------------------ *
 * 搜索：标题 / 摘要 / 标签 / 正文 的加权匹配
 * ------------------------------------------------------------------ */

export function searchPosts(keyword, { limit = 50 } = {}) {
  const q = String(keyword || '').trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/).filter(Boolean)

  return posts
    .map((p) => {
      const title = p.title.toLowerCase()
      const summary = p.summary.toLowerCase()
      const tags = p.tags.join(' ').toLowerCase()
      const body = p.plain.toLowerCase()
      let score = 0
      for (const t of terms) {
        if (title.includes(t)) score += 10
        if (tags.includes(t)) score += 6
        if (summary.includes(t)) score += 4
        if (body.includes(t)) score += 1
      }
      return { post: p, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.localeCompare(a.post.date))
    .slice(0, limit)
    .map((x) => x.post)
}

/** 生成搜索命中片段的高亮 HTML（用于结果列表展示上下文） */
export function makeExcerpt(post, keyword, radius = 60) {
  const q = String(keyword || '').trim()
  if (!q) return post.summary
  const idx = post.plain.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return post.summary
  const start = Math.max(0, idx - radius)
  const end = Math.min(post.plain.length, idx + q.length + radius)
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const slice = post.plain.slice(start, end)
  const escaped = esc(slice)
  const highlighted = escaped.replace(
    new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
    (m) => `<mark>${m}</mark>`
  )
  return (start > 0 ? '…' : '') + highlighted + (end < post.plain.length ? '…' : '')
}

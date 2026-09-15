/**
 * 内容管线验证：草稿过滤 + 日期排序 + 标签/分类聚合。
 *
 * 直接复用站点的 front-matter 解析器（src/content/frontmatter.js），
 * 保证这里验证的就是浏览器里实际跑的那套逻辑，而不是另一份实现。
 */
import { readFileSync } from 'node:fs'
import { splitFrontMatter } from '../src/content/frontmatter.js'

/** 与 blog.js 的 normalizeDate 保持一致：一律产出 YYYY-MM-DD */
function normalizeDate(raw) {
  const pad = (n) => String(n).padStart(2, '0')
  const s = String(raw ?? '').trim()
  if (!s) return '0000-00-00'
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '0000-00-00'
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

// 用与 Vite 相同的规则发现文章
const { readdirSync, statSync } = await import('node:fs')
const { join } = await import('node:path')

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (name.endsWith('.md')) out.push(p.replace(/\\/g, '/'))
  }
  return out
}

const files = walk('content/posts')

const parsed = files.map((f) => {
  const { data, content } = splitFrontMatter(readFileSync(f, 'utf8'))
  return {
    file: f,
    title: data.title || '无标题',
    draft: data.draft === true,
    date: normalizeDate(data.date),
    tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
    cat: data.category || '未分类',
    pinned: data.pinned === true,
    bodyLen: content.length
  }
})

const drafts = parsed.filter((p) => p.draft)
const visible = parsed.filter((p) => !p.draft)

console.log('总文件数:', parsed.length)
console.log('过滤后可见:', visible.length)
console.log('被过滤的草稿:', drafts.map((p) => p.title).join(', ') || '(无)')
console.log('')

console.log('排序结果（置顶优先，再按日期倒序）:')
visible
  .sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return b.date.localeCompare(a.date)
  })
  .forEach((p, i) => {
    console.log('  ' + String(i + 1).padStart(2) + '. ' + p.date + '  [' + p.cat + ']  ' + p.title + (p.pinned ? '  ★置顶' : ''))
  })
console.log('')

// 聚合统计
const tagMap = new Map()
const catMap = new Map()
for (const p of visible) {
  for (const t of p.tags) tagMap.set(t, (tagMap.get(t) || 0) + 1)
  catMap.set(p.cat, (catMap.get(p.cat) || 0) + 1)
}
console.log('标签 (' + tagMap.size + '):')
;[...tagMap.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log('  ' + k + ' ×' + v))
console.log('')
console.log('分类 (' + catMap.size + '):')
;[...catMap.entries()].forEach(([k, v]) => console.log('  ' + k + ' ×' + v))

// ---------- 断言 ----------
const problems = []
if (visible.length === 0) problems.push('没有任何可见文章')
if (drafts.length !== 1) problems.push(`草稿过滤异常：命中 ${drafts.length} 篇（期望 1）`)
if (parsed.some((p) => !p.title || p.title === '无标题')) {
  problems.push('存在缺少 title 的文章')
}
if (parsed.some((p) => p.bodyLen === 0)) problems.push('存在正文为空的文章')
if (parsed.some((p) => p.date === '0000-00-00')) problems.push('存在无法解析的 date')

const order = visible.map((p) => p.date)
const expect = [...order].sort().reverse()
// 置顶项允许打破纯日期序
const nonPinned = visible.filter((p) => !p.pinned).map((p) => p.date)
if (JSON.stringify(nonPinned) !== JSON.stringify([...nonPinned].sort().reverse())) {
  problems.push('日期排序不正确')
}

console.log('')
if (problems.length) {
  console.log('✗ 发现问题：')
  problems.forEach((p) => console.log('  - ' + p))
  process.exit(1)
} else {
  console.log('✓ 内容管线检查通过')
}

#!/usr/bin/env node
/**
 * 新建文章脚手架
 *
 *   npm run new -- "文章标题" --cat 前端 --tags Vue,Vite
 *   npm run new -- "文章标题" -c 随笔 -t 写作
 *
 * 会在 content/posts/<分类>/ 下生成带 front-matter 的 .md 文件。
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const POSTS_DIR = join(ROOT, 'content', 'posts')

/* ---------- 解析参数 ---------- */
const argv = process.argv.slice(2)

function takeFlag(names) {
  for (const n of names) {
    const i = argv.indexOf(n)
    if (i !== -1 && argv[i + 1]) {
      const v = argv[i + 1]
      argv.splice(i, 2)
      return v
    }
  }
  return null
}

const category = takeFlag(['--cat', '-c']) || '随笔'
const tagsRaw = takeFlag(['--tags', '-t']) || ''
const title = argv.filter((a) => !a.startsWith('-')).join(' ').trim()

if (!title) {
  console.error('用法: npm run new -- "文章标题" [--cat 分类] [--tags 标签1,标签2]')
  console.error('示例: npm run new -- "我的第一篇博客" -c 随笔 -t 写作,思考')
  process.exit(1)
}

/* ---------- 生成 slug ---------- */
function makeSlug(t) {
  const ascii = t
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (ascii) return ascii
  // 纯中文标题：用日期 + 短哈希保证唯一
  let h = 0
  for (let i = 0; i < t.length; i++) {
    h = (h << 5) - h + t.charCodeAt(i)
    h |= 0
  }
  return `post-${Math.abs(h).toString(36)}`
}

/* ---------- 避免重名 ---------- */
function uniquePath(dir, base, ext = '.md') {
  let p = join(dir, base + ext)
  let n = 2
  while (existsSync(p)) {
    p = join(dir, `${base}-${n}${ext}`)
    n++
  }
  return p
}

const slug = makeSlug(title)
const targetDir = join(POSTS_DIR, category)
if (!existsSync(targetDir)) {
  mkdirSync(targetDir, { recursive: true })
  console.log(`✓ 已创建分类目录 content/posts/${category}/`)
}

const filePath = uniquePath(targetDir, slug)

/* ---------- 组装 front-matter ---------- */
const today = new Date()
const pad = (n) => String(n).padStart(2, '0')
const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

const tags = tagsRaw
  .split(/[,，]/)
  .map((s) => s.trim())
  .filter(Boolean)

const tagsLine = tags.length ? `[${tags.join(', ')}]` : '[]'

const content = `---
title: ${title}
date: ${dateStr}
category: ${category}
tags: ${tagsLine}
summary: ""
draft: true
---

## 小标题

正文从这里开始。

## 小结

`
writeFileSync(filePath, content, 'utf8')

/* ---------- 输出 ---------- */
const rel = filePath.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '')
console.log('')
console.log(`✓ 已创建 ${rel}`)
console.log('')
console.log('  下一步:')
console.log(`    1. 编辑刚创建的文件`)
console.log(`    2. npm run dev   预览效果`)
console.log(`    3. 写完后把 front-matter 里的 draft: true 改成 false`)
console.log(`    4. git add . && git commit -m "post: ${title}" && git push`)
console.log('')

/* ---------- 顺带列出已有分类，方便挑选 ---------- */
if (existsSync(POSTS_DIR)) {
  const cats = readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  if (cats.length) {
    console.log(`  现有分类: ${cats.join(' / ')}`)
    console.log('')
  }
}

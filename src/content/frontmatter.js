/**
 * 浏览器端的 front-matter 解析器。
 *
 * 为什么不用 gray-matter：
 * gray-matter 内部依赖 Node 的 `Buffer`（用于检测 BOM / 编码），
 * 而本站内容是构建期用 `?raw` 内联进 bundle、在浏览器里解析的。
 * 浏览器没有 `Buffer`，于是每个文件都抛 "Buffer is not defined" 被跳过，
 * 表现为「构建成功但一篇文章都没有」。
 *
 * 这里只实现博客 front-matter 实际用到的 YAML 子集：
 *   标量（字符串 / 数字 / 布尔 / null）
 *   ISO 日期       date: 2026-09-12
 *   行内数组       tags: [Vue, 前端]
 *   块状数组       tags:
 *                    - Vue
 *                    - 前端
 *   引号字符串     summary: "含 : 冒号的文本"
 *
 * 遇到复杂 YAML（嵌套对象、多行字符串）不做完整支持，
 * 而是把原始标量原样保留，避免因解析失败丢掉整篇文章。
 */

/** 去掉首尾成对的引号 */
function unquote(s) {
  const t = s.trim()
  if (t.length >= 2) {
    const first = t[0]
    const last = t[t.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return t.slice(1, -1).replace(first === '"' ? /\\"/g : /''/g, first)
    }
  }
  return t
}

/** 解析一个 YAML 标量 */
function parseScalar(raw) {
  const s = raw.trim()
  if (s === '') return ''
  if (/^(null|~)$/i.test(s)) return null
  if (/^(true|yes|on)$/i.test(s)) return true
  if (/^(false|no|off)$/i.test(s)) return false
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)

  // ISO 日期 —— 保持字符串，交给 normalizeDate 统一处理，避免时区漂移
  if (/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(s)) return unquote(s)

  return unquote(s)
}

/** 解析行内数组：`[a, b, c]` */
function parseInlineArray(inner) {
  const out = []
  let buf = ''
  let quote = null

  for (const ch of inner) {
    if (quote) {
      if (ch === quote) quote = null
      buf += ch
    } else if (ch === '"' || ch === "'") {
      quote = ch
      buf += ch
    } else if (ch === ',') {
      if (buf.trim()) out.push(parseScalar(buf))
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) out.push(parseScalar(buf))
  return out
}

/**
 * 拆出 front-matter 与正文。
 * 只认文件开头的 `---` 围栏；没有围栏时整篇都是正文。
 */
export function splitFrontMatter(raw) {
  const text = String(raw ?? '').replace(/^\uFEFF/, '')
  const m = text.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)
  if (!m) return { data: {}, content: text }
  return { data: parseYamlBlock(m[1]), content: text.slice(m[0].length) }
}

/** 解析 front-matter 主体（顶层键值对 + 块状数组） */
function parseYamlBlock(block) {
  const data = {}
  const lines = block.split(/\r?\n/)

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // 跳过空行与注释
    if (!line.trim() || /^\s*#/.test(line)) { i++; continue }

    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (!kv) { i++; continue } // 不认识的行直接忽略，不中断解析

    const key = kv[1]
    const rest = kv[2]

    // 行内数组
    if (/^\[.*\]$/.test(rest.trim())) {
      data[key] = parseInlineArray(rest.trim().slice(1, -1))
      i++
      continue
    }

    // 有值：标量
    if (rest.trim() !== '') {
      data[key] = parseScalar(rest)
      i++
      continue
    }

    // 无值：可能是块状数组，也可能是空值
    const items = []
    let j = i + 1
    while (j < lines.length) {
      const next = lines[j]
      if (!next.trim()) { j++; continue }
      const item = next.match(/^\s+-\s*(.*)$/)
      if (!item) break
      items.push(parseScalar(item[1]))
      j++
    }

    if (items.length) {
      data[key] = items
      i = j
    } else {
      data[key] = '' // 空值（如 `cover:`）
      i++
    }
  }

  return data
}

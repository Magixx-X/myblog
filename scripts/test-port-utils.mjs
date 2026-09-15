/**
 * 端口工具的单元测试。
 *
 * 重点覆盖两类很容易错的地方：
 *   1. 端口号必须精确匹配 —— 用 `:5173` 做子串匹配会误中 `:51737`，
 *      后果是杀掉用户的其它服务
 *   2. 连接探测要同时覆盖 IPv4 / IPv6 —— vite 默认可能只绑 `[::1]`
 *
 * 用法：node scripts/test-port-utils.mjs
 */
import {
  parseNetstatForPort,
  probePort,
  isPortInUse,
  findPidOnPort
} from './port-utils.mjs'
import { createServer } from 'node:net'

let pass = 0
let fail = 0

function check(name, actual, expected) {
  const ok = actual === expected
  console.log(`  ${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n      期望 ${expected}，实际 ${actual}`}`)
  ok ? pass++ : fail++
}

/* ---------------- parseNetstatForPort ---------------- */

const SAMPLE = `
活动连接

  协议  本地地址          外部地址        状态           PID
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       1060
  TCP    [::1]:5173             [::]:0                 LISTENING       280776
  TCP    127.0.0.1:51737        127.0.0.1:59058        TIME_WAIT       0
  TCP    127.0.0.1:5174         0.0.0.0:0              LISTENING       287920
  TCP    0.0.0.0:4173           0.0.0.0:0              LISTENING       999999
  TCP    127.0.0.1:51730        127.0.0.1:5173         ESTABLISHED     12345
`

console.log('\n[parseNetstatForPort · 端口精确匹配]')
check('精确匹配 5173', parseNetstatForPort(SAMPLE, 5173), 280776)
check('不误中 5174', parseNetstatForPort(SAMPLE, 5174), 287920)
check('不误中 4173', parseNetstatForPort(SAMPLE, 4173), 999999)
check('不把 51737 当成 5173', parseNetstatForPort(SAMPLE, 51737), null)
check('不把 51730 当成 5173', parseNetstatForPort(SAMPLE, 51730), null)
check('ESTABLISHED 行不算监听', parseNetstatForPort(SAMPLE, 135), 1060)

// 关键回归：文本里只有 51737 时，查 5173 必须是 null
const TRICKY = '  TCP    127.0.0.1:51737       127.0.0.1:59058        LISTENING       111'
check('回归：只有 :51737 时查 5173 应为 null', parseNetstatForPort(TRICKY, 5173), null)
check('回归：同一行查 51737 应命中', parseNetstatForPort(TRICKY, 51737), 111)

check('空字符串返回 null', parseNetstatForPort('', 5173), null)
check(
  '无 LISTENING 返回 null',
  parseNetstatForPort('  TCP 1.2.3.4:5173 5.6.7.8:80 ESTABLISHED 1', 5173),
  null
)
check('字段不足行被忽略', parseNetstatForPort('  TCP  5173', 5173), null)

const MIXED = `
  TCP    [::]:5173              [::]:0                 LISTENING       777
  TCP    0.0.0.0:5173           0.0.0.0:0              LISTENING       777
`
check('IPv6 监听可识别', parseNetstatForPort(MIXED, 5173), 777)

/* ---------------- 连接探测 ---------------- */

console.log('\n[probePort · 真实 TCP 探测]')

// 起一个真实服务器，验证探测能发现它
const TEST_PORT = 58421
const server = createServer()
await new Promise((r) => server.listen(TEST_PORT, '127.0.0.1', r))

check('能探测到正在监听的端口', await probePort(TEST_PORT, '127.0.0.1'), true)
check('未监听端口返回 false', await probePort(58422, '127.0.0.1'), false)
check('isPortInUse 对监听中的端口为 true', await isPortInUse(TEST_PORT), true)

await new Promise((r) => server.close(r))
await new Promise((r) => setTimeout(r, 300))
check('关闭后 isPortInUse 变为 false', await isPortInUse(TEST_PORT), false)

/* ---------------- findPidOnPort ---------------- */

console.log('\n[findPidOnPort · 真实系统]')
const shape = findPidOnPort(59999)
check('未占用端口返回 null', shape, null)

/* ---------------- 汇总 ---------------- */

console.log(`\n${'='.repeat(46)}`)
console.log(`通过 ${pass}/${pass + fail}`)
if (fail) {
  console.log('失败项见上方 ✗')
  process.exit(1)
}
console.log('全部通过 ✓\n')

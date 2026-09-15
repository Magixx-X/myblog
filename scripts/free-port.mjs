/**
 * 释放端口。dev server 起不来时手动用。
 *
 * 用法：npm run free-port
 *       node scripts/free-port.mjs 5173 4173 3000
 */
import { freePort } from './port-utils.mjs'

const rawPorts = process.argv.slice(2)
const ports = rawPorts.map(Number).filter((p) => Number.isInteger(p) && p > 0 && p <= 65535)
const invalid = rawPorts.filter((s) => !ports.includes(Number(s)))

if (invalid.length) {
  console.error(`  ✗ 忽略非法端口：${invalid.join(', ')}（需要 1–65535 的整数）`)
}
if (!ports.length && !invalid.length) ports.push(5173, 4173)

console.log('')

let killed = 0
let stuck = 0

for (const port of ports) {
  const r = await freePort(port, { log: (m) => console.log(`  · ${m}`) })
  if (r.killed && r.freed) killed++
  if (r.inUse && !r.freed) stuck++
}

console.log('')
if (stuck) {
  console.log(`  ${stuck} 个端口没能腾出来，可能需要管理员权限，或占用进程在其它终端会话里。`)
} else if (killed) {
  console.log(`  共释放 ${killed} 个端口，现在可以 npm run dev 了`)
} else {
  console.log('  没有需要释放的端口')
}
console.log('')

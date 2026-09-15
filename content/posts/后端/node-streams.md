---
title: Node 里的流：从 readFile 到 pipeline 的一次踩坑记录
date: 2026-06-30
category: 后端
tags: [Node.js, 流, 性能优化]
summary: 用 readFileSync 处理 200MB 日志文件，进程直接 OOM。记录一次把同步读取改造成流式处理的过程。
---

## 事故现场

需求不复杂：读一个日志文件，按关键字过滤，输出统计结果。

当时的实现：

```js
import { readFileSync } from 'node:fs'

const content = readFileSync('./access.log', 'utf8')
const lines = content.split('\n')
const errors = lines.filter((l) => l.includes('ERROR'))
console.log(errors.length)
```

本地跑没问题——我的测试文件是 2MB。

上生产，文件 200MB，进程在几秒内被 Killed。

## 为什么

三个叠加的问题：

1. **`readFileSync('utf8')` 把整个文件解码成字符串**。200MB 的 UTF-8 文件，V8 里按两字节一个字符算，字符串本身可能占 400MB。
2. **`split('\n')` 再复制一份**。生成 200 万个字符串对象，每个对象有额外的内存开销（V8 里字符串对象头就不小），实际占用可能是原始数据的数倍。
3. **`filter` 产生第三个数组**。

峰值内存轻松破 1GB，超出容器的限制。

更糟的是 `Sync` —— 它在主线程同步执行，整个进程在读取期间无法响应任何东西。

## 流式改造

核心思路：**不再把整个文件读进内存，而是分块处理，块用完就丢**。

```js
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

const stream = createReadStream('./access.log', { encoding: 'utf8' })
const rl = createInterface({ input: stream, crlfDelay: Infinity })

let errorCount = 0
let total = 0

rl.on('line', (line) => {
  total++
  if (line.includes('ERROR')) errorCount++
})

rl.on('close', () => {
  console.log(`total=${total} errors=${errorCount}`)
})
```

内存占用从 1GB+ 降到几乎恒定——不论文件是 2MB 还是 2GB，进程内存都在几十 MB 级别。

注意 `crlfDelay: Infinity`：它让 `\r\n` 被识别成单个换行。不加的话，在处理 Windows 生成的文件时，每行结尾会多一个 `\r`，导致字符串比较出各种诡异错误。

## 背压：流真正难的地方

上面那段代码有一个隐患：如果 `line` 回调里做了异步操作，源数据会攒在内存里等着。

```js
// ⚠️ 危险
rl.on('line', async (line) => {
  await writeToDatabase(line)   // 数据库慢的时候，内存里堆满待处理的行
})
```

`line` 事件不关心你的异步操作有没有完成。读取速度是恒定的，写入速度取决于下游——**流速不匹配时，差的那部分就堆在内存里**。这就是背压（backpressure）要解决的问题。

流的哲学是：**下游消费不过来时，让上游停下来**。但事件监听模式会绕过这个机制。

正确的做法是 `pipeline`，它自动串联上下游并处理背压、错误传播和资源释放：

```js
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import { createWriteStream } from 'node:fs'

await pipeline(
  createReadStream('./access.log', { encoding: 'utf8' }),
  // 按行切分
  new Transform({
    transform(chunk, _enc, cb) {
      this._buf = (this._buf || '') + chunk
      const parts = this._buf.split('\n')
      this._buf = parts.pop() || ''
      for (const line of parts) this.push(line + '\n')
      cb()
    },
    flush(cb) {
      if (this._buf) this.push(this._buf)
      cb()
    }
  }),
  // 过滤 ERROR
  new Transform({
    transform(line, _enc, cb) {
      cb(null, line.includes('ERROR') ? line : null)
    }
  }),
  createWriteStream('./errors.log')
)
```

`pipeline` 的好处：

- 下游写满了会自动暂停上游（背压真的生效了）
- 任何一环报错，所有流都会被销毁，不会泄漏文件句柄
- 返回 Promise，可以用 `try/catch` 而不是到处监听 `'error'`

## 需要记住的几个原则

**一、默认用异步 API。** `fs.readFileSync` 只在两种情况下合理：启动时读配置文件，以及写一次性脚本。任何处理用户数据或不可控大小文件的地方，都不该用同步版本。

**二、判断该不该用流，看"大小是否可控"。** 小文件（< 10MB）纯读进内存再处理往往更快，流的调度开销反而更明显。日志、上传文件、数据库导出——这些是流的场景。

**三、优先用 `pipeline` 而不是 `pipe`。** `pipe` 不会在出错时销毁上游，也不会把错误从下游传回来，是经典的句柄泄漏来源。

```js
// ❌ 出错时 readStream 不会关闭
readStream.pipe(writeStream)

// ✅
await pipeline(readStream, writeStream)
```

**四、需要按行处理就用 `readline`。** 手写切行很容易漏掉最后一行没有换行符的情况。

## 顺带一提：小写也得注意

如果只是要统计行数，其实不用读内容：

```js
import { createReadStream } from 'node:fs'

// 只统计行数，不解析内容
const { size } = await stat('./access.log')
let lines = 0
for await (const chunk of createReadStream('./access.log')) {
  for (let i = 0; i < chunk.length; i++) {
    if (chunk[i] === 10) lines++    // '\n' 的字节值
    }
}
```

按 Buffer 逐字节扫描，完全不产生字符串对象。处理几个 GB 的文件也只需要几秒。

## 复盘

事故的根因不是"不知道该用流"，而是**测试数据和生产数据的量级差了 100 倍，而代码里所有假设都建立在小文件上**。

后来我给这个脚本加了一个前置检查：

```js
const { size } = await stat(filePath)
if (size > 50 * 1024 * 1024) {
  console.warn(`文件 ${(size / 1e6).toFixed(1)}MB，启用流式处理`)
  return processLargeFile(filePath)
}
```

以及一条纪律：**任何处理文件的代码，都要先问一句"如果这个文件是 10GB 会怎样"**。答案通常是"会挂"，那就该换实现。

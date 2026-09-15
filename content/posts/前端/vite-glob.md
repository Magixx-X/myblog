---
title: Vite 的 import.meta.glob 到底做了什么
date: 2026-09-05
category: 前端
tags: [Vite, 构建工具, JavaScript]
summary: 一个编译期语法替换，解决了浏览器没有文件系统这个根本矛盾。说说它的实现原理和几个容易踩的坑。
---

## 问题从哪来

浏览器里没有 `fs`。这不是安全策略能绕开的东西——它是一个**架构事实**：代码运行在用户的机器上，而你希望它读取的是服务器的目录。

传统解决办法是跑一个 Node 服务，把文件操作放在服务端，浏览器通过 HTTP 拿结果。对博客来说，这等于为了读几个 `.md` 文件而引入了整个运行时。

Vite 的解法是：**把这件事提前到构建期做掉**。

## 它展开成什么

你写：

```js
const modules = import.meta.glob('./dir/*.js', { eager: true })
```

Vite 在编译时把它替换成大致等价于这样的代码：

```js
const modules = {
  './dir/a.js': await import('./dir/a.js'),
  './dir/b.js': await import('./dir/b.js')
}
```

注意 import 路径是在**编译时静态确定的**。Vite 用 fast-glob 扫描文件系统，把每个匹配到的路径硬编码进产物。所以：

> `import.meta.glob` 的参数必须是**字面量**，不能是变量。

```js
// ❌ 不行，Vite 无法在编译期求值
const dir = './content'
import.meta.glob(`${dir}/*.md`)

// ✅ 可以
import.meta.glob('./content/*.md')
```

后面的 `**` 递归和 `?raw` 之类的 query 都是允许的，因为它们同样写死在源码里。

## 几个常用 query

### ?raw —— 拿原始字符串

这是博客场景最常用的：

```js
import.meta.glob('./posts/**/*.md', { query: '?raw', import: 'default', eager: true })
```

`?raw` 让 Vite 不去执行/解析这个文件，直接把文件内容当字符串导出。`.md` 本身不是 JS，不加 `?raw` 会直接被当成代码解析然后报错。

### ?url —— 拿资源地址

```js
import.meta.glob('./images/*.png', { query: '?url', import: 'default', eager: true })
```

返回的是处理后的 URL（大文件会是独立资源路径，小文件可能变 base64）。适合按目录批量引用图片。

### eager 开不开

| 配置 | 产出 | 适用 |
| --- | --- | --- |
| `eager: true` | 一个普通对象，值已就绪 | 需要同步访问数据 |
| 默认（懒） | 一个对象，值返回 `Promise` | 体积敏感、按需加载 |

懒加载版本要这样用：

```js
const map = import.meta.glob('./posts/*.md', { query: '?raw', import: 'default' })
for (const [path, loader] of Object.entries(map)) {
  const raw = await loader()
}
```

对博客来说我建议 **eager**。原因很实际：你的侧边栏要展示全部标签、首页要算总字数、搜索要匹配所有正文——这些都需要全量数据。懒加载只会让你在路由钩子里到处 await。

代价是首屏 JS 变大。100 篇千字文大概多出 1–2 MB，gzip 后小一个量级。可接受。

## 三个坑

### 一、键的路径分隔符

在 Windows 上开发时，`import.meta.glob` 返回的键**有可能带反斜杠**：

```js
// 可能是 './posts\\hello.md'
```

如果拿这个键去做字符串匹配、拼 URL、或者当 Map 的 key 用于查找，跨平台就会出问题。统一处理一下：

```js
const normalized = path.replace(/\\/g, '/')
```

我在博客里就踩过这个：渲染时用原始 path 去 `rawFiles[post.path]` 查值，Windows 下对不上，页面白屏。

### 二、匹配不到会静默通过

```js
const files = import.meta.glob('./nothing-here/*.md', { eager: true })
// files === {}
```

不会报错，不会警告。空目录、拼错的路径、大小写错了的目录名——都表现为"列表页空了"。排查时先 `console.log(Object.keys(files))`。

### 三、产物里的内容会全部内联

`eager: true` 意味着所有文章正文都进了 JS bundle。如果你在 `content/` 下放了几十 MB 的图片并试图用 glob 读进来，产物会爆炸。

正确做法：图片放 `public/` 或用 `?url` 让 Vite 走资源管线，不要用 `?raw`。

## 一句话总结

`import.meta.glob` 是"**用编译期换运行时**"的典型例子。它把文件系统访问这个不可能在浏览器完成的操作，提前转化成了静态的 import 语句。

只要记住：路径写死、注意分隔符、eager 换体积。

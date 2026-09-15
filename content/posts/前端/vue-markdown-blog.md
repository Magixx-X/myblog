---
title: 用 Vue 3 + Markdown 搭一个不需要数据库的博客
date: 2026-09-12
category: 前端
tags: [Vue, Vite, Markdown]
summary: 把文章当成源码来管理。没有后台、没有数据库、没有 CMS，Git 提交就是发布，git revert 就是撤回。
cover: ""
pinned: true
---

## 为什么不用数据库

博客这类内容站，本质上只有两种操作：**写**和**读**。而"写"的频率，对个人博客来说大概是一周几次。

为了一周几次的写入，去维护一台服务器、一个数据库、一套后台管理系统、一个登录鉴权模块——这笔账算不过来。

所以这个站的设计前提是：

> 文章的源文件就是 `.md` 文件，躺在 Git 仓库里。写完 `git push`，站点就是新的。

没有数据库意味着：没有连接池、没有备份策略、没有 SQL 注入、没有迁移脚本。也意味着**你的内容永远是你自己的**，一个 `git clone` 就能带走全部。

## 技术选型

| 环节 | 选择 | 理由 |
| --- | --- | --- |
| 视图层 | Vue 3 + Composition API | 上手快，模板语义清晰 |
| 构建 | Vite 5 | 冷启动快，`import.meta.glob` 是关键 |
| 路由 | vue-router 4 | 标准方案 |
| Markdown | markdown-it | 插件生态成熟 |
| 元数据 | 自研解析器 | `gray-matter` 依赖 Node `Buffer`，浏览器里跑不了 |
| 代码高亮 | highlight.js | 支持语言全 |

### 关键的一行：import.meta.glob

传统做法是用 `fs.readFileSync` 遍历目录，但浏览器里没有 `fs`。Vite 提供了编译期方案：

```js
const rawFiles = import.meta.glob('../../content/posts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
})
```

这几行的含义是：**在打包时**，把 `content/posts` 下所有 Markdown 文件的内容作为字符串读进来，塞进一个对象里。运行时你拿到的是一个普通的 JS 对象，键是文件路径，值是文件内容。

`eager: true` 表示立即展开而不是返回动态 import 函数——文章量在几百篇以内完全撑得住，换来的是同步可用的数据，路由守卫和列表页都省事。

## front-matter 约定

每篇文章头部用 YAML 声明元信息：

```yaml
---
title: 文章标题
date: 2026-09-12
category: 前端
tags: [Vue, Vite]
summary: 列表页展示的摘要，不写则自动截取正文
draft: false
---
```

其中 `draft: true` 的文章会在构建时被直接过滤掉，不会出现在任何列表和搜索结果里。本地写一半的文章可以放心提交。

## 渲染管线

从一段 Markdown 到页面上的 HTML，中间有三步：

1. **拆包**：`src/content/frontmatter.js` 把 front-matter 和正文分开
2. **渲染**：markdown-it 把正文转成 HTML 字符串，同时挂上 `markdown-it-anchor` 给每个 h2/h3 生成 id
3. **注入**：用 `v-html` 塞进组件

第 3 步需要注意——`v-html` 渲染的 HTML 不经过 Vue 的模板编译器，所以里面**不能用 Vue 组件或指令**。如果你想让代码块带一个"复制"按钮，得在渲染完成后用 DOM 操作挂上去，或者改用自定义 renderer 输出占位节点。

我选了后者：

```js
highlight(str, lang) {
  if (lang && hljs.getLanguage(lang)) {
    const { value } = hljs.highlight(str, { language: lang, ignoreIllegals: true })
    return `<pre class="hljs"><code class="language-${lang}">${value}</code></pre>`
  }
  return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
}
```

注意最后那行兜底：**只要 lang 不认识，就走 escapeHtml**。高亮函数如果直接返回原始字符串，遇到畸形代码块会撕开页面结构。

## 部署

`npm run build` 产出纯静态文件，扔到任何地方都能跑：

- GitHub Pages（配一个 Actions workflow 即可）
- Vercel / Netlify（连仓库，零配置）
- 自己的 Nginx（一个 `root` 指令）

因为用了 history 路由模式，记得在服务端配置 fallback 到 `index.html`，否则刷新子路由会 404。

## 小结

这套方案的边界很清楚：**适合个人博客、文档站、作品集这类低频写入的内容站**。

一旦你需要多用户、评论、草稿协作、定时发布——老老实实上后端和数据库，别跟构建期数据较劲。

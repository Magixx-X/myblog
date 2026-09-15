# 我的博客

一个不需要数据库的个人博客。文章是 Markdown，内容靠 Git 维护。

## 特性

- **文章列表** — 分页、置顶、摘要、阅读时长
- **文章详情** — Markdown 渲染、代码高亮、自动生成目录、锚点、代码复制、上下篇导航、相关文章
- **标签系统** — 标签云、按标签筛选、共现标签推荐
- **分类系统** — 由目录结构自动推导，支持手风琴展开
- **归档时间轴** — 按年/月组织的完整时间线
- **全文搜索** — 标题 / 标签 / 摘要 / 正文加权匹配，结果带命中片段高亮
- **关于页面** — 个人介绍、技术栈、站点统计
- **暗色 / 亮色主题** — 跟随系统偏好，可手动切换并记忆
- **响应式布局** — 移动端自适应

## 技术栈

| 环节 | 选型 |
| --- | --- |
| 视图层 | Vue 3（Composition API + `<script setup>`） |
| 构建 | Vite 5 |
| 路由 | vue-router 4（History 模式） |
| Markdown | markdown-it + markdown-it-anchor |
| 代码高亮 | highlight.js |
| 元数据 | 自研 front-matter 解析器（`src/content/frontmatter.js`） |

**没有后端服务，没有数据库。** 所有文章在构建期通过 `import.meta.glob` 内联进产物，产出纯静态文件。

## 快速开始

```bash
npm install     # 安装依赖
npm run dev     # 开发服务器 → http://localhost:5173
npm run build   # 构建到 dist/
npm run preview # 预览构建产物
```

**不想开终端？** 双击根目录的 `启动博客.bat` 也行，效果和 `npm run dev` 一样，
依赖没装会自动装，服务起来后自动开浏览器。

### 如果 dev server 打不开

最常见的原因是**上一次的 vite 进程没退干净，还占着 5173**。
这时 vite 会静默退到 5174 / 5175，你按 5173 打开看到的是旧页面或空白。

`npm run dev` 已经内置了处理：启动前会清掉端口上的残留进程，
端口腾不出来时**明确报错**而不是偷偷换端口。所以直接重跑一次通常就好了。

真遇到清不掉的情况：

```bash
npm run free-port                                  # 释放 5173 和 4173
node scripts/free-port.mjs 3000                    # 释放指定端口
PORT=3000 npm run dev                              # 或者干脆换个端口
```

> 为什么「残留」这么常见：vite 是通过 `cmd.exe` 起的，进程链是
> `node → cmd.exe → npx → vite → esbuild`。只杀父进程会留下孙子进程继续占着端口。
> 而且 Windows 上「强制结束进程」「直接关掉终端窗口」不会触发任何退出钩子——
> 所以**自愈比完美清理更重要**，这也是 `npm run dev` 先清端口的原因。

### 其他启动选项

```bash
NO_OPEN=1 npm run dev          # 不自动打开浏览器（跑测试 / CI 时用）
PORT=3000 npm run dev          # 换端口；取值非法会直接提示，不会甩堆栈
```

`Ctrl+C` 停止时会显示「服务已停止」。如果是别的退出码，脚本会提示
「通常是终端被关闭或进程被外部结束」，并让你往上翻看 vite 自己的报错——
不预设是你的操作有问题。

### 验证

改完内容或管线代码，跑这两个：

```bash
npm run verify                 # 数据层：草稿过滤 / 日期排序 / 标签分类聚合
npm run smoke                  # 渲染层：真浏览器逐页断言（默认打 5173）
npm run smoke -- http://localhost:4173   # 生产构建也要过一遍
```

`verify` 查的是数据对不对，`smoke` 查的是页面真的渲染出来了、且没有 JS 报错。
**两个都要跑**——只用其中一个会漏掉整类故障（比如「构建成功但一篇文章都没有」这种只在运行时才暴露的问题）。

```bash
npm test                       # 启动脚本相关的单元测试 + 端到端测试
npm run test:port              # 只管端口检测逻辑（快）
npm run test:launcher          # 端到端：孤儿接管 + 强杀自愈（慢，约 1 分钟）
node scripts/screenshot.mjs    # 批量截图到 screenshots/，用于人工核对视觉
```

## 目录结构

```
.
├── content/
│   └── posts/                  # ← 文章都在这里
│       ├── 前端/               # 目录名 = 分类名
│       │   └── xxx.md
│       ├── 后端/
│       ├── 工程实践/
│       └── 随笔/
├── scripts/
│   ├── start-dev.mjs           # ★ 启动器：清端口 + 起 vite + 开浏览器
│   ├── port-utils.mjs          # 端口探测 / 进程树清理
│   ├── free-port.mjs           # 手动释放端口（npm run free-port）
│   ├── new-post.js             # 新建文章脚手架
│   ├── verify-content.mjs      # 内容管线验证（npm run verify）
│   ├── smoke-test.mjs          # 浏览器冒烟测试（npm run smoke）
│   ├── test-port-utils.mjs     # 端口逻辑单元测试
│   ├── test-launcher.mjs       # 启动器端到端测试
│   └── screenshot.mjs          # 批量页面截图
├── 启动博客.bat                # Windows 双击启动
├── src/
│   ├── components/
│   │   ├── SiteHeader.vue      # 顶栏（导航 / 搜索 / 主题切换）
│   │   ├── SiteFooter.vue
│   │   ├── PostCard.vue        # 文章卡片
│   │   └── Pagination.vue
│   ├── content/
│   │   ├── blog.js             # ★ 内容管线：解析、排序、聚合、搜索
│   │   └── frontmatter.js      # front-matter 解析器（浏览器可用）
│   ├── router/
│   │   └── index.js
│   ├── styles/
│   │   ├── base.css            # 设计令牌 + 通用样式
│   │   └── markdown.css        # 正文排版
│   ├── views/
│   │   ├── HomeView.vue        # 首页（列表 + 搜索 + 侧栏）
│   │   ├── PostView.vue        # 文章详情
│   │   ├── TagsView.vue        # 标签总览
│   │   ├── TagDetailView.vue   # 单个标签
│   │   ├── CategoriesView.vue  # 分类
│   │   ├── ArchiveView.vue     # 归档时间轴
│   │   ├── AboutView.vue       # 关于
│   │   └── NotFoundView.vue    # 404
│   ├── App.vue
│   ├── config.js               # ★ 站点配置（标题、作者、社交链接）
│   └── main.js
└── vite.config.js
```

## 写一篇新文章

### 方式一：脚手架（推荐）

```bash
npm run new -- "文章标题" --cat 前端 --tags Vue,Vite
```

会在 `content/posts/前端/` 下生成带好 front-matter 的文件，默认 `draft: true`。

### 方式二：手动创建

在 `content/posts/<分类>/` 下新建 `.md` 文件：

```markdown
---
title: 文章标题
date: 2026-09-15
category: 前端
tags: [Vue, Vite]
summary: 列表页展示的摘要，不写则自动截取正文前 120 字
cover: /images/cover.png
pinned: false
draft: false
---

## 正文标题

正文用标准 Markdown 写就行。
```

### front-matter 字段

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题 |
| `date` | 推荐 | `YYYY-MM-DD`，**不补零会排序错乱** |
| `category` | 否 | 不写则由所在目录名决定 |
| `tags` | 否 | 数组 `[A, B]` 或单个值 |
| `summary` | 否 | 不写则自动从正文截取 |
| `cover` | 否 | 封面图 URL，列表页显示 |
| `pinned` | 否 | `true` 则排在列表最前 |
| `draft` | 否 | `true` 则**完全不出现在站点上** |

### 发布

```bash
git add .
git commit -m "post: 文章标题"
git push
```

推上去之后 CI 自动构建并部署。

## 首次上传到 GitHub

项目里已经有 `.gitignore`（排除 `node_modules`/`dist`/`screenshots`）和
`.gitattributes`（统一换行符），直接照下面做即可。

### 1. 配一次身份（全局，只需一次）

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

邮箱建议用 GitHub 账号邮箱。不想暴露真实邮箱的话，去
GitHub → Settings → Emails 勾上 *Keep my email addresses private*，
它会给你一个 `<数字ID>+<用户名>@users.noreply.github.com`，用那个填。

顺手让凭证被记住（不用每次输密码）：

```bash
git config --global credential.helper manager
```

### 2. 在本地建仓库并提交

```bash
cd /d E:\DevWorkspace\DevProjects\web
git init -b main
git add .
git commit -m "chore: 初始化博客"
```

### 3. 在 GitHub 建一个**空**仓库

打开 https://github.com/new ：

- **Repository name**：比如 `my-blog`
- **不要**勾 Add a README / .gitignore / license
  勾了远端就有提交，和本地历史对不上，第一次 push 会被拒
- 建议选 **Private**，确认没问题后再改 Public

### 4. 关联远端并推送

```bash
git remote add origin https://github.com/<你的用户名>/my-blog.git
git push -u origin main
```

会弹窗让你登录 GitHub（走 `credential.helper manager`），登录一次以后就免密了。

> 用 Token 的话：GitHub → Settings → Developer settings →
> Personal access tokens → **Tokens (classic)** → 勾 `repo` **和 `workflow`**。
> `workflow` 这个权限不能漏 —— 仓库里有 `.github/workflows/deploy.yml`，
> 少了它推送会被直接拒绝。Token 当密码填。

### 5. 开启自动部署（可选）

仓库 Settings → Pages → Source 选 **GitHub Actions**。
之后每次 push 自动构建，站点发布到
`https://<用户名>.github.io/<仓库名>/`。

## 部署

### GitHub Pages

仓库里已经配好 `.github/workflows/deploy.yml`：

1. 把代码推到 GitHub 的 `main` 分支
2. 仓库 Settings → Pages → Source 选 **GitHub Actions**
3. 之后每次 push 自动构建部署

workflow 会自动注入 `VITE_BASE=/<仓库名>/`，不用手改配置。

> 如果是用户主页仓库（名字形如 `<用户名>.github.io`），把 workflow 里的 `VITE_BASE` 那两行删掉即可。

### Vercel / Netlify

连上 Git 仓库，构建命令 `npm run build`，输出目录 `dist`，零配置。

### 自己的服务器（Nginx）

```nginx
server {
    listen 80;
    server_name blog.example.com;
    root /var/www/blog/dist;

    # History 模式必须配这个，否则刷新子路由 404
    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

## 配置站点信息

改 `src/config.js` 就行：

```js
export const site = {
  title: '我的博客',
  subtitle: '记录技术、思考与生活',
  description: '……',
  author: 'Bill',
  email: 'bill@example.com',
  city: '苏州',
  since: 2024,
  socials: [ /* 社交链接，留空则隐藏 */ ]
}

export const PAGE_SIZE = 6   // 首页每页文章数
```

## 实现要点

### 内容管线

`src/content/blog.js` 是核心。构建期把 `content/posts/**/*.md` 全部读进来，然后：

1. **解析** — `src/content/frontmatter.js` 拆出 front-matter 和正文
2. **过滤** — 丢掉 `draft: true` 的文章
3. **派生** — 从文件路径推分类，从正文算字数和阅读时长，没写摘要就自动截取
4. **排序** — 置顶优先，其余按日期倒序
5. **聚合** — 导出 `tagList` / `categoryList` / `archiveList` 供各页面消费

Markdown 渲染做了**惰性缓存**——列表页不需要渲染正文，只有详情页访问时才渲染，结果缓存在文章对象上。

> **为什么要自己写 front-matter 解析器？**
>
> 常见的 `gray-matter` 依赖 Node 的 `Buffer`。本站正文是在**浏览器里**解析的（构建期用 `?raw` 把 `.md` 原文内联进 bundle），
> 浏览器没有 `Buffer`，于是每个文件都抛 `Buffer is not defined` 被跳过——
> 表现是「构建成功但一篇文章都没有」，而且**不报构建错误**，只在控制台里安静地失败。
>
> `src/content/frontmatter.js` 只实现博客实际用到的 YAML 子集（标量 / ISO 日期 / 行内数组 / 块状数组）。
> 它同时被 `scripts/verify-content.mjs` 复用，保证测试和线上跑的是同一套逻辑。

### 全文搜索

纯前端实现，加权打分：

| 命中位置 | 权重 |
| --- | --- |
| 标题 | 10 |
| 标签 | 6 |
| 摘要 | 4 |
| 正文 | 1 |

关键词存在 URL 的 `?q=` 里，所以搜索结果可以分享、可以前进后退。命中正文时会展示上下文片段并高亮。

### 主题切换

CSS 变量 + `html[data-theme]` 属性切换。默认读 `localStorage`，没有则跟随系统 `prefers-color-scheme`。

## 已知边界

- 文章量在**几百篇以内**没问题。上千篇时 `eager: true` 的 bundle 会偏大，需要改成按需加载或迁移到 SSG（如 VitePress / Astro）。
- 搜索是**字符串包含匹配**，不支持分词和模糊匹配。中文分词场景下，搜"性能优化"能命中，搜"优化性能"不行。
- 搜索是**提交式**的（回车或点「搜索」），不是边打边筛。关键词写进 URL 的 `?q=`，所以结果页可分享、可前进后退。
- 没有评论系统。需要的话接 Giscus（基于 GitHub Discussions，和这套 Git 工作流很搭）。
- `frontmatter.js` 只支持博客用到的 YAML 子集。嵌套对象、多行字符串（`|` / `>`）这类写法不会被解析成预期结构——
  遇到复杂元数据需求时，要么改用简单标量，要么补全解析器。

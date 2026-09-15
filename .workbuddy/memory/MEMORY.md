# 项目长期约定

## 项目：web（我的博客）

个人博客站。**没有后端服务，没有数据库** —— 内容全部是 `content/posts/` 下的 Markdown 文件，靠 Git 维护版本。

### 必须遵守的约定

- **分类由目录决定**，不要往 front-matter 写 `category`。目录结构即分类结构。
- **Date 字段一律当字符串处理**。排序前必须先归一化成 `YYYY-MM-DD`（`normalizeDate()` 取 UTC 字段，避免跨时区偏移一天）。改内容管线时别退回直接用 `fm.date`。
- **front-matter 的值里出现冒号必须加引号**，否则 YAML 解析抛错。已在内容管线里加了 try/catch 兜底。
- **不要引入 `gray-matter`**。它依赖 Node `Buffer`，而正文是在浏览器里解析的，会导致"构建成功但零文章"的静默故障。用 `src/content/frontmatter.js`。
- **改内容管线后跑 `npm run verify` + `npm run smoke`**。`verify` 查数据层（过滤/排序/聚合），`smoke` 查渲染层（真浏览器里逐页断言）。两者都要过。
- **不要用 agent-browser CLI 做跨命令断言**，它每次调用都是独立 session，页面状态会丢。用 `scripts/smoke-test.mjs`（单 CDP 连接跑完全部断言）。
- **不为低频操作引入重型依赖**。这个站的整个设计前提就是"够用就好"，不要提议加 CMS、数据库或 SSR 框架。
- **不要把 `npm run dev` 改回裸 `vite`**。现在它走 `scripts/start-dev.mjs`，负责清端口 + `--strictPort` + 开浏览器。
  裸 vite 在端口被占时会**静默换到 5174/5175**，用户按 5173 打开就是空白——这正是之前「打不开」的原因。
  需要纯 vite 用 `npm run dev:plain`。
- **判定「端口是否被占」必须用 TCP 连接探测，不要用 netstat**。Windows 上 netstat 经常查不到
  正在服务的 vite（实测 curl 200 但 netstat 空）。工具在 `scripts/port-utils.mjs`。
- **杀 vite 必须按进程树**（Windows `taskkill /T /F`）。进程链是
  `node → cmd.exe → npx → vite → esbuild`，只杀父进程会留孤儿占端口。
- **自动化里 spawn `start-dev.mjs` 要带 `NO_OPEN=1`**，否则会弹出用户浏览器。
- **`PORT` 越界要在启动时拦下**（`start-dev.mjs` / `free-port.mjs` 已做）。
  直接传到 `net.connect` 会抛 `ERR_SOCKET_BAD_PORT` 并甩出 Node 内部堆栈。

### 常用命令

```bash
npm run dev                    # 启动开发服务器（清端口 + 开浏览器），端口 5173
npm run dev:plain              # 裸 vite，调试启动器时才用
npm run build                  # 构建到 dist/
npm run preview                # 预览生产构建，端口 4173
npm run free-port              # 释放 5173 / 4173（dev server 打不开时先跑这个）
PORT=3000 npm run dev          # 换端口启动
npm run new -- "标题" -c 分类 -t 标签1,标签2   # 新建文章
npm run verify                 # 内容管线验证（过滤/排序/聚合）
npm run smoke                  # 全站浏览器冒烟测试（默认打 5173，可传 URL）
npm run smoke -- http://localhost:4173        # 对生产构建跑冒烟
npm test                       # 端口逻辑单测 + 启动器端到端测试
node scripts/screenshot.mjs    # 批量截图到 screenshots/，用于视觉核对
```

Windows 上也可以直接双击根目录 `启动博客.bat`。

### 环境注意

- Windows + Git Bash。**bash 工具的 PATH 不完整**，`ls`/`tail`/`head`/`find` 等会报 `command not found`。
  解决：命令前加 `export PATH="/usr/bin:/bin:/c/Windows/System32:$PATH"`。
- PowerShell 工具的 stdout 不回传，读文件/目录一律用 Read / Glob / Grep 工具，不要依赖 shell 输出。
- 全局 npm bin 在 `~/.workbuddy/binaries/node/versions/22.22.2-3/`。
- **git 不在 bash 工具的 PATH 里**，只有 WorkBuddy 自带的 PortableGit（未装 Git for Windows）。
  路径：`/c/Users/Bill/.workbuddy/binaries/PortableGit/versions/1.2.0/cmd`（v2.55.0）。
- **`git diff --name-only` 默认把中文路径显示成八进制转义**，按中文 grep 找不到文件。
  加 `-c core.quotepath=false` 才显示真实文件名。
- **`.bat` / `.cmd` 必须 CRLF 换行**（已在 `.gitattributes` 固定为 `eol=crlf`）。
  cmd.exe 对 LF 批处理的解析不可靠，多行 `if (...)` 块尤其容易炸。
  用 Write 工具改 `.bat` 后记得转回 CRLF。
- Git Bash 里 **`taskkill //F //PID x` 不work**（MSYS 不把 `//F` 转成 `/F`，报「无效参数」）。
  杀进程用 `killPid()`（Node 直接调 taskkill，不经 shell）或 `powershell Stop-Process`。
- 后台起的 dev server 会在会话结束时被回收，退出码 1 —— 这是环境行为，不是脚本故障。
- **区分两个代理，别搞混**：
  - `127.0.0.1:53903` = **WorkBuddy 沙箱自己的出口代理**，只注入到 bash 工具的环境变量里。
    它访问 GitHub 会返回 `CONNECT tunnel failed, 502`（`curl https://github.com` → `000`），
    所以**这个环境里跑不了 push/pull**，涉及 GitHub 的操作交给用户，别反复重试。
  - `127.0.0.1:7897` = **用户本机的 Clash Verge 混合端口**（netstat 可查到 LISTENING）。
    git 走它访问 GitHub 实测 **exit=0 正常**。
- **Git 不读 Windows 系统代理设置**。「浏览器能打开 GitHub」不等于「git 能连上」。
  git 只认 `http.proxy` / `https.proxy` 配置项或 `HTTP_PROXY` / `HTTPS_PROXY` 环境变量；
  两处都没配时 git 直连 `github.com:443`，约 21 秒后超时
  （`Failed to connect to github.com:443`、`Could not connect to server`，exit 128）。
  排查推送失败先看这两处，不要先怀疑认证。
- `reg.exe` 被沙箱程序黑名单拦截，读不到 WinINET 注册表项。要查代理端口用 `netstat -ano`。

### 仓库

- 远端：`https://github.com/Magixx-X/myblog`（用户后来去掉了 `.git` 后缀，两种写法对 GitHub 等价），主分支 `main`
- 首次提交 `a98505a`（49 files）。此后改内容照常 `git add / commit / push` 即可。
- 仓库是**私有**的。**推送必须由用户在自己的终端/VS Code 做** —— 沙箱里 `git push` 会挂死
  （凭据窗口弹不出来），但 `git ls-remote` 这类只读操作能跑通，可用来查看远端状态。

### 部署（GitHub Pages）

- workflow 在 `.github/workflows/deploy.yml`，`VITE_BASE` 由仓库名自动推导为 `/<repo>/`。
- **GitHub Free 账号的私有仓库不能用 Pages**（`GET /pages` 返回 404 →
  `Get Pages site failed ... HttpError: Not Found`）。要上线必须让仓库转 **Public**，
  或升级 Pro，或改用 Vercel / Netlify / Cloudflare Pages。
- 转 Public 前先处理 `.workbuddy/` 的跟踪问题，否则项目笔记会全网可见。
- action 已全部升到 node24 版本（checkout v5 / setup-node v6 / configure-pages v6 /
  upload-pages-artifact v5 / deploy-pages v5），构建 node 用 22。
  改 workflow 后**用系统 Python 校验 YAML**（托管版没装 PyYAML）：
  `E:/DevWorkspace/DevTools/Languages/Python/python.exe`。

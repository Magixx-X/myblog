# UI 设计系统

本站的视觉规范。**改样式前先看这里** —— 大部分「怎么调都不对」的问题，根源是绕过了令牌直接写死数值。

---

## 设计令牌

全部定义在 `src/styles/base.css` 的 `:root`。**组件里不要写死 hex 和 px 间距**，一律引用变量。

### 颜色（语义命名，不按色相命名）

| 令牌 | 用途 |
| --- | --- |
| `--bg` / `--bg-soft` / `--bg-elev` / `--bg-elev-2` / `--bg-hover` | 表面层级，从底到顶依次变亮（暗色）/ 变暗（亮色） |
| `--border` / `--border-soft` / `--border-strong` | 描边三级：常规 / 更弱（表格内线）/ 更强调（hover） |
| `--text` / `--text-dim` / `--text-mute` | 正文 / 次要 / 最弱。三级足够，不要再加 |
| `--accent` / `--accent-hover` / `--accent-ink` | 主色及其 hover、主色底上的文字色 |
| `--accent-soft` / `--accent-softer` / `--accent-line` / `--accent-glow` | 主色半透明四档：底纹 / 极淡底纹 / 描边 / 光晕 |
| `--violet` | 与主色搭配做渐变，仅用于装饰 |
| `--warn` `--danger` `--ok` + `-soft` | 语义色，各带一个半透明底 |

**深度用描边 + 表面提亮表达，不堆阴影。** 暗色下重阴影看起来是脏的。

### 间距

4px 基数：`--sp-1` 到 `--sp-20`（4/8/12/16/20/24/32/40/48/64/80）。

### 圆角

`--radius-xs` 4px（行内代码、小徽标）· `--radius-sm` 7px（按钮、输入框）· `--radius` 12px（卡片、代码块）· `--radius-lg` 18px（大头像、个人卡）· `--radius-pill` 胶囊。

### 动效

`--ease`（统一缓动）· `--t-fast` 0.14s（hover 变色）· `--t` 0.2s（常规）· `--t-slow` 0.4s（进度条填充）。

**过渡只写 `transform` / `opacity` / `background-color` / `border-color` / `color`。** 不要动画 `height` / `width` / `margin`（触发 reflow）。

---

## 版式

- 正文 17px / 行高 1.85，阅读宽度 720px（`--readw`），每行约 38–42 个汉字。
- 标题用 `clamp()` 做流体缩放，不写死 px 断点。
- 标题 `font-weight: 650`，`letter-spacing: -0.012em`（中文标题收紧一点更精神）。
- 正文段落 `text-wrap: pretty`，标题 `text-wrap: balance`（避免末行孤字）。
- 代码一律 `--mono`，数字统一 `font-variant-numeric: tabular-nums`。

---

## 组件约定

- `.card` 是基础卡面；需要 hover 反馈的加 `.card--interactive`（描边提亮 + 上浮 2px + 阴影）。
- `.tag-pill` / `.btn` / `.widget` / `.page-head` / `.empty` / `.kv` / `.more` 定义在 `base.css`，全站复用。
- `.toc`（目录）定义在 `markdown.css`，因为和正文标题结构相关。
- 焦点环走全局 `:focus-visible`（`--focus-ring`），组件里**不要**再写 `outline`。

---

## 无障碍（WCAG AA）

已落实的项：

- **对比度**：正文与背景 ≥ 4.5:1；`--text-mute` 只用于辅助信息（仍 ≥ 4.5:1）。
- **键盘可达**：所有交互元素可 Tab 到；`App.vue` 顶部有「跳到主要内容」跳转链接。
- **焦点可见**：统一 `:focus-visible` 焦点环（双层，深浅背景下都看得清）。
- **触摸目标**：按钮最小高 36px，移动端导航项 44px。
- **语义化**：面包屑/导航用 `<nav aria-label>`；分页按钮带 `aria-current="page"`；图标全部 `aria-hidden`（文字已表意）；搜索面板是 `role="dialog" aria-modal` 且 Tab 焦点锁在面板内。
- **减少动效**：`prefers-reduced-motion: reduce` 时全局降为 0.01ms。
- **打印**：`@media print` 隐藏导航/侧栏/页脚，只留正文。

改动 UI 时如果新增了交互元素，**顺带补 `aria-label` 和键盘路径**。

---

## 主题

- 暗色是默认值（`:root`），亮色在 `html[data-theme='light']` 只覆盖颜色相关令牌，尺寸/间距/动效自动继承。
- 主题在 `index.html` 有一段**内联脚本**，在首屏渲染前就设好 `data-theme`，避免暗色用户看到闪白。改主题逻辑时要同步改这里和 `SiteHeader.vue`。
- 用户没手动选过时跟随系统偏好，且监听系统切换（`prefers-color-scheme`）。

---

## 响应式断点

| 断点 | 变化 |
| --- | --- |
| > 1000px | 主内容 + 侧栏双列 |
| ≤ 1000px | 收成单列，侧栏变网格排在正文之前（文章页目录优先） |
| ≤ 880px | 顶部导航收起为汉堡菜单 |
| ≤ 640px | 容器内边距 16px；代码块通栏；首页提交按钮只留图标 |
| ≤ 560px | 上下篇导航改单列 |

---

## 校验流程

改完 UI 必须跑：

```bash
npm run verify        # 数据层
npm run smoke         # 渲染层 + 客户端路由跳转（43 项）
```

视觉核对：

```bash
npm run build && npm run preview
npm run shot          # 常规页面 → screenshots-new/
npm run shot:theme    # 暗/亮 × 桌面/窄屏 → screenshots-theme/
npm run shot:states   # 搜索面板、移动端菜单等交互态 → screenshots-states/
```

**冒烟测试里 [10] 那组客户端跳转断言不能省。** 只做整页加载会漏掉整类 bug：
历史上「从文章页返回任何页面都空白」的事故，35 项冒烟全绿却没抓到。

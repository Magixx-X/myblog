---
title: 前端性能优化的顺序问题：先测量，再动手
date: 2026-08-15
category: 前端
tags: [性能优化, 调试, JavaScript]
summary: 性能优化最大的浪费不是用错了方法，而是优化了不重要的那 5%。谈谈怎么找到真正的瓶颈。
---

## 一个反直觉的事实

绝大多数前端性能问题，**不是由你知道的那些原因造成的**。

人们凭直觉优化的东西——过长的 CSS 选择器、`for` 循环里的变量声明、没用箭头函数——对实际性能的影响通常在测量误差范围内。

真正拖慢页面的往往是：

- 一个同步布局抖动（layout thrashing）循环
- 一张没压缩的 3MB 主图
- 一个在渲染路径上重复计算的全量数组遍历
- 一次宽泛的 `import * as _ from 'lodash'`

前三个需要**测量**才能发现，第四个需要**看产物**才能发现。

## 第一步永远是一致的：打开 Performance 面板

不要猜。录一段。

```
DevTools → Performance → Record → 操作页面 → Stop
```

然后只看三件事：

1. **火焰图最宽的那一条是什么** —— 那不是"优化点"，那是"罪魁祸首"
2. **长任务（红色三角）在哪** —— 超过 50ms 的任务会阻塞交互
3. **帧率有没有掉到 60fps 以下** —— 掉了才有"卡"的主观感受

我见过太多次：有人花两天把一个 `map` 换成 `forEach`，性能提升 0.3%，而火焰图顶端那条 800ms 的 `JSON.parse` 一直没人看。

> 没有测量的优化，本质上是重构，不是优化。

## 第二步：分清三类瓶颈

性能问题可以粗暴地分成三类，处理手段完全不同：

### CPU 瓶颈

火焰图上某段 JS 特别宽。表现是**操作时卡顿**，页面静止时正常。

处理顺序：

1. 能不能**不执行**？（缓存、memo、虚拟列表只渲染可见项）
2. 能不能**少执行**？（批量、防抖、减少循环层数）
3. 能不能**快点执行**？（换算法、减少对象分配）

第 1 条收益往往比第 3 条大一个数量级。

一个典型例子是搜索。朴素实现每次输入都全量遍历：

```js
// 每次按键都跑 10000 次字符串比较
watch(keyword, (q) => {
  results.value = allItems.filter((it) => it.text.includes(q))
})
```

改成"先降级再过滤"，成本立刻掉一个数量级：

```js
// 预建索引，搜索只在小集合里做
const index = allItems.map((it) => ({ id: it.id, lower: it.text.toLowerCase() }))

watch(
  keyword,
  debounce((q) => {
    const needle = q.trim().toLowerCase()
    if (!needle) { results.value = []; return }
    results.value = index
      .filter((it) => it.lower.includes(needle))
      .slice(0, 50)          // 只取前 50 条
  }, 150)
)
```

两个改动：**debounce** 把 20 次触发压成 1 次，**slice** 限制了后续渲染量。

### I/O 瓶颈

网络请求、图片解码、字体加载。表现是**空白时间长**，但页面一旦出来就很流畅。

这类问题靠 DevTools 的 Network 面板和 Lighthouse 看：

- 首屏关键资源有多少个？能不能合并/预加载？
- 图片有没有用 `srcset` 和现代格式？
- 有没有被 `render-blocking` 的资源拖住？

```html
<!-- 让浏览器自己选尺寸，别给手机发桌面图 -->
<img
  src="photo-800.webp"
  srcset="photo-400.webp 400w, photo-800.webp 800w, photo-1600.webp 1600w"
  sizes="(max-width: 600px) 100vw, 800px"
  loading="lazy"
  decoding="async"
  width="1600"
  height="900"
  alt="示例"
/>
```

注意 `width` / `height` 属性——它们让浏览器在图片下载完成前就能算出占位高度，**避免布局偏移（CLS）**。这个的体验收益比压缩图片本身还明显。

### 渲染瓶颈

DOM 数量过多、频繁回流、复杂的合成层。表现是**滚动时掉帧**。

```js
// ❌ 每次修改都触发一次样式计算 + 布局
for (const el of items) {
  el.style.width = el.offsetWidth + 10 + 'px'
}

// ✅ 先读完，再统一写
const widths = items.map((el) => el.offsetWidth)
items.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px'
})
```

这叫做**读写分离**。混着读写会让浏览器反复强制同步布局（forced synchronous layout），火焰图上会看到连续的紫色 `Layout`。

## 第三步：看产物，不只看源码

源码里的 `import { debounce } from 'lodash-es'` 看起来没问题，但如果构建工具没做 tree-shaking，产物里就是整个 lodash。

```bash
npx vite-bundle-visualizer
```

这张图会告诉你**每个模块占了多少体积**。常见发现：

- 一个只在设置页用到的编辑器库，被打进了首屏 chunk
- `moment.js` 带着几百个 locale 文件
- 图标库全量引入

对应的解法是路由级懒加载：

```js
const routes = [
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/editor', component: () => import('../views/EditorView.vue') }
]
```

`import()` 动态导入会让 Vite 自动切成独立 chunk，只在真正访问时下载。

## 第四步：建立基线，防止回退

优化过一次的指标会**悄悄退回去**——新加一个依赖，或者某次改动引入了全量渲染。

所以要把指标固化成检查项：

```json
{
  "scripts": {
    "size": "node scripts/check-size.js",
    "ci": "npm run build && npm run size"
  }
}
```

`check-size.js` 读 `dist/assets/*.js` 的总大小，超过阈值就 `process.exit(1)`。放进 CI 之后，任何让体积暴涨的 PR 都过不去。

同理，Lighthouse CI 可以把性能分数做成门禁。

## 一份可执行的清单

按收益/成本排序：

1. **测量**。打开 Performance 录一段，找到最宽的火柴条
2. **修最大的那个**。一次只改一个，改完再测
3. **图片**。压缩 + 现代格式 + `srcset` + 显式宽高
4. **路由懒加载**。把非首屏代码切出去
5. **减少不必要的响应式**。大数组用 `shallowRef`，静态数据用 `Object.freeze`
6. **长列表虚拟化**。超过 200 项就该考虑
7. **防抖与节流**。所有绑定到 `input` / `scroll` / `resize` 的回调
8. **产物分析**。砍掉用不上的依赖

## 最后

性能优化最贵的成本不是工时，是**复杂度**。每一个缓存、每一次手动 memo、每一层虚拟化，都在给后来的人增加理解负担。

所以顺序永远是：**先证明它慢，再证明你改的这个地方慢，最后才动手**。

跳过前两步的话，你做的可能不是优化。

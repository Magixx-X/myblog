<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getPostBySlug, renderPost, getNeighbors, getRelated, siteStats } from '../content/blog'
import PostCard from '../components/PostCard.vue'

const route = useRoute()

const post = computed(() => getPostBySlug(route.params.slug))

/* ---------- 正文 HTML ---------- */
const html = computed(() => (post.value ? renderPost(post.value) : ''))

/* ---------- 侧栏 / 顶部状态 ---------- */
const progress = ref(0)
const activeId = ref('')
const copied = ref(false)
const articleEl = ref(null)
const tocEl = ref(null)

/** 从渲染后的 DOM 里提取 h2 / h3 生成目录 */
const toc = ref([])

function buildToc() {
  if (!articleEl.value) {
    toc.value = []
    return
  }
  const nodes = articleEl.value.querySelectorAll('h2[id], h3[id]')
  toc.value = Array.from(nodes).map((el) => ({
    id: el.id,
    text: el.textContent.replace('#', '').trim(),
    level: el.tagName === 'H2' ? 2 : 3
  }))
}

/** 给每个锚点标题补一个可点击的 # 符号 */
function decorateHeadings() {
  if (!articleEl.value) return
  articleEl.value.querySelectorAll('h2[id], h3[id]').forEach((el) => {
    if (el.querySelector('.anchor-link')) return
    const a = document.createElement('a')
    a.className = 'anchor-link'
    a.href = `#${el.id}`
    a.textContent = '#'
    a.setAttribute('aria-hidden', 'true')
    a.setAttribute('tabindex', '-1')
    el.prepend(a)
  })
}

/** 给每个代码块加语言角标 + 复制按钮 */
function decorateCodeBlocks() {
  if (!articleEl.value) return
  articleEl.value.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement
    const m = code.className.match(/language-(\w+)/)
    if (m) pre.setAttribute('data-lang', m[1])

    if (pre.querySelector('.copy-code')) return
    const btn = document.createElement('button')
    btn.className = 'copy-code'
    btn.type = 'button'
    btn.setAttribute('aria-label', '复制代码')
    btn.textContent = '复制'
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent)
        btn.textContent = '已复制'
        setTimeout(() => (btn.textContent = '复制'), 1600)
      } catch (_) {
        btn.textContent = '复制失败'
        setTimeout(() => (btn.textContent = '复制'), 1600)
      }
    })
    pre.appendChild(btn)
  })
}

/* ---------- 阅读进度 & 当前章节高亮 ---------- */
function onScroll() {
  const doc = document.documentElement
  const total = doc.scrollHeight - doc.clientHeight
  progress.value = total > 0 ? Math.min(100, (doc.scrollTop / total) * 100) : 0

  if (!toc.value.length) return
  const offset = 120
  let current = ''
  for (const item of toc.value) {
    const el = document.getElementById(item.id)
    if (el && el.getBoundingClientRect().top <= offset) current = item.id
  }
  activeId.value = current
  scrollTocIntoView()
}

/** 目录里把当前项滚进可视区，长文目录也能跟上 */
function scrollTocIntoView() {
  const box = tocEl.value
  if (!box || !activeId.value) return
  const el = box.querySelector('a.active')
  if (!el) return
  const boxRect = box.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  if (elRect.top < boxRect.top || elRect.bottom > boxRect.bottom) {
    box.scrollTop += elRect.top - boxRect.top - boxRect.height / 2 + elRect.height / 2
  }
}

const neighbors = computed(() =>
  post.value ? getNeighbors(post.value.slug) : { prev: null, next: null }
)
const related = computed(() => (post.value ? getRelated(post.value.slug, 3) : []))

async function setup() {
  await nextTick()
  buildToc()
  decorateHeadings()
  decorateCodeBlocks()
  onScroll()
}

watch(() => route.params.slug, setup)
onMounted(() => {
  setup()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

watch(post, (p) => {
  document.title = p ? `${p.title} · 我的博客` : '文章不存在 · 我的博客'
})

/** 这篇文章的元信息串（日期 · 时长 · 字数） */
const indexLabel = computed(() => {
  if (!post.value) return ''
  return `${post.value.date} · ${post.value.minutes} 分钟读完 · 约 ${post.value.chars.toLocaleString()} 字`
})

async function copyPageLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => (copied.value = false), 1800)
  } catch (_) {
    /* noop */
  }
}
</script>

<template>
  <!-- 阅读进度条 -->
  <div class="progress" :style="{ width: progress + '%' }" aria-hidden="true"></div>

  <div v-if="post" class="container">
    <div class="layout">
      <!-- 正文 -->
      <article class="article">
        <header class="head">
          <nav class="breadcrumb" aria-label="面包屑">
            <router-link to="/">首页</router-link>
            <span aria-hidden="true">/</span>
            <router-link to="/categories">{{ post.category }}</router-link>
          </nav>

          <h1 class="title">{{ post.title }}</h1>

          <div class="meta">
            <span class="pin" v-if="post.pinned">置顶</span>
            <time :datetime="post.date">{{ post.dateText || post.date }}</time>
            <span class="dot" aria-hidden="true">·</span>
            <span>{{ post.minutes }} 分钟</span>
            <span class="dot" aria-hidden="true">·</span>
            <span>{{ post.chars.toLocaleString() }} 字</span>
            <button class="copy-link" :aria-live="'polite'" @click="copyPageLink">
              <svg v-if="!copied" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
              </svg>
              <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
                <path d="m4 12 5.5 5.5L20 7" />
              </svg>
              {{ copied ? '链接已复制' : '复制链接' }}
            </button>
          </div>

          <div class="tags">
            <router-link
              v-for="t in post.tags"
              :key="t"
              :to="`/tags/${encodeURIComponent(t)}`"
              class="tag-pill"
            >
              {{ t }}
            </router-link>
          </div>
        </header>

        <!-- Markdown 渲染结果 -->
        <div ref="articleEl" class="markdown-body" v-html="html"></div>

        <!-- 声明 -->
        <div class="foot-note">
          <div class="fn-row">
            <span class="fn-label">版权</span>
            <span>
              本文由 {{ post.author || '本站作者' }} 原创，采用
              <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a>
              许可协议，转载请注明出处。
            </span>
          </div>
          <div class="fn-row">
            <span class="fn-label">更新</span>
            <span>最后编辑于 <time :datetime="post.date">{{ post.date }}</time></span>
          </div>
        </div>

        <!-- 上一篇 / 下一篇 -->
        <nav class="neighbors" aria-label="相邻文章">
          <router-link
            v-if="neighbors.prev"
            :to="`/posts/${neighbors.prev.slug}`"
            class="nb card card--interactive"
          >
            <span class="nb-dir">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
              上一篇
            </span>
            <span class="nb-title">{{ neighbors.prev.title }}</span>
          </router-link>
          <div v-else class="nb card disabled">
            <span class="nb-dir">上一篇</span>
            <span class="nb-title">已经是最新一篇</span>
          </div>

          <router-link
            v-if="neighbors.next"
            :to="`/posts/${neighbors.next.slug}`"
            class="nb card card--interactive right"
          >
            <span class="nb-dir">
              下一篇
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
            <span class="nb-title">{{ neighbors.next.title }}</span>
          </router-link>
          <div v-else class="nb card right disabled">
            <span class="nb-dir">下一篇</span>
            <span class="nb-title">已经是最早一篇</span>
          </div>
        </nav>

        <!-- 相关文章 -->
        <section v-if="related.length" class="related">
          <div class="section-head">
            <h2>相关文章</h2>
            <span class="sub">同分类或标签相近</span>
          </div>
          <div class="related-list">
            <PostCard v-for="p in related" :key="p.slug" :post="p" />
          </div>
        </section>
      </article>

      <!-- 侧栏：目录 + 统计 -->
      <aside class="side" aria-label="文章侧栏">
        <div v-if="toc.length" class="widget card toc-widget">
          <div class="w-title">目录</div>
          <nav ref="tocEl" class="toc" aria-label="文章目录">
            <a
              v-for="item in toc"
              :key="item.id"
              :href="`#${item.id}`"
              :class="[item.level === 3 ? 'lv3' : '', { active: activeId === item.id }]"
              :aria-current="activeId === item.id ? 'location' : undefined"
            >
              {{ item.text }}
            </a>
          </nav>
        </div>

        <div class="widget card">
          <div class="w-title">这篇讲了什么</div>
          <p class="abs">{{ post.summary }}</p>
          <div class="kv"><span>分类</span><b>{{ post.category }}</b></div>
          <div class="kv"><span>字数</span><b>{{ post.chars.toLocaleString() }}</b></div>
          <div class="kv"><span>阅读时长</span><b>{{ post.minutes }} 分钟</b></div>
        </div>

        <div class="widget card">
          <div class="w-title">全站</div>
          <div class="kv"><span>文章</span><b>{{ siteStats.total }}</b></div>
          <div class="kv"><span>标签</span><b>{{ siteStats.tags }}</b></div>
          <router-link to="/archive" class="more">浏览归档 →</router-link>
        </div>
      </aside>
    </div>
  </div>

  <!-- 文章不存在 -->
  <div v-else class="container">
    <div class="empty">
      <span class="big" aria-hidden="true">📄</span>
      <p>找不到这篇文章，它可能被重命名或删除了</p>
      <router-link to="/" class="btn">回到首页</router-link>
    </div>
  </div>
</template>

<style scoped>
.progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--accent), var(--violet));
  z-index: 60;
  transition: width 0.1s linear;
  box-shadow: 0 0 8px var(--accent-glow);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--sidew);
  gap: var(--sp-8);
  align-items: start;
}

.article {
  min-width: 0;
  max-width: var(--readw);
}

/* ---------- 头部 ---------- */
.head {
  padding-bottom: var(--sp-5);
  margin-bottom: var(--sp-8);
  position: relative;
}

/* 标题与正文之间用一道渐变分隔线收口 */
.head::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--accent-line), var(--border) 40%, transparent);
}

.breadcrumb {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
  font-size: 13px;
  color: var(--text-mute);
  margin-bottom: var(--sp-4);
}

.breadcrumb a {
  color: var(--text-mute);
  transition: color var(--t-fast) var(--ease);
}

.breadcrumb a:hover {
  color: var(--accent);
  text-decoration: none;
}

.title {
  margin: 0 0 var(--sp-4);
  font-size: clamp(26px, 3.6vw, 33px);
  line-height: 1.32;
  letter-spacing: -0.025em;
}

.meta {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-mute);
  margin-bottom: var(--sp-4);
}

.pin {
  padding: 1px 8px;
  border-radius: var(--radius-xs);
  background: var(--warn-soft);
  color: var(--warn);
  font-weight: 650;
  font-size: 11.5px;
}

.dot {
  opacity: 0.5;
}

.copy-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-mute);
  font-size: 12.5px;
  padding: 4px 11px;
  border-radius: var(--radius-pill);
  transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease),
    background-color var(--t-fast) var(--ease);
}

.copy-link:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  background: var(--accent-softer);
}

.tags {
  display: flex;
  gap: var(--sp-1) var(--sp-2);
  flex-wrap: wrap;
}

/* ---------- 脚注 ---------- */
.foot-note {
  margin-top: var(--sp-12);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--radius);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-left: 3px solid var(--border-strong);
  font-size: 13px;
  color: var(--text-dim);
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.fn-row {
  display: flex;
  gap: var(--sp-3);
  line-height: 1.7;
}

.fn-label {
  flex: 0 0 34px;
  color: var(--text-mute);
  font-weight: 650;
  letter-spacing: 0.02em;
}

/* ---------- 上下篇 ---------- */
.neighbors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3);
  margin-top: var(--sp-8);
}

.nb {
  padding: var(--sp-4) var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  text-decoration: none;
  min-height: 76px;
}

.nb:not(.disabled):hover {
  text-decoration: none;
}

.nb.right {
  text-align: right;
}

.nb.disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.nb-dir {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-mute);
  font-weight: 550;
}

.nb.right .nb-dir {
  justify-content: flex-end;
}

.nb-title {
  font-size: 14.5px;
  font-weight: 550;
  color: var(--text);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---------- 相关文章 ---------- */
.related {
  margin-top: var(--sp-12);
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* ---------- 侧栏 ---------- */
.side {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  position: sticky;
  top: calc(var(--header-h) + var(--sp-6));
}

.toc-widget {
  max-height: calc(100vh - 180px);
  display: flex;
  flex-direction: column;
}

.abs {
  margin: 0 0 var(--sp-3);
  font-size: 13px;
  line-height: 1.72;
  color: var(--text-dim);
}

/* ---------- 响应式 ---------- */
@media (max-width: 1000px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .article {
    max-width: none;
  }

  .side {
    position: static;
    order: -1;
  }

  .toc-widget {
    max-height: none;
  }
}

@media (max-width: 560px) {
  .neighbors {
    grid-template-columns: 1fr;
  }

  .nb.right {
    text-align: left;
  }

  .nb.right .nb-dir {
    justify-content: flex-start;
  }

  .meta {
    font-size: 12.5px;
  }

  .copy-link {
    margin-left: 0;
  }

  .fn-row {
    flex-direction: column;
    gap: 2px;
  }
}
</style>

<style>
/* 代码块的复制按钮由 DOM 动态插入，不能用 scoped */
.copy-code {
  position: absolute;
  top: 8px;
  right: 10px;
  padding: 4px 10px;
  font-size: 11.5px;
  font-family: var(--mono);
  color: var(--text-mute);
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity var(--t-fast) var(--ease), transform var(--t-fast) var(--ease),
    color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
  pointer-events: none;
}

/* hover 代码块出现；键盘 focus 到按钮时也要可见 */
.markdown-body pre:hover .copy-code,
.copy-code:focus-visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.copy-code:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}
</style>

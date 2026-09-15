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
  const offset = 110
  let current = ''
  for (const item of toc.value) {
    const el = document.getElementById(item.id)
    if (el && el.getBoundingClientRect().top <= offset) current = item.id
  }
  activeId.value = current
}

const neighbors = computed(() => (post.value ? getNeighbors(post.value.slug) : { prev: null, next: null }))
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

/** 该文章在全部文章里的序号（用于上一篇/下一篇的语义） */
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
  <div class="progress" :style="{ width: progress + '%' }"></div>

  <div v-if="post" class="container">
    <div class="layout">
      <!-- 正文 -->
      <article class="article">
        <header class="head">
          <div class="breadcrumb">
            <router-link to="/">首页</router-link>
            <span>/</span>
            <router-link to="/categories">{{ post.category }}</router-link>
          </div>

          <h1 class="title">{{ post.title }}</h1>

          <div class="meta">
            <span class="pin" v-if="post.pinned">置顶</span>
            <time :datetime="post.date">{{ post.dateText || post.date }}</time>
            <span class="dot">·</span>
            <span>{{ post.minutes }} 分钟</span>
            <span class="dot">·</span>
            <span>{{ post.chars.toLocaleString() }} 字</span>
            <button class="copy-link" @click="copyPageLink">
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
            <span>本文由 {{ post.author || '本站作者' }} 原创，采用 <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noopener">CC BY-NC-SA 4.0</a> 许可协议，转载请注明出处。</span>
          </div>
          <div class="fn-row">
            <span class="fn-label">更新</span>
            <span>最后编辑于 <time :datetime="post.date">{{ post.date }}</time></span>
          </div>
        </div>

        <!-- 上一篇 / 下一篇 -->
        <nav class="neighbors">
          <router-link
            v-if="neighbors.prev"
            :to="`/posts/${neighbors.prev.slug}`"
            class="nb card"
          >
            <span class="nb-dir">← 上一篇</span>
            <span class="nb-title">{{ neighbors.prev.title }}</span>
          </router-link>
          <div v-else class="nb card disabled">
            <span class="nb-dir">← 上一篇</span>
            <span class="nb-title">已经是最新一篇</span>
          </div>

          <router-link
            v-if="neighbors.next"
            :to="`/posts/${neighbors.next.slug}`"
            class="nb card right"
          >
            <span class="nb-dir">下一篇 →</span>
            <span class="nb-title">{{ neighbors.next.title }}</span>
          </router-link>
          <div v-else class="nb card right disabled">
            <span class="nb-dir">下一篇 →</span>
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
      <aside class="side">
        <div v-if="toc.length" class="widget card toc-widget">
          <div class="w-title">目录</div>
          <nav class="toc">
            <a
              v-for="item in toc"
              :key="item.id"
              :href="`#${item.id}`"
              :class="[item.level === 3 ? 'lv3' : '', { active: activeId === item.id }]"
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
      <span class="big">📄</span>
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
  background: linear-gradient(90deg, var(--accent), #a371f7);
  z-index: 60;
  transition: width 0.1s linear;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 268px;
  gap: 34px;
  align-items: start;
}

.article {
  min-width: 0;
}

/* 头部 */
.head {
  padding-bottom: 22px;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--border);
}

.breadcrumb {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
  color: var(--text-mute);
  margin-bottom: 14px;
}

.breadcrumb a {
  color: var(--text-mute);
}

.breadcrumb a:hover {
  color: var(--accent);
  text-decoration: none;
}

.title {
  margin: 0 0 14px;
  font-size: 31px;
  line-height: 1.35;
  letter-spacing: -0.02em;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--text-mute);
  margin-bottom: 15px;
}

.pin {
  padding: 1px 8px;
  border-radius: 4px;
  background: rgba(210, 153, 34, 0.16);
  color: var(--warn);
  font-weight: 600;
}

.dot {
  opacity: 0.5;
}

.copy-link {
  margin-left: auto;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-mute);
  font-size: 12.5px;
  padding: 3px 10px;
  border-radius: 100px;
  transition: color 0.15s, border-color 0.15s;
}

.copy-link:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}

.tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

/* 脚注 */
.foot-note {
  margin-top: 44px;
  padding: 16px 18px;
  border-radius: var(--radius);
  background: var(--bg-soft);
  border: 1px dashed var(--border);
  font-size: 13px;
  color: var(--text-dim);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fn-row {
  display: flex;
  gap: 12px;
}

.fn-label {
  flex: 0 0 36px;
  color: var(--text-mute);
  font-weight: 600;
}

/* 上下篇 */
.neighbors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 26px;
}

.nb {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-decoration: none;
}

.nb:not(.disabled):hover {
  border-color: var(--accent-line);
  text-decoration: none;
}

.nb.right {
  text-align: right;
}

.nb.disabled {
  opacity: 0.45;
}

.nb-dir {
  font-size: 12px;
  color: var(--text-mute);
}

.nb-title {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 相关文章 */
.related {
  margin-top: 46px;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 侧栏 */
.side {
  display: flex;
  flex-direction: column;
  gap: 18px;
  position: sticky;
  top: calc(var(--header-h) + 24px);
}

.widget {
  padding: 15px 17px;
}

.w-title {
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  margin-bottom: 12px;
}

.toc-widget {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

.abs {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-dim);
}

.kv {
  display: flex;
  justify-content: space-between;
  font-size: 13.5px;
  color: var(--text-mute);
  padding: 3px 0;
}

.kv b {
  color: var(--text);
  font-weight: 500;
}

.more {
  display: inline-block;
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-mute);
}

.more:hover {
  color: var(--accent);
  text-decoration: none;
}

@media (max-width: 940px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .side {
    position: static;
    order: -1;
  }

  .toc-widget {
    max-height: 240px;
  }

  .title {
    font-size: 25px;
  }
}

@media (max-width: 560px) {
  .neighbors {
    grid-template-columns: 1fr;
  }

  .nb.right {
    text-align: left;
  }
}
</style>

<style>
/* 代码块的复制按钮由 DOM 动态插入，不能用 scoped */
.copy-code {
  position: absolute;
  top: 7px;
  right: 8px;
  padding: 3px 9px;
  font-size: 11.5px;
  font-family: var(--mono);
  color: var(--text-mute);
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: 5px;
  opacity: 0;
  transition: opacity 0.15s, color 0.15s;
}

.markdown-body pre:hover .copy-code {
  opacity: 1;
}

.copy-code:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}
</style>

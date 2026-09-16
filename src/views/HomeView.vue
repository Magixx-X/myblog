<script setup>
import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { posts, searchPosts, makeExcerpt, tagList, categoryList, siteStats } from '../content/blog'
import { site, PAGE_SIZE } from '../config'
import PostCard from '../components/PostCard.vue'
import Pagination from '../components/Pagination.vue'

const route = useRoute()
const router = useRouter()

/* ---------- 搜索状态（与 URL 的 ?q= 同步，可分享可后退） ---------- */
const activeKeyword = computed(() => String(route.query.q || '').trim())
const isSearching = computed(() => activeKeyword.value.length > 0)

const searchResults = computed(() =>
  isSearching.value ? searchPosts(activeKeyword.value) : []
)

const localKeyword = ref(activeKeyword.value)
const searchInput = ref(null)

watch(activeKeyword, (v) => {
  localKeyword.value = v
})

function submit() {
  const q = localKeyword.value.trim()
  router.push({ name: 'home', query: q ? { q } : {} })
}

function clearSearch() {
  localKeyword.value = ''
  router.push({ name: 'home' })
}

/** 空格 / 斜杠 快速聚焦搜索框（输入框里时不抢焦点） */
function onSlash(e) {
  if (e.key !== '/' && e.key !== ' ') return
  const t = e.target
  if (t instanceof HTMLElement && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName))) return
  e.preventDefault()
  searchInput.value?.focus()
}

onMounted(() => {
  document.title = site.title
  window.addEventListener('keydown', onSlash)
})

onUnmounted(() => window.removeEventListener('keydown', onSlash))

/* ---------- 分页 ---------- */
const currentPage = ref(1)

// 切换搜索条件时回到第一页
watch(activeKeyword, () => (currentPage.value = 1))

const sourceList = computed(() => (isSearching.value ? searchResults.value : posts))

const pagedPosts = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return sourceList.value.slice(start, start + PAGE_SIZE)
})

function onPageChange(p) {
  currentPage.value = p
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/* ---------- 侧栏数据 ---------- */
const hotTags = computed(() => tagList.slice(0, 14))
const topCategories = computed(() => categoryList.slice(0, 6))
const latest = computed(() => posts.slice(0, 5))

/** 分类占比条：以最大分类为 100% */
const maxCatCount = computed(() =>
  Math.max(1, ...topCategories.value.map((c) => c.count))
)

/** 从文章正文里挖出搜索结果上下文片段 */
function excerptOf(post) {
  return makeExcerpt(post, activeKeyword.value)
}

/** 高亮结果区折叠：默认只展示前 5 条，可展开 */
const hitsExpanded = ref(false)
watch(activeKeyword, () => (hitsExpanded.value = false))
const visibleHits = computed(() =>
  hitsExpanded.value ? searchResults.value : searchResults.value.slice(0, 5)
)
</script>

<template>
  <div class="container">
    <!-- 顶部 Hero -->
    <section v-if="!isSearching" class="hero">
      <div class="hero-text">
        <h1>{{ site.title }}</h1>
        <p class="hero-sub">{{ site.description }}</p>
        <div class="hero-stats">
          <span><b>{{ siteStats.total }}</b> 篇文章</span>
          <span class="sep">·</span>
          <span><b>{{ siteStats.tags }}</b> 个标签</span>
          <span class="sep">·</span>
          <span><b>{{ siteStats.chars.toLocaleString() }}</b> 字</span>
        </div>
      </div>
      <div class="hero-glow" aria-hidden="true"></div>
    </section>

    <!-- 搜索栏 -->
    <section class="searchbar">
      <form @submit.prevent="submit" role="search">
        <span class="sb-icon" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          ref="searchInput"
          v-model="localKeyword"
          type="search"
          aria-label="搜索文章"
          placeholder="搜索文章…（支持标题、标签、正文全文匹配）"
        />
        <button v-if="localKeyword" type="button" class="sb-clear" aria-label="清除关键词" @click="clearSearch">
          清除
        </button>
        <span v-else class="sb-kbd" aria-hidden="true"><kbd>/</kbd></span>
        <button type="submit" class="btn primary">搜索</button>
      </form>
    </section>

    <!-- 搜索结果提示 -->
    <div v-if="isSearching" class="result-bar" role="status">
      <span class="rb-text">
        「<b>{{ activeKeyword }}</b>」找到 <b>{{ searchResults.length }}</b> 篇文章
      </span>
      <button class="rb-clear" @click="clearSearch">返回全部文章</button>
    </div>

    <div class="layout">
      <!-- 主内容 -->
      <div class="main">
        <div v-if="pagedPosts.length" class="list">
          <PostCard v-for="p in pagedPosts" :key="p.slug" :post="p" />

          <!-- 搜索模式下展示命中上下文 -->
          <div v-if="isSearching" class="hits">
            <div class="hits-title">正文命中片段</div>
            <div v-for="p in visibleHits" :key="'h-' + p.slug" class="hit">
              <router-link :to="`/posts/${p.slug}`" class="hit-link">{{ p.title }}</router-link>
              <p class="hit-text" v-html="excerptOf(p)"></p>
            </div>
            <button
              v-if="searchResults.length > 5"
              class="hits-toggle"
              @click="hitsExpanded = !hitsExpanded"
            >
              {{ hitsExpanded ? '收起' : `展开其余 ${searchResults.length - 5} 篇` }}
            </button>
          </div>
        </div>

        <div v-else class="empty">
          <span class="big" aria-hidden="true">🔍</span>
          <p v-if="isSearching">没有匹配「{{ activeKeyword }}」的文章</p>
          <p v-else>还没有文章，去 <code>content/posts/</code> 下新建一个 <code>.md</code> 文件吧</p>
          <button v-if="isSearching" class="btn" @click="clearSearch">查看全部文章</button>
        </div>

        <Pagination
          v-if="!isSearching"
          :page="currentPage"
          :total="sourceList.length"
          :per-page="PAGE_SIZE"
          @change="onPageChange"
        />
      </div>

      <!-- 侧栏 -->
      <aside class="side" aria-label="站点侧栏">
        <div class="widget card">
          <div class="w-title">最新文章</div>
          <ul class="recent">
            <li v-for="p in latest" :key="p.slug">
              <router-link :to="`/posts/${p.slug}`">{{ p.title }}</router-link>
              <time :datetime="p.date">{{ p.date }}</time>
            </li>
          </ul>
        </div>

        <div class="widget card">
          <div class="w-title">标签</div>
          <div class="cloud">
            <router-link
              v-for="t in hotTags"
              :key="t.name"
              :to="`/tags/${encodeURIComponent(t.name)}`"
              class="tag-pill"
            >
              {{ t.name }}<span class="cnt">{{ t.count }}</span>
            </router-link>
          </div>
          <router-link to="/tags" class="more">查看全部标签 →</router-link>
        </div>

        <div class="widget card">
          <div class="w-title">分类</div>
          <ul class="cats">
            <li v-for="c in topCategories" :key="c.name">
              <router-link :to="`/categories`" class="cat-row">
                <span class="cat-name">{{ c.name }}</span>
                <span class="cat-track" aria-hidden="true">
                  <i :style="{ width: Math.max(8, (c.count / maxCatCount) * 100) + '%' }"></i>
                </span>
                <b>{{ c.count }}</b>
              </router-link>
            </li>
          </ul>
          <router-link to="/categories" class="more">全部分类 →</router-link>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ---------- Hero ---------- */
.hero {
  position: relative;
  padding: var(--sp-8) 0 var(--sp-8);
}

.hero h1 {
  margin: 0 0 var(--sp-3);
  font-size: clamp(30px, 4.4vw, 40px);
  letter-spacing: -0.03em;
  background: linear-gradient(100deg, var(--text) 30%, var(--accent) 78%, var(--violet));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  width: fit-content;
}

.hero-sub {
  margin: 0 0 var(--sp-4);
  font-size: 16px;
  color: var(--text-dim);
  max-width: 560px;
  line-height: 1.75;
}

.hero-stats {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
  font-size: 13.5px;
  color: var(--text-mute);
  flex-wrap: wrap;
}

.hero-stats b {
  color: var(--text);
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.sep {
  opacity: 0.45;
}

/* 右上角一团极淡的光，给纯色背景一点纵深 */
.hero-glow {
  position: absolute;
  top: -80px;
  right: -40px;
  width: 380px;
  height: 260px;
  pointer-events: none;
  background: radial-gradient(closest-side, var(--accent-glow), transparent 72%);
  opacity: 0.7;
  z-index: -1;
}

/* ---------- 搜索栏 ---------- */
.searchbar {
  padding: 7px 8px 7px 14px;
  margin-bottom: var(--sp-6);
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color var(--t) var(--ease), box-shadow var(--t) var(--ease);
}

.searchbar:focus-within {
  border-color: var(--accent-line);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.searchbar form {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  color: var(--text-mute);
}

.sb-icon {
  display: flex;
  flex-shrink: 0;
}

.searchbar input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 15px;
  padding: 6px 0;
}

.searchbar input::placeholder {
  color: var(--text-mute);
}

/* 干掉 Safari/Chrome 给 type=search 的原生清除按钮，用自定义的 */
.searchbar input::-webkit-search-decoration,
.searchbar input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

.sb-clear {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--text-mute);
  font-size: 13px;
  padding: 5px 9px;
  border-radius: var(--radius-xs);
  transition: color var(--t-fast) var(--ease), background-color var(--t-fast) var(--ease);
}

.sb-clear:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.sb-kbd {
  flex-shrink: 0;
  padding-right: var(--sp-2);
}

.sb-kbd kbd {
  display: inline-block;
  padding: 2px 7px;
  font-size: 11px;
  font-family: var(--mono);
  color: var(--text-mute);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
}

/* ---------- 结果提示 ---------- */
.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: 11px var(--sp-4);
  margin-bottom: var(--sp-5);
  border-radius: var(--radius);
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  font-size: 14px;
  flex-wrap: wrap;
}

.result-bar b {
  color: var(--accent);
  font-weight: 650;
}

.rb-clear {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 13.5px;
  padding: 2px 0;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.rb-clear:hover {
  color: var(--accent-hover);
}

/* ---------- 布局 ---------- */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--sidew);
  gap: var(--sp-8);
  align-items: start;
}

.list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

/* ---------- 正文命中片段 ---------- */
.hits {
  margin-top: var(--sp-2);
  padding: var(--sp-5) var(--sp-5);
  border-radius: var(--radius);
  background: var(--bg-soft);
  border: 1px solid var(--border);
}

.hits-title {
  font-size: 12px;
  font-weight: 650;
  color: var(--text-mute);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: var(--sp-3);
}

.hit {
  padding: var(--sp-3) 0;
  border-bottom: 1px solid var(--border-soft);
}

.hit:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.hit-link {
  font-size: 14px;
  font-weight: 550;
  color: var(--text);
  transition: color var(--t-fast) var(--ease);
}

.hit-link:hover {
  color: var(--accent);
}

.hit-text {
  margin: var(--sp-1) 0 0;
  font-size: 13px;
  line-height: 1.72;
  color: var(--text-mute);
}

.hits-toggle {
  margin-top: var(--sp-4);
  border: 1px solid var(--border);
  background: var(--bg-elev);
  color: var(--text-dim);
  font-size: 13px;
  padding: 6px 13px;
  border-radius: var(--radius-sm);
  transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}

.hits-toggle:hover {
  color: var(--accent);
  border-color: var(--accent-line);
}

/* ---------- 侧栏 ---------- */
.side {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  position: sticky;
  top: calc(var(--header-h) + var(--sp-6));
}

.recent {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.recent li {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.recent a {
  font-size: 14px;
  color: var(--text-dim);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color var(--t-fast) var(--ease);
}

.recent a:hover {
  color: var(--accent);
  text-decoration: none;
}

.recent time {
  font-size: 11.5px;
  color: var(--text-mute);
  font-family: var(--mono);
}

.cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1) var(--sp-2);
}

.cats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 5px 6px;
  margin: 0 -6px;
  border-radius: var(--radius-xs);
  font-size: 13.5px;
  color: var(--text-dim);
  transition: background-color var(--t-fast) var(--ease), color var(--t-fast) var(--ease);
}

.cat-row:hover {
  background: var(--bg-hover);
  color: var(--text);
  text-decoration: none;
}

.cat-name {
  flex-shrink: 0;
  max-width: 76px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 占比条 —— 比纯数字多一层视觉排序 */
.cat-track {
  flex: 1;
  min-width: 24px;
  height: 4px;
  border-radius: 100px;
  background: var(--bg-soft);
  overflow: hidden;
}

.cat-track i {
  display: block;
  height: 100%;
  border-radius: 100px;
  background: linear-gradient(90deg, var(--accent), var(--violet));
  transition: width var(--t-slow) var(--ease);
}

.cat-row b {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-mute);
  font-weight: 550;
  font-variant-numeric: tabular-nums;
  min-width: 14px;
  text-align: right;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1000px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .side {
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(248px, 1fr));
  }
}

@media (max-width: 640px) {
  .hero {
    padding: var(--sp-5) 0 var(--sp-6);
  }

  .hero-glow {
    display: none;
  }

  .searchbar {
    padding: 6px 6px 6px 12px;
  }

  .sb-kbd {
    display: none;
  }

  .searchbar form {
    gap: var(--sp-2);
  }

  .hits {
    padding: var(--sp-4);
  }
}
</style>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
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

/** 从文章正文里挖出搜索结果上下文片段 */
function excerptOf(post) {
  return makeExcerpt(post, activeKeyword.value)
}

onMounted(() => {
  document.title = site.title
})
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
    </section>

    <!-- 搜索栏 -->
    <section class="searchbar card">
      <form @submit.prevent="submit">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          v-model="localKeyword"
          type="text"
          placeholder="搜索文章…（支持标题、标签、正文全文匹配）"
        />
        <button v-if="localKeyword" type="button" class="clr" @click="clearSearch">清除</button>
        <button type="submit" class="btn primary">搜索</button>
      </form>
    </section>

    <!-- 搜索结果提示 -->
    <div v-if="isSearching" class="result-bar">
      <span>
        「<b>{{ activeKeyword }}</b>」找到 <b>{{ searchResults.length }}</b> 篇文章
      </span>
      <button class="link-btn" @click="clearSearch">返回全部文章</button>
    </div>

    <div class="layout">
      <!-- 主内容 -->
      <div class="main">
        <div v-if="pagedPosts.length" class="list">
          <PostCard v-for="p in pagedPosts" :key="p.slug" :post="p" />

          <!-- 搜索模式下展示命中上下文 -->
          <div v-if="isSearching" class="hits">
            <div class="hits-title">正文命中片段</div>
            <div v-for="p in searchResults.slice(0, 5)" :key="'h-' + p.slug" class="hit">
              <router-link :to="`/posts/${p.slug}`" class="hit-link">{{ p.title }}</router-link>
              <p class="hit-text" v-html="excerptOf(p)"></p>
            </div>
          </div>
        </div>

        <div v-else class="empty">
          <span class="big">🔍</span>
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
      <aside class="side">
        <div class="widget card">
          <div class="w-title">最新文章</div>
          <ul class="recent">
            <li v-for="p in latest" :key="p.slug">
              <router-link :to="`/posts/${p.slug}`">{{ p.title }}</router-link>
              <time>{{ p.date }}</time>
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
              <span>{{ c.name }}</span>
              <b>{{ c.count }}</b>
            </li>
          </ul>
          <router-link to="/categories" class="more">全部分类 →</router-link>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* Hero */
.hero {
  padding: 22px 0 26px;
}

.hero h1 {
  margin: 0 0 10px;
  font-size: 34px;
  letter-spacing: -0.02em;
}

.hero-sub {
  margin: 0 0 14px;
  font-size: 15.5px;
  color: var(--text-dim);
  max-width: 560px;
}

.hero-stats {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13.5px;
  color: var(--text-mute);
  flex-wrap: wrap;
}

.hero-stats b {
  color: var(--text);
  font-weight: 600;
}

.sep {
  opacity: 0.5;
}

/* 搜索栏 */
.searchbar {
  padding: 10px 12px;
  margin-bottom: 22px;
}

.searchbar form {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-mute);
}

.searchbar input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 15px;
  font-family: inherit;
}

.searchbar input::placeholder {
  color: var(--text-mute);
}

.clr {
  border: none;
  background: transparent;
  color: var(--text-mute);
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 4px;
}

.clr:hover {
  color: var(--text);
  background: var(--bg-hover);
}

/* 结果提示 */
.result-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 16px;
  margin-bottom: 18px;
  border-radius: var(--radius);
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  font-size: 14px;
  flex-wrap: wrap;
}

.result-bar b {
  color: var(--accent);
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 13.5px;
  padding: 0;
}

.link-btn:hover {
  text-decoration: underline;
}

/* 布局 */
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 292px;
  gap: 30px;
  align-items: start;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 正文命中片段 */
.hits {
  margin-top: 6px;
  padding: 18px 20px;
  border-radius: var(--radius);
  background: var(--bg-soft);
  border: 1px solid var(--border);
}

.hits-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-mute);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.hit {
  padding: 9px 0;
  border-bottom: 1px solid var(--border-soft);
}

.hit:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.hit-link {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.hit-text {
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-mute);
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
  padding: 16px 18px;
}

.w-title {
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  margin-bottom: 13px;
}

.recent {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 11px;
}

.recent li {
  display: flex;
  flex-direction: column;
  gap: 2px;
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
}

.recent a:hover {
  color: var(--accent);
  text-decoration: none;
}

.recent time {
  font-size: 12px;
  color: var(--text-mute);
  font-family: var(--mono);
}

.cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.more {
  display: inline-block;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-mute);
}

.more:hover {
  color: var(--accent);
  text-decoration: none;
}

.cats {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cats li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: var(--text-dim);
}

.cats b {
  font-size: 12px;
  color: var(--text-mute);
  background: var(--bg-soft);
  padding: 1px 8px;
  border-radius: 100px;
  font-weight: 500;
}

@media (max-width: 940px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .side {
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

@media (max-width: 560px) {
  .hero h1 {
    font-size: 27px;
  }
}
</style>

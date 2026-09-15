<script setup>
import { computed } from 'vue'
import { site } from '../config'
import { posts, tagList, categoryList, siteStats } from '../content/blog'

const firstPostYear = computed(() => {
  const dates = posts.map((p) => p.date).filter(Boolean).sort()
  return dates.length ? Number(dates[0].slice(0, 4)) : new Date().getFullYear()
})

const stack = [
  { name: 'Vue 3', note: '视图层 · Composition API' },
  { name: 'Vite 5', note: '构建 · import.meta.glob' },
  { name: 'vue-router 4', note: '路由 · History 模式' },
  { name: 'markdown-it', note: 'Markdown 渲染' },
  { name: 'highlight.js', note: '代码高亮' },
  { name: 'front-matter 解析器', note: '自研 · 浏览器端可用' },
  { name: 'Git', note: '内容版本控制' }
]

const interests = [
  { icon: '⌨️', title: '前端工程化', desc: '构建工具、性能优化、组件设计' },
  { icon: '🧩', title: '系统设计', desc: '关注边界条件与失败模式' },
  { icon: '📝', title: '技术写作', desc: '把复杂的事情说清楚' },
  { icon: '🔍', title: '调试方法论', desc: '先测量，再动手' }
]

const recent = computed(() => posts.slice(0, 4))
const hottest = computed(() => tagList.slice(0, 12))
</script>

<template>
  <div class="container">
    <div class="layout">
      <div class="main">
        <!-- 个人卡 -->
        <section class="profile card">
          <div class="avatar">{{ site.author.slice(0, 1).toUpperCase() }}</div>
          <div class="info">
            <h1>{{ site.author }}</h1>
            <p class="role">开发者 · 写作者 · {{ site.city }}</p>
            <p class="bio">
              写代码，也写人话。这里记录我在工程实践中的思考——那些踩过的坑、想通的道理，
              以及一些还没想通但值得写下来留痕的问题。
            </p>
            <div class="links">
              <a
                v-for="s in site.socials"
                :key="s.name"
                :href="s.url"
                target="_blank"
                rel="noopener"
                class="social-btn"
              >
                {{ s.name }}
              </a>
            </div>
          </div>
        </section>

        <!-- 关于本站 -->
        <section class="block">
          <h2>关于这个站</h2>
          <p>
            这是一个刻意做得简单的博客。没有数据库，没有后台，没有评论系统——
            所有文章都是 <code>content/</code> 目录下的 Markdown 文件，靠 Git 维护版本。
          </p>
          <p>
            这么设计的原因是：<strong>把文章当成源码来管理</strong>。
            写完直接 <code>git push</code> 就是发布，想撤回就 <code>git revert</code>，
            草稿用 front-matter 里的 <code>draft: true</code> 标记。
            格式不会被富文本编辑器吃掉，历史也不会被悄悄覆盖。
          </p>

          <div class="stats-row">
            <div class="stat-box">
              <b>{{ siteStats.total }}</b>
              <span>篇文章</span>
            </div>
            <div class="stat-box">
              <b>{{ siteStats.chars.toLocaleString() }}</b>
              <span>总字数</span>
            </div>
            <div class="stat-box">
              <b>{{ siteStats.tags }}</b>
              <span>个标签</span>
            </div>
            <div class="stat-box">
              <b>{{ siteStats.categories }}</b>
              <span>个分类</span>
            </div>
          </div>
        </section>

        <!-- 技术栈 -->
        <section class="block">
          <h2>技术栈</h2>
          <p class="dim">建站用到的全部依赖，一共七项：</p>
          <div class="stack">
            <div v-for="s in stack" :key="s.name" class="stack-item card">
              <span class="s-name mono">{{ s.name }}</span>
              <span class="s-note">{{ s.note }}</span>
            </div>
          </div>
        </section>

        <!-- 关注方向 -->
        <section class="block">
          <h2>关注的方向</h2>
          <div class="interests">
            <div v-for="it in interests" :key="it.title" class="interest card">
              <span class="i-icon">{{ it.icon }}</span>
              <div>
                <div class="i-title">{{ it.title }}</div>
                <div class="i-desc">{{ it.desc }}</div>
              </div>
            </div>
          </div>
        </section>

        <!-- 联系 -->
        <section class="block">
          <h2>联系我</h2>
          <p>
            有想法想聊，或者发现文章里有错误，欢迎邮件联系：
            <a :href="`mailto:${site.email}`">{{ site.email }}</a>
          </p>
          <p class="mute small">
            本站自 {{ firstPostYear }} 年开始记录，最近一次内容更新于
            {{ recent.length ? recent[0].date : '—' }}。
          </p>
        </section>
      </div>

      <!-- 侧栏 -->
      <aside class="side">
        <div class="widget card">
          <div class="w-title">最近写了什么</div>
          <ul class="recent">
            <li v-for="p in recent" :key="p.slug">
              <router-link :to="`/posts/${p.slug}`">{{ p.title }}</router-link>
              <time>{{ p.date }}</time>
            </li>
          </ul>
        </div>

        <div class="widget card">
          <div class="w-title">写得最多的标签</div>
          <div class="cloud">
            <router-link
              v-for="t in hottest"
              :key="t.name"
              :to="`/tags/${encodeURIComponent(t.name)}`"
              class="tag-pill"
            >
              {{ t.name }}<span class="cnt">{{ t.count }}</span>
            </router-link>
          </div>
        </div>

        <div class="widget card">
          <div class="w-title">站点</div>
          <div class="kv"><span>作者</span><b>{{ site.author }}</b></div>
          <div class="kv"><span>城市</span><b>{{ site.city }}</b></div>
          <div class="kv"><span>建站</span><b>{{ site.since }}</b></div>
          <div class="kv"><span>许可</span><b>CC BY-NC-SA</b></div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 32px;
  align-items: start;
}

/* 个人卡 */
.profile {
  display: flex;
  gap: 24px;
  padding: 26px 26px;
  margin-bottom: 38px;
  align-items: flex-start;
}

.avatar {
  width: 68px;
  height: 68px;
  flex-shrink: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--accent), #a371f7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27px;
  font-weight: 700;
}

.info {
  min-width: 0;
}

.info h1 {
  margin: 0 0 4px;
  font-size: 24px;
}

.role {
  margin: 0 0 12px;
  font-size: 13.5px;
  color: var(--text-mute);
}

.bio {
  margin: 0 0 16px;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--text-dim);
}

.links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.social-btn {
  font-size: 13px;
  padding: 5px 13px;
  border: 1px solid var(--border);
  border-radius: 100px;
  color: var(--text-dim);
  transition: color 0.15s, border-color 0.15s;
}

.social-btn:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  text-decoration: none;
}

/* 区块 */
.block {
  margin-bottom: 40px;
}

.block h2 {
  margin: 0 0 14px;
  font-size: 19px;
  padding-bottom: 9px;
  border-bottom: 1px solid var(--border);
}

.block p {
  margin: 0 0 13px;
  font-size: 15px;
  line-height: 1.85;
  color: var(--text-dim);
}

.block strong {
  color: var(--text);
}

.block code {
  font-family: var(--mono);
  font-size: 13px;
  padding: 1.5px 6px;
  border-radius: 4px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  color: var(--accent);
}

.small {
  font-size: 13px !important;
}

/* 数据格 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 20px;
}

.stat-box {
  padding: 14px;
  border-radius: var(--radius);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  text-align: center;
}

.stat-box b {
  display: block;
  font-size: 20px;
  color: var(--accent);
  font-weight: 650;
  margin-bottom: 3px;
}

.stat-box span {
  font-size: 12.5px;
  color: var(--text-mute);
}

/* 技术栈 */
.stack {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.stack-item {
  padding: 12px 15px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.s-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
}

.s-note {
  font-size: 12.5px;
  color: var(--text-mute);
}

/* 兴趣 */
.interests {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.interest {
  padding: 15px 16px;
  display: flex;
  gap: 13px;
  align-items: flex-start;
}

.i-icon {
  font-size: 19px;
  flex-shrink: 0;
  line-height: 1.4;
}

.i-title {
  font-size: 14.5px;
  font-weight: 600;
  margin-bottom: 3px;
}

.i-desc {
  font-size: 12.5px;
  color: var(--text-mute);
  line-height: 1.6;
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

@media (max-width: 640px) {
  .profile {
    flex-direction: column;
    gap: 16px;
    padding: 22px;
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

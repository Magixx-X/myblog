<script setup>
import { computed } from 'vue'
import { site } from '../config'
import { posts, tagList, siteStats } from '../content/blog'

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
        <section class="profile">
          <div class="avatar" aria-hidden="true">
            {{ 'B' }}
            <span class="avatar-glow"></span>
          </div>
          <div class="info">
            <h1>Bill</h1>
            <p class="role">开发者 · 写作者 · 苏州</p>
            <p class="bio">
              写代码，也写人话。这里记录我在工程实践中的思考——那些踩过的坑、想通的道理，
              以及一些还没想通但值得写下来留痕的问题。
            </p>
            <div class="links">
              <a
                v-for="s in site.socials"
                :key="s.name"
                :href="s.url"
                :target="/^https?:/.test(s.url) ? '_blank' : undefined"
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
          <ul class="stack">
            <li v-for="s in stack" :key="s.name" class="stack-item card">
              <span class="s-name mono">{{ s.name }}</span>
              <span class="s-note">{{ s.note }}</span>
            </li>
          </ul>
        </section>

        <!-- 关注方向 -->
        <section class="block">
          <h2>关注的方向</h2>
          <ul class="interests">
            <li v-for="it in interests" :key="it.title" class="interest card">
              <span class="i-icon" aria-hidden="true">{{ it.icon }}</span>
              <div>
                <div class="i-title">{{ it.title }}</div>
                <div class="i-desc">{{ it.desc }}</div>
              </div>
            </li>
          </ul>
        </section>

        <!-- 联系 -->
        <section class="block">
          <h2>联系我</h2>
          <p>
            有想法想聊，或者发现文章里有错误，欢迎邮件联系：
            <a href="mailto:bill@example.com">bill@example.com</a>
          </p>
          <p class="small">
            本站自 {{ firstPostYear }} 年开始记录，最近一次内容更新于
            {{ recent.length ? recent[0].date : '—' }}。
          </p>
        </section>
      </div>

      <!-- 侧栏 -->
      <aside class="side" aria-label="关于页侧栏">
        <div class="widget card">
          <div class="w-title">最近写了什么</div>
          <ul class="recent">
            <li v-for="p in recent" :key="p.slug">
              <router-link :to="`/posts/${p.slug}`">{{ p.title }}</router-link>
              <time :datetime="p.date">{{ p.date }}</time>
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
          <div class="kv"><span>作者</span><b>Bill</b></div>
          <div class="kv"><span>城市</span><b>苏州</b></div>
          <div class="kv"><span>建站</span><b>2024</b></div>
          <div class="kv"><span>许可</span><b>CC BY-NC-SA</b></div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--sidew);
  gap: var(--sp-8);
  align-items: start;
}

/* ---------- 个人卡：本色底 + 极淡光晕，不用白卡片 ---------- */
.profile {
  display: flex;
  gap: var(--sp-6);
  padding: var(--sp-6);
  margin-bottom: var(--sp-10);
  align-items: flex-start;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  background:
    radial-gradient(120% 140% at 0% 0%, var(--accent-softer), transparent 60%),
    var(--bg-elev);
}

.avatar {
  position: relative;
  width: 66px;
  height: 66px;
  flex-shrink: 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--accent), var(--violet));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 700;
  box-shadow: 0 8px 22px -8px var(--accent-glow);
  overflow: hidden;
}

/* 头像上斜切一道高光，避免大色块太平 */
.avatar-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.32), transparent 52%);
  pointer-events: none;
}

.info {
  min-width: 0;
}

.info h1 {
  margin: 0 0 var(--sp-1);
  font-size: 24px;
  letter-spacing: -0.02em;
}

.role {
  margin: 0 0 var(--sp-3);
  font-size: 13.5px;
  color: var(--text-mute);
}

.bio {
  margin: 0 0 var(--sp-4);
  font-size: 14.5px;
  line-height: 1.82;
  color: var(--text-dim);
  max-width: 62ch;
}

.links {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.social-btn {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  font-size: 13px;
  padding: 5px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-dim);
  transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease),
    background-color var(--t-fast) var(--ease);
}

.social-btn:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  background: var(--accent-softer);
  text-decoration: none;
}

/* ---------- 区块 ---------- */
.block {
  margin-bottom: var(--sp-12);
}

.block h2 {
  margin: 0 0 var(--sp-4);
  font-size: 19px;
  padding-bottom: var(--sp-2);
  border-bottom: 1px solid var(--border);
  position: relative;
}

/* 标题下一小段强调色，替代整条通栏线 */
.block h2::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 40px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), var(--violet));
}

.block p {
  margin: 0 0 var(--sp-3);
  font-size: 15px;
  line-height: 1.85;
  color: var(--text-dim);
  max-width: 68ch;
}

.block strong {
  color: var(--text);
  font-weight: 620;
}

.block code {
  font-family: var(--mono);
  font-size: 13px;
  padding: 2px 6px;
  border-radius: var(--radius-xs);
  background: var(--code-inline-bg);
  border: 1px solid var(--code-inline-border);
  color: var(--code-inline);
}

.small {
  font-size: 13px !important;
  color: var(--text-mute) !important;
}

/* ---------- 数据格 ---------- */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-3);
  margin-top: var(--sp-6);
}

.stat-box {
  padding: var(--sp-4) var(--sp-3);
  border-radius: var(--radius);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  text-align: center;
  transition: border-color var(--t) var(--ease), background-color var(--t) var(--ease);
}

.stat-box:hover {
  border-color: var(--accent-line);
  background: var(--accent-softer);
}

.stat-box b {
  display: block;
  font-size: 21px;
  color: var(--accent);
  font-weight: 680;
  margin-bottom: 2px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.stat-box span {
  font-size: 12.5px;
  color: var(--text-mute);
}

/* ---------- 技术栈 ---------- */
.stack {
  list-style: none;
  margin: var(--sp-4) 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: var(--sp-3);
}

.stack-item {
  padding: var(--sp-3) var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: border-color var(--t) var(--ease), background-color var(--t) var(--ease);
}

.stack-item:hover {
  border-color: var(--accent-line);
  background: var(--bg-elev-2);
}

.s-name {
  font-size: 13.5px;
  font-weight: 620;
  color: var(--accent);
}

.s-note {
  font-size: 12.5px;
  color: var(--text-mute);
}

/* ---------- 兴趣 ---------- */
.interests {
  list-style: none;
  margin: var(--sp-4) 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(238px, 1fr));
  gap: var(--sp-3);
}

.interest {
  padding: var(--sp-4);
  display: flex;
  gap: var(--sp-3);
  align-items: flex-start;
  transition: border-color var(--t) var(--ease), background-color var(--t) var(--ease);
}

.interest:hover {
  border-color: var(--accent-line);
  background: var(--bg-elev-2);
}

.i-icon {
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1.5;
}

.i-title {
  font-size: 14.5px;
  font-weight: 620;
  margin-bottom: 2px;
  letter-spacing: -0.01em;
}

.i-desc {
  font-size: 12.5px;
  color: var(--text-mute);
  line-height: 1.6;
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
  .profile {
    flex-direction: column;
    gap: var(--sp-4);
    padding: var(--sp-5);
  }

  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .block {
    margin-bottom: var(--sp-8);
  }
}
</style>

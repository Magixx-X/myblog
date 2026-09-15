<script setup>
import { site } from '../config'
import { siteStats, tagList } from '../content/blog'

const year = new Date().getFullYear()
const topTags = tagList.slice(0, 10)
</script>

<template>
  <footer class="ftr">
    <div class="container">
      <div class="ftr-grid">
        <div class="col brand">
          <div class="brand-name">{{ site.title }}</div>
          <p class="brand-desc">{{ site.description }}</p>
          <div class="socials">
            <a
              v-for="s in site.socials"
              :key="s.name"
              :href="s.url"
              target="_blank"
              rel="noopener"
              class="social"
            >
              {{ s.name }}
            </a>
          </div>
        </div>

        <div class="col">
          <div class="col-title">站内</div>
          <router-link to="/">首页</router-link>
          <router-link to="/tags">标签</router-link>
          <router-link to="/categories">分类</router-link>
          <router-link to="/archive">归档</router-link>
          <router-link to="/about">关于</router-link>
        </div>

        <div class="col">
          <div class="col-title">热门标签</div>
          <div class="tag-wrap">
            <router-link
              v-for="t in topTags"
              :key="t.name"
              :to="`/tags/${encodeURIComponent(t.name)}`"
              class="tag-pill"
            >
              {{ t.name }}
            </router-link>
          </div>
        </div>

        <div class="col">
          <div class="col-title">数据</div>
          <div class="stat"><span>文章</span><b>{{ siteStats.total }}</b></div>
          <div class="stat"><span>标签</span><b>{{ siteStats.tags }}</b></div>
          <div class="stat"><span>分类</span><b>{{ siteStats.categories }}</b></div>
          <div class="stat"><span>总字数</span><b>{{ siteStats.chars.toLocaleString() }}</b></div>
        </div>
      </div>

      <div class="ftr-bottom">
        <span>© {{ site.since }}–{{ year }} {{ site.author }} · Powered by Vue &amp; Markdown</span>
        <span class="mono build">内容以 Git 维护</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.ftr {
  border-top: 1px solid var(--border);
  background: var(--bg-soft);
  padding: 42px 0 26px;
  margin-top: 60px;
}

.ftr-grid {
  display: grid;
  grid-template-columns: 1.6fr 0.8fr 1.4fr 0.9fr;
  gap: 40px;
}

.brand-name {
  font-size: 16px;
  font-weight: 650;
  margin-bottom: 8px;
}

.brand-desc {
  margin: 0 0 14px;
  font-size: 13.5px;
  color: var(--text-dim);
  line-height: 1.7;
  max-width: 320px;
}

.socials {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.social {
  font-size: 13px;
  padding: 4px 11px;
  border: 1px solid var(--border);
  border-radius: 100px;
  color: var(--text-dim);
  transition: color 0.15s, border-color 0.15s;
}

.social:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  text-decoration: none;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.col a {
  font-size: 13.5px;
  color: var(--text-dim);
}

.col a:hover {
  color: var(--accent);
  text-decoration: none;
}

.col-title {
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  margin-bottom: 5px;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stat {
  display: flex;
  justify-content: space-between;
  font-size: 13.5px;
  color: var(--text-dim);
  max-width: 150px;
}

.stat b {
  color: var(--text);
  font-weight: 600;
}

.ftr-bottom {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  margin-top: 34px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-mute);
  flex-wrap: wrap;
}

@media (max-width: 880px) {
  .ftr-grid {
    grid-template-columns: 1fr 1fr;
    gap: 26px;
  }
}

@media (max-width: 560px) {
  .ftr-grid {
    grid-template-columns: 1fr;
  }

  .ftr-bottom {
    flex-direction: column;
    gap: 6px;
  }
}
</style>

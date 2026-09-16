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
          <div class="brand-name">
            <span class="brand-mark" aria-hidden="true">M</span>
            {{ site.title }}
          </div>
          <p class="brand-desc">{{ site.description }}</p>
          <div class="socials">
            <a
              v-for="s in site.socials"
              :key="s.name"
              :href="s.url"
              :target="/^https?:/.test(s.url) ? '_blank' : undefined"
              rel="noopener"
              class="social"
            >
              {{ s.name }}
            </a>
          </div>
        </div>

        <nav class="col" aria-label="页脚导航">
          <div class="col-title">站内</div>
          <router-link to="/">首页</router-link>
          <router-link to="/tags">标签</router-link>
          <router-link to="/categories">分类</router-link>
          <router-link to="/archive">归档</router-link>
          <router-link to="/about">关于</router-link>
        </nav>

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
  padding: var(--sp-12) 0 var(--sp-6);
  margin-top: var(--sp-16);
}

.ftr-grid {
  display: grid;
  grid-template-columns: 1.6fr 0.7fr 1.5fr 0.9fr;
  gap: var(--sp-10);
}

.brand-name {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.01em;
  margin-bottom: var(--sp-3);
}

.brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--accent), var(--violet));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
}

.brand-desc {
  margin: 0 0 var(--sp-4);
  font-size: 13.5px;
  color: var(--text-dim);
  line-height: 1.75;
  max-width: 320px;
}

.socials {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.social {
  font-size: 13px;
  padding: 5px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-dim);
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease),
    background-color var(--t-fast) var(--ease);
}

.social:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  background: var(--accent-softer);
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
  width: fit-content;
  transition: color var(--t-fast) var(--ease);
}

.col a:hover {
  color: var(--accent);
  text-decoration: none;
}

.col-title {
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-mute);
  margin-bottom: var(--sp-1);
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1) var(--sp-2);
}

.stat {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-3);
  font-size: 13.5px;
  color: var(--text-dim);
  max-width: 156px;
}

.stat b {
  color: var(--text);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ftr-bottom {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-4);
  margin-top: var(--sp-10);
  padding-top: var(--sp-5);
  border-top: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-mute);
  flex-wrap: wrap;
}

@media (max-width: 880px) {
  .ftr-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--sp-8) var(--sp-6);
  }
}

@media (max-width: 560px) {
  .ftr {
    padding-top: var(--sp-8);
    margin-top: var(--sp-12);
  }

  .ftr-grid {
    grid-template-columns: 1fr;
    gap: var(--sp-6);
  }

  .ftr-bottom {
    flex-direction: column;
    gap: var(--sp-1);
  }
}
</style>

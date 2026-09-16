<script setup>
import { computed } from 'vue'
import { tagList, siteStats } from '../content/blog'

/** 按规模给标签分档，用于字号差异 */
const maxCount = computed(() => Math.max(1, ...tagList.map((t) => t.count)))

function sizeOf(count) {
  const ratio = count / maxCount.value
  if (ratio > 0.75) return 17
  if (ratio > 0.5) return 15.5
  if (ratio > 0.3) return 14.5
  return 13.5
}
</script>

<template>
  <div class="container">
    <header class="page-head">
      <h1>标签</h1>
      <p>共 <b>{{ siteStats.tags }}</b> 个标签，分布在 <b>{{ siteStats.total }}</b> 篇文章里。</p>
    </header>

    <div v-if="tagList.length" class="tag-grid">
      <router-link
        v-for="t in tagList"
        :key="t.name"
        :to="`/tags/${encodeURIComponent(t.name)}`"
        class="tag-card card card--interactive"
      >
        <div class="tc-head">
          <span class="tc-name" :style="{ fontSize: sizeOf(t.count) + 'px' }">{{ t.name }}</span>
          <span class="tc-count">{{ t.count }}</span>
        </div>
        <div class="tc-titles">
          <span v-for="p in t.posts.slice(0, 2)" :key="p.slug" class="tc-t">
            {{ p.title }}
          </span>
          <span v-if="t.posts.length > 2" class="tc-more">还有 {{ t.posts.length - 2 }} 篇…</span>
        </div>
      </router-link>
    </div>

    <div v-else class="empty">
      <span class="big" aria-hidden="true">🏷️</span>
      <p>还没有任何标签，在文章 front-matter 里加 <code>tags: [标签名]</code> 即可</p>
    </div>
  </div>
</template>

<style scoped>
.tag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(288px, 1fr));
  gap: var(--sp-4);
}

.tag-card {
  padding: var(--sp-4) var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  text-decoration: none;
}

.tc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--sp-3);
}

.tc-name {
  color: var(--accent);
  font-weight: 620;
  line-height: 1.3;
  transition: color var(--t-fast) var(--ease);
}

.tag-card:hover .tc-name {
  color: var(--accent-hover);
}

.tc-count {
  font-size: 12px;
  color: var(--text-mute);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  padding: 1px 9px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}

.tag-card:hover .tc-count {
  color: var(--accent);
  border-color: var(--accent-line);
}

.tc-titles {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.tc-t {
  font-size: 13px;
  color: var(--text-dim);
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  padding-left: 11px;
  position: relative;
}

.tc-t::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--text-mute);
}

.tc-more {
  font-size: 12.5px;
  color: var(--text-mute);
  padding-left: 11px;
}

@media (max-width: 640px) {
  .tag-grid {
    grid-template-columns: 1fr;
    gap: var(--sp-3);
  }
}
</style>

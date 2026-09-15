<script setup>
import { computed } from 'vue'
import { tagList, posts, siteStats } from '../content/blog'
import PostCard from '../components/PostCard.vue'

/** 按规模给标签分档，用于字号差异 */
const maxCount = computed(() => Math.max(1, ...tagList.map((t) => t.count)))

function sizeOf(count) {
  const ratio = count / maxCount.value
  if (ratio > 0.75) return 17
  if (ratio > 0.5) return 15.5
  if (ratio > 0.3) return 14.5
  return 13.5
}

const hottest = computed(() => tagList.slice(0, 3))
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
        class="tag-card card"
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
      <span class="big">🏷️</span>
      <p>还没有任何标签，在文章 front-matter 里加 <code>tags: [标签名]</code> 即可</p>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 30px;
}

.page-head h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.page-head p {
  margin: 0;
  color: var(--text-dim);
  font-size: 14.5px;
}

.page-head b {
  color: var(--text);
}

.tag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.tag-card {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-decoration: none;
}

.tag-card:hover {
  border-color: var(--accent-line);
  text-decoration: none;
}

.tc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.tc-name {
  color: var(--accent);
  font-weight: 600;
  line-height: 1.3;
}

.tc-count {
  font-size: 12px;
  color: var(--text-mute);
  background: var(--bg-soft);
  border: 1px solid var(--border);
  padding: 1px 9px;
  border-radius: 100px;
  flex-shrink: 0;
}

.tc-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  top: 8px;
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
</style>

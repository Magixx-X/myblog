<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { tagList } from '../content/blog'
import PostCard from '../components/PostCard.vue'

const route = useRoute()

const tagName = computed(() => {
  try {
    return decodeURIComponent(String(route.params.tag || ''))
  } catch (_) {
    return String(route.params.tag || '')
  }
})

const current = computed(() => tagList.find((t) => t.name === tagName.value) || null)
const postsOfTag = computed(() => current.value?.posts || [])

/** 与当前标签同时出现的其他标签，按共现次数排序 */
const coTags = computed(() => {
  if (!current.value) return []
  const counter = new Map()
  for (const p of postsOfTag.value) {
    for (const t of p.tags) {
      if (t === tagName.value) continue
      counter.set(t, (counter.get(t) || 0) + 1)
    }
  }
  return [...counter.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }))
})
</script>

<template>
  <div class="container">
    <div v-if="current">
      <header class="page-head">
        <nav class="crumb" aria-label="面包屑">
          <router-link to="/tags">标签</router-link>
          <span aria-hidden="true">/</span>
          <span>{{ tagName }}</span>
        </nav>
        <h1>
          <span class="hash" aria-hidden="true">#</span>{{ tagName }}
          <span class="cnt">{{ postsOfTag.length }} 篇</span>
        </h1>
      </header>

      <!-- 共现标签 -->
      <section v-if="coTags.length" class="co">
        <span class="co-label">常一起出现</span>
        <router-link
          v-for="t in coTags"
          :key="t.name"
          :to="`/tags/${encodeURIComponent(t.name)}`"
          class="tag-pill"
        >
          {{ t.name }}<span class="cnt">{{ t.count }}</span>
        </router-link>
      </section>

      <div class="post-list">
        <PostCard v-for="p in postsOfTag" :key="p.slug" :post="p" />
      </div>
    </div>

    <div v-else class="empty">
      <span class="big" aria-hidden="true">🏷️</span>
      <p>没有找到标签「{{ tagName }}」</p>
      <router-link to="/tags" class="btn">浏览全部标签</router-link>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: var(--sp-5);
}

.crumb {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
  font-size: 13px;
  color: var(--text-mute);
  margin-bottom: var(--sp-3);
}

.crumb a {
  color: var(--text-mute);
  transition: color var(--t-fast) var(--ease);
}

.crumb a:hover {
  color: var(--accent);
  text-decoration: none;
}

h1 {
  margin: 0;
  font-size: clamp(24px, 3.4vw, 29px);
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  flex-wrap: wrap;
}

.hash {
  background: linear-gradient(135deg, var(--accent), var(--violet));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
}

.cnt {
  font-size: 14px;
  font-weight: 400;
  color: var(--text-mute);
  font-variant-numeric: tabular-nums;
}

.co {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
  padding: var(--sp-3) var(--sp-4);
  margin-bottom: var(--sp-6);
  border-radius: var(--radius);
  background: var(--bg-soft);
  border: 1px solid var(--border);
}

.co-label {
  font-size: 12px;
  font-weight: 650;
  color: var(--text-mute);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-right: var(--sp-1);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}
</style>

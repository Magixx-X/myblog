<script setup>
import { ref, computed } from 'vue'
import { categoryList, siteStats } from '../content/blog'

/* 用一个展开索引控制手风琴，默认展开第一个 */
const openIndex = ref(0)

const total = computed(() => siteStats.total)

/** 每个分类在该分类内的标签分布 */
function tagsOf(cat) {
  const counter = new Map()
  for (const p of cat.posts) {
    for (const t of p.tags) counter.set(t, (counter.get(t) || 0) + 1)
  }
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
}

/** 占比条宽度 */
function ratio(cat) {
  return total.value ? Math.max(6, (cat.count / total.value) * 100) : 0
}

function toggle(i) {
  openIndex.value = openIndex.value === i ? -1 : i
}
</script>

<template>
  <div class="container">
    <header class="page-head">
      <h1>分类</h1>
      <p>
        共 <b>{{ siteStats.categories }}</b> 个分类，承载 <b>{{ total }}</b> 篇文章。
        分类由 <code>content/posts/</code> 下的目录结构决定。
      </p>
    </header>

    <div v-if="categoryList.length" class="cat-list">
      <section
        v-for="(cat, i) in categoryList"
        :key="cat.name"
        class="cat card"
        :class="{ open: openIndex === i }"
      >
        <button class="cat-head" @click="toggle(i)">
          <span class="arrow">{{ openIndex === i ? '▾' : '▸' }}</span>
          <span class="cat-name">{{ cat.name }}</span>
          <span class="bar"><i :style="{ width: ratio(cat) + '%' }"></i></span>
          <span class="cat-count">{{ cat.count }} 篇</span>
        </button>

        <transition name="fade">
          <div v-show="openIndex === i" class="cat-body">
            <div class="cat-tags">
              <router-link
                v-for="[name, n] in tagsOf(cat)"
                :key="name"
                :to="`/tags/${encodeURIComponent(name)}`"
                class="tag-pill"
              >
                {{ name }}<span class="cnt">{{ n }}</span>
              </router-link>
            </div>

            <ul class="cat-posts">
              <li v-for="p in cat.posts" :key="p.slug">
                <time>{{ p.date }}</time>
                <router-link :to="`/posts/${p.slug}`">{{ p.title }}</router-link>
              </li>
            </ul>
          </div>
        </transition>
      </section>
    </div>

    <div v-else class="empty">
      <span class="big">📁</span>
      <p>还没有分类目录</p>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 26px;
}

.page-head h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.page-head p {
  margin: 0;
  color: var(--text-dim);
  font-size: 14.5px;
  line-height: 1.7;
}

.page-head b {
  color: var(--text);
}

.page-head code {
  font-size: 12.5px;
  padding: 1.5px 5px;
  border-radius: 4px;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  font-family: var(--mono);
  color: var(--accent);
}

.cat-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cat {
  overflow: hidden;
}

.cat.open {
  border-color: var(--accent-line);
}

.cat-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  border: none;
  background: transparent;
  color: var(--text);
  text-align: left;
  transition: background 0.15s;
}

.cat-head:hover {
  background: var(--bg-hover);
}

.arrow {
  color: var(--text-mute);
  font-size: 11px;
  width: 10px;
}

.cat-name {
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.bar {
  flex: 1;
  height: 5px;
  border-radius: 100px;
  background: var(--bg-soft);
  overflow: hidden;
  max-width: 260px;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: 100px;
  background: linear-gradient(90deg, var(--accent), #a371f7);
  transition: width 0.4s ease;
}

.cat-count {
  font-size: 13px;
  color: var(--text-mute);
  margin-left: auto;
  flex-shrink: 0;
}

.cat-body {
  padding: 4px 18px 18px 40px;
  border-top: 1px solid var(--border-soft);
}

.cat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 14px 0 16px;
}

.cat-posts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.cat-posts li {
  display: flex;
  gap: 14px;
  align-items: baseline;
  font-size: 14.5px;
}

.cat-posts time {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-mute);
  flex-shrink: 0;
}

.cat-posts a {
  color: var(--text-dim);
  line-height: 1.6;
}

.cat-posts a:hover {
  color: var(--accent);
  text-decoration: none;
}

@media (max-width: 620px) {
  .bar {
    display: none;
  }

  .cat-body {
    padding-left: 18px;
  }
}
</style>

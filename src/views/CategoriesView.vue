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
        <h2 class="cat-h">
          <button
            class="cat-head"
            :aria-expanded="openIndex === i"
            :aria-controls="`cat-body-${i}`"
            @click="toggle(i)"
          >
            <span class="arrow" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </span>
            <span class="cat-name">{{ cat.name }}</span>
            <span class="bar" aria-hidden="true"><i :style="{ width: ratio(cat) + '%' }"></i></span>
            <span class="cat-count">{{ cat.count }} 篇</span>
          </button>
        </h2>

        <transition name="fold">
          <div v-show="openIndex === i" :id="`cat-body-${i}`" class="cat-body">
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
                <time :datetime="p.date">{{ p.date }}</time>
                <router-link :to="`/posts/${p.slug}`">{{ p.title }}</router-link>
              </li>
            </ul>
          </div>
        </transition>
      </section>
    </div>

    <div v-else class="empty">
      <span class="big" aria-hidden="true">📁</span>
      <p>还没有分类目录</p>
    </div>
  </div>
</template>

<style scoped>
.cat-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.cat {
  overflow: hidden;
  transition: border-color var(--t) var(--ease), background-color var(--t) var(--ease);
}

.cat.open {
  border-color: var(--accent-line);
  background: var(--bg-elev-2);
}

.cat-h {
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
}

.cat-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  border: none;
  background: transparent;
  color: var(--text);
  text-align: left;
  transition: background-color var(--t-fast) var(--ease);
}

.cat-head:hover {
  background: var(--bg-hover);
}

.arrow {
  display: flex;
  flex-shrink: 0;
  color: var(--text-mute);
  transition: transform var(--t) var(--ease), color var(--t) var(--ease);
}

.cat.open .arrow {
  transform: rotate(90deg);
  color: var(--accent);
}

.cat-name {
  font-size: 16px;
  font-weight: 620;
  flex-shrink: 0;
  letter-spacing: -0.01em;
}

.bar {
  flex: 1;
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--bg-soft);
  overflow: hidden;
  max-width: 280px;
  margin-left: var(--sp-2);
}

.bar i {
  display: block;
  height: 100%;
  border-radius: var(--radius-pill);
  background: linear-gradient(90deg, var(--accent), var(--violet));
  transition: width var(--t-slow) var(--ease);
}

.cat-count {
  font-size: 13px;
  color: var(--text-mute);
  margin-left: auto;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.cat-body {
  padding: var(--sp-1) var(--sp-5) var(--sp-5) 48px;
  border-top: 1px solid var(--border-soft);
}

.cat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-1) var(--sp-2);
  margin: var(--sp-4) 0 var(--sp-5);
}

.cat-posts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.cat-posts li {
  display: flex;
  gap: var(--sp-4);
  align-items: baseline;
  font-size: 14.5px;
}

.cat-posts time {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-mute);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.cat-posts a {
  color: var(--text-dim);
  line-height: 1.6;
  transition: color var(--t-fast) var(--ease);
}

.cat-posts a:hover {
  color: var(--accent);
  text-decoration: none;
}

/* 手风琴展开：只做透明度 + 位移，不做 height 动画（避免 reflow） */
.fold-enter-active,
.fold-leave-active {
  transition: opacity var(--t) var(--ease), transform var(--t) var(--ease);
}

.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 620px) {
  .bar {
    display: none;
  }

  .cat-body {
    padding-left: var(--sp-4);
    padding-right: var(--sp-4);
  }

  .cat-head {
    padding: var(--sp-4);
  }
}
</style>

<script setup>
import { computed } from 'vue'
import { archiveList, siteStats } from '../content/blog'

/** 按年份分组，年份内再按月细分 */
const years = computed(() =>
  archiveList.map((y) => {
    const byMonth = new Map()
    for (const p of y.posts) {
      const m = p.date.slice(5, 7)
      if (!byMonth.has(m)) byMonth.set(m, [])
      byMonth.get(m).push(p)
    }
    return {
      year: y.year,
      count: y.count,
      months: [...byMonth.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([m, list]) => ({ month: m, posts: list }))
    }
  })
)

const allTags = computed(() => {
  const c = new Map()
  for (const p of archiveList.flatMap((y) => y.posts)) {
    for (const t of p.tags) c.set(t, (c.get(t) || 0) + 1)
  }
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)
})

const totalChars = computed(() => siteStats.chars)
</script>

<template>
  <div class="container">
    <header class="page-head">
      <h1>归档</h1>
      <p>
        共 <b>{{ siteStats.total }}</b> 篇文章 · <b>{{ totalChars.toLocaleString() }}</b> 字 ·
        跨越 <b>{{ years.length }}</b> 个年份。
      </p>
    </header>

    <div class="tag-strip">
      <router-link
        v-for="[name, n] in allTags"
        :key="name"
        :to="`/tags/${encodeURIComponent(name)}`"
        class="tag-pill"
      >
        {{ name }}<span class="cnt">{{ n }}</span>
      </router-link>
    </div>

    <div v-if="years.length" class="timeline">
      <section v-for="y in years" :key="y.year" class="year">
        <div class="year-head">
          <h2>{{ y.year }}</h2>
          <span class="line"></span>
          <span class="year-count">{{ y.count }} 篇</span>
        </div>

        <div v-for="m in y.months" :key="m.month" class="month">
          <div class="month-label">{{ Number(m.month) }} 月</div>
          <ul class="items">
            <li v-for="p in m.posts" :key="p.slug">
              <span class="day">{{ p.date.slice(8, 10) }}</span>
              <router-link :to="`/posts/${p.slug}`" class="p-title">{{ p.title }}</router-link>
              <span class="p-tags">
                <router-link
                  v-for="t in p.tags.slice(0, 3)"
                  :key="t"
                  :to="`/tags/${encodeURIComponent(t)}`"
                  class="mini-tag"
                >
                  {{ t }}
                </router-link>
              </span>
              <span class="p-min mono">{{ p.minutes }}min</span>
            </li>
          </ul>
        </div>
      </section>
    </div>

    <div v-else class="empty">
      <span class="big">🗓️</span>
      <p>还没有文章可以归档</p>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 22px;
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

.tag-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 22px;
  margin-bottom: 30px;
  border-bottom: 1px solid var(--border);
}

.year {
  margin-bottom: 38px;
}

.year-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.year-head h2 {
  margin: 0;
  font-size: 21px;
  font-family: var(--mono);
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.year-count {
  font-size: 13px;
  color: var(--text-mute);
  flex-shrink: 0;
}

.month {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 18px;
  margin-bottom: 18px;
}

.month-label {
  font-size: 13px;
  color: var(--text-mute);
  font-family: var(--mono);
  padding-top: 7px;
  text-align: right;
}

.items {
  list-style: none;
  margin: 0;
  padding: 0;
  border-left: 1px solid var(--border);
}

.items li {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 7px 0 7px 18px;
  position: relative;
}

/* 时间轴圆点 */
.items li::before {
  content: '';
  position: absolute;
  left: -3.5px;
  top: 15px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border);
  transition: background 0.15s;
}

.items li:hover::before {
  background: var(--accent);
}

.day {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-mute);
  flex-shrink: 0;
  width: 18px;
}

.p-title {
  font-size: 15px;
  color: var(--text-dim);
  flex: 1;
  min-width: 0;
  line-height: 1.6;
}

.p-title:hover {
  color: var(--accent);
  text-decoration: none;
}

.p-tags {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.mini-tag {
  font-size: 11.5px;
  color: var(--text-mute);
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  padding: 1px 7px;
  border-radius: 100px;
}

.mini-tag:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  text-decoration: none;
}

.p-min {
  font-size: 11.5px;
  color: var(--text-mute);
  flex-shrink: 0;
  width: 44px;
  text-align: right;
}

@media (max-width: 700px) {
  .month {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .month-label {
    text-align: left;
    padding-top: 0;
  }

  .items li {
    flex-wrap: wrap;
    gap: 8px;
  }

  .p-tags,
  .p-min {
    display: none;
  }
}
</style>

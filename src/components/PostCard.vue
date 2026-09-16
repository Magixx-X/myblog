<script setup>
defineProps({
  post: { type: Object, required: true },
  horizontal: { type: Boolean, default: false }
})
</script>

<template>
  <article class="pcard card card--interactive" :class="{ horizontal }">
    <router-link v-if="post.cover" :to="`/posts/${post.slug}`" class="cover" tabindex="-1" aria-hidden="true">
      <img :src="post.cover" :alt="post.title" loading="lazy" />
    </router-link>

    <div class="body">
      <div class="meta">
        <span class="pin" v-if="post.pinned">置顶</span>
        <router-link :to="`/categories`" class="cat">{{ post.category }}</router-link>
        <span class="dot" aria-hidden="true">·</span>
        <time :datetime="post.date">{{ post.date }}</time>
        <span class="dot" aria-hidden="true">·</span>
        <span>{{ post.minutes }} 分钟</span>
      </div>

      <h3 class="title">
        <router-link :to="`/posts/${post.slug}`">{{ post.title }}</router-link>
      </h3>

      <p class="summary">{{ post.summary }}</p>

      <div class="tags">
        <router-link
          v-for="t in post.tags"
          :key="t"
          :to="`/tags/${encodeURIComponent(t)}`"
          class="tag-pill"
        >
          {{ t }}
        </router-link>
      </div>
    </div>
  </article>
</template>

<style scoped>
.pcard {
  padding: var(--sp-5) var(--sp-5);
  display: flex;
  flex-direction: column;
  position: relative;
  /* 左侧一条 2px 指示线，hover 时长出来 —— 比整卡变色更克制 */
  overflow: hidden;
}

.pcard::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, var(--accent), var(--violet));
  transform: scaleY(0);
  transform-origin: top;
  transition: transform var(--t) var(--ease);
}

.pcard:hover::before {
  transform: scaleY(1);
}

.pcard.horizontal {
  flex-direction: row;
  gap: var(--sp-5);
  align-items: flex-start;
}

.pcard.horizontal .cover {
  flex: 0 0 190px;
  margin: calc(var(--sp-5) * -1) 0 calc(var(--sp-5) * -1) calc(var(--sp-5) * -1);
  border-radius: var(--radius) 0 0 var(--radius);
  overflow: hidden;
  align-self: stretch;
}

.cover {
  display: block;
  line-height: 0;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  min-height: 110px;
  transition: transform var(--t-slow) var(--ease);
}

.pcard:hover .cover img {
  transform: scale(1.04);
}

.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.meta {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-size: 12.5px;
  color: var(--text-mute);
  margin-bottom: var(--sp-2);
}

.pin {
  padding: 1px 7px;
  border-radius: var(--radius-xs);
  background: var(--warn-soft);
  color: var(--warn);
  font-weight: 650;
  font-size: 11.5px;
  letter-spacing: 0.02em;
}

.cat {
  color: var(--accent);
  font-weight: 550;
  transition: color var(--t-fast) var(--ease);
}

.cat:hover {
  text-decoration: none;
  color: var(--accent-hover);
}

.dot {
  opacity: 0.5;
}

.title {
  margin: 0 0 var(--sp-2);
  font-size: 18.5px;
  line-height: 1.44;
}

.title a {
  color: var(--text);
  text-decoration: none;
  transition: color var(--t-fast) var(--ease);
}

.title a:hover {
  color: var(--accent);
}

.summary {
  margin: 0 0 var(--sp-4);
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-dim);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tags {
  display: flex;
  gap: var(--sp-1) var(--sp-2);
  flex-wrap: wrap;
  margin-top: auto;
}

@media (max-width: 620px) {
  .pcard {
    padding: var(--sp-4);
  }

  .pcard.horizontal {
    flex-direction: column;
  }

  .pcard.horizontal .cover {
    flex: none;
    margin: calc(var(--sp-4) * -1) calc(var(--sp-4) * -1) var(--sp-3);
    border-radius: var(--radius) var(--radius) 0 0;
  }

  .title {
    font-size: 17px;
  }
}
</style>

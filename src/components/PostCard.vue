<script setup>
defineProps({
  post: { type: Object, required: true },
  horizontal: { type: Boolean, default: false }
})
</script>

<template>
  <article class="pcard card" :class="{ horizontal }">
    <router-link v-if="post.cover" :to="`/posts/${post.slug}`" class="cover">
      <img :src="post.cover" :alt="post.title" loading="lazy" />
    </router-link>

    <div class="body">
      <div class="meta">
        <span class="pin" v-if="post.pinned">置顶</span>
        <router-link :to="`/categories`" class="cat">{{ post.category }}</router-link>
        <span class="dot">·</span>
        <time :datetime="post.date">{{ post.date }}</time>
        <span class="dot">·</span>
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
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pcard:hover {
  border-color: var(--accent-line);
}

.pcard.horizontal {
  flex-direction: row;
  gap: 22px;
  align-items: flex-start;
}

.pcard.horizontal .cover {
  flex: 0 0 190px;
  margin: -20px 0 -20px -22px;
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
  margin-bottom: 8px;
}

.pin {
  padding: 1px 7px;
  border-radius: 4px;
  background: rgba(210, 153, 34, 0.16);
  color: var(--warn);
  font-weight: 600;
  font-size: 11.5px;
}

.cat {
  color: var(--accent);
  font-weight: 500;
}

.cat:hover {
  text-decoration: none;
  opacity: 0.8;
}

.dot {
  opacity: 0.5;
}

.title {
  margin: 0 0 9px;
  font-size: 18.5px;
  line-height: 1.45;
}

.title a {
  color: var(--text);
  text-decoration: none;
}

.title a:hover {
  color: var(--accent);
}

.summary {
  margin: 0 0 14px;
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
  gap: 6px;
  flex-wrap: wrap;
  margin-top: auto;
}

@media (max-width: 620px) {
  .pcard.horizontal {
    flex-direction: column;
  }

  .pcard.horizontal .cover {
    flex: none;
    margin: -20px -22px 14px;
    border-radius: var(--radius) var(--radius) 0 0;
  }
}
</style>

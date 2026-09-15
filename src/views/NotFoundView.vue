<script setup>
import { posts } from '../content/blog'

const suggestions = posts.slice(0, 5)
</script>

<template>
  <div class="container">
    <div class="nf">
      <div class="code mono">404</div>
      <h1>页面不存在</h1>
      <p>你访问的地址没有对应的内容，可能链接已经失效，或者是文章被重命名了。</p>

      <div class="actions">
        <router-link to="/" class="btn primary">回到首页</router-link>
        <router-link to="/archive" class="btn">浏览归档</router-link>
      </div>

      <div class="sug">
        <div class="sug-title">或者看看这些</div>
        <ul>
          <li v-for="p in suggestions" :key="p.slug">
            <router-link :to="`/posts/${p.slug}`">{{ p.title }}</router-link>
            <time>{{ p.date }}</time>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nf {
  max-width: 540px;
  margin: 40px auto 0;
  text-align: center;
}

.code {
  font-size: 72px;
  font-weight: 700;
  line-height: 1;
  background: linear-gradient(135deg, var(--accent), #a371f7);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
}

.nf h1 {
  margin: 0 0 12px;
  font-size: 24px;
}

.nf p {
  margin: 0 0 26px;
  color: var(--text-dim);
  font-size: 15px;
  line-height: 1.8;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.sug {
  margin-top: 44px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  text-align: left;
}

.sug-title {
  font-size: 12.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-mute);
  margin-bottom: 12px;
}

.sug ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.sug li {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: baseline;
  font-size: 14.5px;
}

.sug a {
  color: var(--text-dim);
  text-align: left;
}

.sug a:hover {
  color: var(--accent);
  text-decoration: none;
}

.sug time {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--text-mute);
  flex-shrink: 0;
}
</style>

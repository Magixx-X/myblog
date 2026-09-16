<script setup>
import { posts } from '../content/blog'

const suggestions = posts.slice(0, 5)
</script>

<template>
  <div class="container">
    <div class="nf">
      <div class="code mono" aria-hidden="true">404</div>
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
            <time :datetime="p.date">{{ p.date }}</time>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nf {
  max-width: 560px;
  margin: var(--sp-12) auto 0;
  text-align: center;
}

.code {
  font-size: 76px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, var(--accent), var(--violet));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--sp-5);
}

.nf h1 {
  margin: 0 0 var(--sp-3);
  font-size: 24px;
}

.nf p {
  margin: 0 0 var(--sp-6);
  color: var(--text-dim);
  font-size: 15px;
  line-height: 1.8;
}

.actions {
  display: flex;
  gap: var(--sp-3);
  justify-content: center;
  flex-wrap: wrap;
}

.sug {
  margin-top: var(--sp-12);
  padding-top: var(--sp-6);
  border-top: 1px solid var(--border);
  text-align: left;
}

.sug-title {
  font-size: 12px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-mute);
  margin-bottom: var(--sp-4);
}

.sug ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.sug li {
  display: flex;
  justify-content: space-between;
  gap: var(--sp-4);
  align-items: baseline;
  font-size: 14.5px;
  padding: var(--sp-1) 0;
}

.sug a {
  color: var(--text-dim);
  text-align: left;
  transition: color var(--t-fast) var(--ease);
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

@media (max-width: 560px) {
  .nf {
    margin-top: var(--sp-8);
  }

  .code {
    font-size: 60px;
  }

  .actions .btn {
    flex: 1;
  }
}
</style>

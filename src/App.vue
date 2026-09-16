<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import SiteHeader from './components/SiteHeader.vue'
import SiteFooter from './components/SiteFooter.vue'

const route = useRoute()
const showTop = ref(false)

function onScroll() {
  showTop.value = window.scrollY > 600
}

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <!-- 键盘用户按第一个 Tab 就能跳到正文，跳过整条导航 -->
  <a class="skip-link" href="#main">跳到主要内容</a>

  <SiteHeader />

  <main id="main" class="app-main" tabindex="-1">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <!--
          这层 .route-view 包裹不能删。
          <Transition mode="out-in"> 必须是「单个元素」的子节点：若某个视图组件
          本身是多根（fragment），Vue 无法给它挂过渡钩子 → leave 永远不结束 →
          out-in 不会再插入新组件 → 主内容区整片空白。
          （历史事故：PostView.vue 曾是多根，从文章页返回任何页面都是空白。）
          包一层 div 后，无论视图多少根，过渡都只作用于这层 div。
        -->
        <div :key="route.fullPath" class="route-view">
          <component :is="Component" />
        </div>
      </transition>
    </router-view>
  </main>

  <SiteFooter />

  <transition name="fade">
    <button v-show="showTop" class="to-top" title="回到顶部" aria-label="回到顶部" @click="toTop">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  </transition>
</template>

<style scoped>
.app-main {
  min-height: calc(100vh - var(--header-h) - 200px);
  padding: var(--sp-8) 0 var(--sp-16);
  outline: none;
}

/* 只作为过渡的单一子节点存在，本身不产生任何布局效果 */
.route-view {
  display: block;
}

.to-top {
  position: fixed;
  right: var(--sp-6);
  bottom: var(--sp-8);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elev);
  color: var(--text-dim);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease),
    transform var(--t) var(--ease), background-color var(--t-fast) var(--ease);
  z-index: 40;
}

.to-top:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  background: var(--bg-elev-2);
  transform: translateY(-3px);
}

@media (max-width: 640px) {
  .app-main {
    padding: var(--sp-5) 0 var(--sp-12);
  }

  .to-top {
    right: var(--sp-4);
    bottom: var(--sp-5);
    width: 38px;
    height: 38px;
  }
}
</style>

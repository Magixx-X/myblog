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
  <SiteHeader />

  <main class="app-main">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </router-view>
  </main>

  <SiteFooter />

  <transition name="fade">
    <button v-show="showTop" class="to-top" title="回到顶部" @click="toTop">↑</button>
  </transition>
</template>

<style scoped>
.app-main {
  min-height: calc(100vh - var(--header-h) - 200px);
  padding: 34px 0 64px;
}

.to-top {
  position: fixed;
  right: 26px;
  bottom: 30px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--bg-elev);
  color: var(--text-dim);
  font-size: 17px;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.16s, border-color 0.16s, transform 0.16s;
  z-index: 40;
}

.to-top:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  transform: translateY(-2px);
}

@media (max-width: 640px) {
  .to-top {
    right: 14px;
    bottom: 18px;
  }
}
</style>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { site } from '../config'

const router = useRouter()
const route = useRoute()

const nav = [
  { name: '首页', to: '/' },
  { name: '标签', to: '/tags' },
  { name: '分类', to: '/categories' },
  { name: '归档', to: '/archive' },
  { name: '关于', to: '/about' }
]

/* ---- 主题切换 ---- */
const THEME_KEY = 'blog-theme'
const theme = ref('dark')

function applyTheme(t) {
  theme.value = t
  document.documentElement.setAttribute('data-theme', t)
  try {
    localStorage.setItem(THEME_KEY, t)
  } catch (_) {
    /* 隐私模式下 localStorage 可能抛错，忽略 */
  }
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

/* ---- 搜索 ---- */
const searchOpen = ref(false)
const keyword = ref('')
const searchInput = ref(null)

function openSearch() {
  searchOpen.value = true
  requestAnimationFrame(() => searchInput.value?.focus())
}

function submitSearch() {
  const q = keyword.value.trim()
  if (!q) return
  searchOpen.value = false
  router.push({ name: 'home', query: { q } })
}

function onKeydown(e) {
  // Ctrl/Cmd + K 唤起搜索
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchOpen.value ? (searchOpen.value = false) : openSearch()
  }
  if (e.key === 'Escape') searchOpen.value = false
}

/* ---- 移动端菜单 ---- */
const menuOpen = ref(false)
watch(() => route.fullPath, () => (menuOpen.value = false))

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

onMounted(() => {
  // 初始化主题：本地存储 > 系统偏好
  let saved = null
  try {
    saved = localStorage.getItem(THEME_KEY)
  } catch (_) {
    /* noop */
  }
  const prefersLight =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: light)').matches
  applyTheme(saved || (prefersLight ? 'light' : 'dark'))

  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const siteTitle = computed(() => site.title)
</script>

<template>
  <header class="hdr">
    <div class="container hdr-inner">
      <!-- Logo -->
      <router-link to="/" class="logo">
        <span class="logo-mark">M</span>
        <span class="logo-text">{{ siteTitle }}</span>
      </router-link>

      <!-- 桌面导航 -->
      <nav class="nav">
        <router-link
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ active: isActive(item.to) }"
        >
          {{ item.name }}
        </router-link>
      </nav>

      <!-- 右侧操作 -->
      <div class="actions">
        <button class="icon-btn" title="搜索 (Ctrl+K)" @click="openSearch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>

        <button class="icon-btn" :title="theme === 'dark' ? '切换亮色' : '切换暗色'" @click="toggleTheme">
          <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8z" />
          </svg>
        </button>

        <button class="icon-btn burger" title="菜单" @click="menuOpen = !menuOpen">
          <svg v-if="!menuOpen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 移动端菜单 -->
    <transition name="fade">
      <nav v-show="menuOpen" class="mobile-nav">
        <router-link
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="mobile-link"
          :class="{ active: isActive(item.to) }"
        >
          {{ item.name }}
        </router-link>
      </nav>
    </transition>

    <!-- 搜索面板 -->
    <transition name="fade">
      <div v-if="searchOpen" class="search-mask" @click.self="searchOpen = false">
        <div class="search-box">
          <div class="search-row">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref="searchInput"
              v-model="keyword"
              type="text"
              placeholder="搜索文章标题、标签或正文…"
              @keydown.enter="submitSearch"
            />
            <kbd>Esc</kbd>
          </div>
          <div class="search-hint">
            按 <kbd>Enter</kbd> 搜索全部文章
          </div>
        </div>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.hdr {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 1px solid var(--border);
}

.hdr-inner {
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: 26px;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text);
  font-weight: 650;
  font-size: 16px;
  flex-shrink: 0;
}

.logo:hover {
  text-decoration: none;
}

.logo-mark {
  width: 27px;
  height: 27px;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--accent), #a371f7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

/* 导航 */
.nav {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 1;
}

.nav-link {
  padding: 6px 11px;
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  font-size: 14.5px;
  font-weight: 500;
  transition: color 0.15s, background 0.15s;
}

.nav-link:hover {
  color: var(--text);
  background: var(--bg-hover);
  text-decoration: none;
}

.nav-link.active {
  color: var(--accent);
  background: var(--accent-soft);
}

/* 操作按钮 */
.actions {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-dim);
  transition: color 0.15s, background 0.15s;
}

.icon-btn:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.burger {
  display: none;
}

/* 移动端菜单 */
.mobile-nav {
  display: none;
  flex-direction: column;
  padding: 8px 16px 14px;
  border-top: 1px solid var(--border);
  background: var(--bg-soft);
}

.mobile-link {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  font-size: 15px;
}

.mobile-link.active {
  color: var(--accent);
  background: var(--accent-soft);
}

/* 搜索 */
.search-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 14vh;
  z-index: 60;
}

.search-box {
  width: min(560px, calc(100vw - 32px));
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  color: var(--text-mute);
}

.search-row input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 15.5px;
  font-family: inherit;
}

.search-row input::placeholder {
  color: var(--text-mute);
}

.search-hint {
  padding: 9px 16px;
  border-top: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-mute);
  background: var(--bg-soft);
}

kbd {
  display: inline-block;
  padding: 1.5px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text-mute);
}

@media (max-width: 860px) {
  .nav {
    display: none;
  }

  .burger {
    display: flex;
  }

  .mobile-nav {
    display: flex;
  }

  .hdr-inner {
    gap: 14px;
  }
}
</style>

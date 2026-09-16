<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
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

/* ---- 滚动状态：页面下滑后给头部加一层实底 ---- */
const scrolled = ref(false)
function onScroll() {
  scrolled.value = window.scrollY > 8
}

/* ---- 搜索 ---- */
const searchOpen = ref(false)
const keyword = ref('')
const searchInput = ref(null)

async function openSearch() {
  searchOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}

function closeSearch() {
  searchOpen.value = false
}

function submitSearch() {
  const q = keyword.value.trim()
  if (!q) return
  closeSearch()
  // 已经带着同一个关键词在首页时，push 不会触发导航，这里兜底清空输入
  router.push({ name: 'home', query: { q } })
  keyword.value = ''
}

/* ---- 键盘：Ctrl/Cmd+K 唤起搜索，Esc 关闭 ---- */
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    searchOpen.value ? closeSearch() : openSearch()
    return
  }
  if (e.key === 'Escape') {
    if (searchOpen.value) closeSearch()
    else if (menuOpen.value) menuOpen.value = false
  }
  // Tab 焦点锁在搜索面板内，避免跑到后面的页面元素上
  if (e.key === 'Tab' && searchOpen.value) trapFocus(e)
}

function trapFocus(e) {
  const panel = document.querySelector('.search-box')
  if (!panel) return
  const items = panel.querySelectorAll('input, button, a[href]')
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

/* ---- 移动端菜单 ---- */
const menuOpen = ref(false)
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  }
)

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

let mediaQuery = null
function onSystemThemeChange(e) {
  // 用户没手动选过主题时，跟随系统
  try {
    if (localStorage.getItem(THEME_KEY)) return
  } catch (_) {
    /* noop */
  }
  applyTheme(e.matches ? 'light' : 'dark')
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

  if (typeof window.matchMedia === 'function') {
    mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    mediaQuery.addEventListener?.('change', onSystemThemeChange)
  }

  onScroll()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('scroll', onScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', onScroll)
  mediaQuery?.removeEventListener?.('change', onSystemThemeChange)
})

const siteTitle = computed(() => site.title)
</script>

<template>
  <header class="hdr" :class="{ scrolled }">
    <div class="container hdr-inner">
      <!-- Logo -->
      <router-link to="/" class="logo" aria-label="返回首页">
        <span class="logo-mark" aria-hidden="true">M</span>
        <span class="logo-text">{{ siteTitle }}</span>
      </router-link>

      <!-- 桌面导航 -->
      <nav class="nav" aria-label="主导航">
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
        <button class="icon-btn" title="搜索 (Ctrl+K)" aria-label="搜索" @click="openSearch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>

        <button
          class="icon-btn"
          :title="theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'"
          :aria-label="theme === 'dark' ? '切换到亮色主题' : '切换到暗色主题'"
          :aria-pressed="theme === 'light'"
          @click="toggleTheme"
        >
          <svg v-if="theme === 'dark'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.7 6.7 0 0 0 9.8 9.8z" />
          </svg>
        </button>

        <button
          class="icon-btn burger"
          :title="menuOpen ? '关闭菜单' : '打开菜单'"
          :aria-label="menuOpen ? '关闭菜单' : '打开菜单'"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <svg v-if="!menuOpen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 移动端菜单 -->
    <transition name="drop">
      <nav v-show="menuOpen" class="mobile-nav" aria-label="移动端导航">
        <router-link
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="mobile-link"
          :class="{ active: isActive(item.to) }"
        >
          {{ item.name }}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </router-link>
      </nav>
    </transition>

    <!-- 搜索面板 -->
    <transition name="pop">
      <div
        v-if="searchOpen"
        class="search-mask"
        role="dialog"
        aria-modal="true"
        aria-label="站内搜索"
        @click.self="closeSearch"
      >
        <div class="search-box">
          <div class="search-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref="searchInput"
              v-model="keyword"
              type="text"
              placeholder="搜索文章标题、标签或正文…"
              aria-label="搜索关键词"
              @keydown.enter="submitSearch"
            />
            <button class="search-close" type="button" title="关闭" aria-label="关闭搜索" @click="closeSearch">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div class="search-hint">
            <span><kbd>Enter</kbd> 搜索全部文章</span>
            <span><kbd>Esc</kbd> 关闭</span>
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
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid transparent;
  transition: border-color var(--t) var(--ease), background-color var(--t) var(--ease);
}

/* 顶部时无边界，下滑后长出描边 —— 滚动感更干净 */
.hdr.scrolled {
  border-bottom-color: var(--border);
  background: color-mix(in srgb, var(--bg) 92%, transparent);
}

.hdr-inner {
  height: var(--header-h);
  display: flex;
  align-items: center;
  gap: var(--sp-6);
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text);
  font-weight: 650;
  font-size: 15.5px;
  letter-spacing: -0.01em;
  flex-shrink: 0;
}

.logo:hover {
  text-decoration: none;
}

.logo-mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent), var(--violet));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 2px 10px -2px var(--accent-glow);
  transition: transform var(--t) var(--ease), box-shadow var(--t) var(--ease);
}

.logo:hover .logo-mark {
  transform: rotate(-6deg) scale(1.04);
  box-shadow: 0 4px 14px -2px var(--accent-glow);
}

/* 导航 */
.nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.nav-link {
  position: relative;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  font-size: 14.5px;
  font-weight: 500;
  transition: color var(--t-fast) var(--ease), background-color var(--t-fast) var(--ease);
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

/* 当前项下方一道短横线，位置感更明确 */
.nav-link.active::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 1px;
  height: 2px;
  border-radius: 2px;
  background: var(--accent);
}

/* 操作按钮 */
.actions {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  margin-left: auto;
}

.icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-dim);
  transition: color var(--t-fast) var(--ease), background-color var(--t-fast) var(--ease),
    border-color var(--t-fast) var(--ease);
}

.icon-btn:hover {
  color: var(--text);
  background: var(--bg-hover);
  border-color: var(--border);
}

.burger {
  display: none;
}

/* 移动端菜单 */
.mobile-nav {
  display: none;
  flex-direction: column;
  padding: var(--sp-2) var(--sp-4) var(--sp-4);
  border-top: 1px solid var(--border);
  background: var(--bg-soft);
}

.mobile-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-dim);
  font-size: 15px;
  transition: color var(--t-fast) var(--ease), background-color var(--t-fast) var(--ease);
}

.mobile-link svg {
  opacity: 0.35;
}

.mobile-link:hover {
  text-decoration: none;
  color: var(--text);
  background: var(--bg-hover);
}

.mobile-link.active {
  color: var(--accent);
  background: var(--accent-soft);
}

.mobile-link.active svg {
  opacity: 1;
}

/* 搜索 */
.search-mask {
  position: fixed;
  inset: 0;
  background: rgba(4, 8, 14, 0.6);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 14vh var(--sp-4) var(--sp-4);
  z-index: 60;
}

.search-box {
  width: min(580px, 100%);
  background: var(--bg-elev);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.search-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: 14px 6px 14px 16px;
  color: var(--text-mute);
}

.search-row input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 15.5px;
  padding: 2px 0;
}

.search-row input::placeholder {
  color: var(--text-mute);
}

.search-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-xs);
  background: transparent;
  color: var(--text-mute);
  transition: color var(--t-fast) var(--ease), background-color var(--t-fast) var(--ease);
}

.search-close:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.search-hint {
  display: flex;
  gap: var(--sp-5);
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  font-size: 12.5px;
  color: var(--text-mute);
  background: var(--bg-soft);
}

kbd {
  display: inline-block;
  padding: 1.5px 6px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  background: var(--bg-elev);
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--text-dim);
}

/* 移动端菜单展开动效 */
.drop-enter-active,
.drop-leave-active {
  transition: opacity var(--t) var(--ease), transform var(--t) var(--ease);
  transform-origin: top;
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* 搜索面板动效 */
.pop-enter-active {
  transition: opacity 0.18s var(--ease);
}

.pop-enter-active .search-box {
  transition: transform 0.22s var(--ease), opacity 0.22s var(--ease);
}

.pop-enter-from {
  opacity: 0;
}

.pop-enter-from .search-box {
  transform: translateY(-10px) scale(0.985);
  opacity: 0;
}

.pop-leave-active {
  transition: opacity 0.14s var(--ease);
}

.pop-leave-to {
  opacity: 0;
}

@media (max-width: 880px) {
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
    gap: var(--sp-4);
  }
}

@media (max-width: 640px) {
  .logo-text {
    display: none;
  }

  .search-mask {
    padding-top: 10vh;
  }

  .search-hint {
    gap: var(--sp-4);
  }
}
</style>

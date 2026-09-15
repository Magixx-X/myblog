import { createRouter, createWebHistory } from 'vue-router'

/**
 * 还原 GitHub Pages 深链。
 *
 * 静态托管上没有服务端路由，直接访问 /posts/xxx 会命中 404.html
 * （由 vite.config.js 的 spaFallback404 插件生成），它把目标路径写进
 * sessionStorage 再跳回根目录。这里必须在 createWebHistory 之前把地址改回来，
 * 这样路由的初始位置就是用户原本要访问的地址。
 *
 * 用 replaceState 而不是 push，是为了不给历史记录留一条多余条目 ——
 * 用户按后退键不会又回到那个 404 页面。
 */
const REDIRECT_KEY = 'blog:spa-redirect'

function restoreDeepLink() {
  let saved = null
  try {
    saved = sessionStorage.getItem(REDIRECT_KEY)
    if (saved) sessionStorage.removeItem(REDIRECT_KEY)
  } catch (_) {
    /* 隐私模式等场景下 sessionStorage 不可用，退化为直接进首页 */
    return
  }
  if (!saved || saved.charAt(0) !== '/') return

  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const target = base + saved
  if (target === window.location.pathname) return

  window.history.replaceState(null, '', target)
}

restoreDeepLink()

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/posts/:slug',
    name: 'post',
    component: () => import('../views/PostView.vue'),
    meta: { title: '文章' }
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('../views/TagsView.vue'),
    meta: { title: '标签' }
  },
  {
    path: '/tags/:tag',
    name: 'tag',
    component: () => import('../views/TagDetailView.vue'),
    meta: { title: '标签' }
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('../views/CategoriesView.vue'),
    meta: { title: '分类' }
  },
  {
    path: '/archive',
    name: 'archive',
    component: () => import('../views/ArchiveView.vue'),
    meta: { title: '归档' }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('../views/AboutView.vue'),
    meta: { title: '关于' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth', top: 80 }
    return { top: 0 }
  }
})

const SITE_TITLE = '我的博客'

router.afterEach((to) => {
  const t = to.meta?.title
  document.title = t && t !== '首页' ? `${t} · ${SITE_TITLE}` : SITE_TITLE
})

export default router

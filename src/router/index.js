import { createRouter, createWebHistory } from 'vue-router'

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

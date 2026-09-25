import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import HomePage from '@/pages/HomePage.vue'
import MenuPage from '@/pages/MenuPage.vue'
import StoresPage from '@/pages/StoresPage.vue'
import StoryPage from '@/pages/StoryPage.vue'
import MemberLoginPage from '@/pages/MemberLoginPage.vue'
import MemberCenterPage from '@/pages/MemberCenterPage.vue'
import NotFoundPage from '@/pages/NotFoundPage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomePage, meta: { title: '首页' } },
  { path: '/menu', name: 'menu', component: MenuPage, meta: { title: '菜单' } },
  { path: '/stores', name: 'stores', component: StoresPage, meta: { title: '门店' } },
  { path: '/story', name: 'story', component: StoryPage, meta: { title: '品牌故事' } },
  { path: '/member/login', name: 'member-login', component: MemberLoginPage, meta: { title: '会员登录' } },
  {
    path: '/member',
    name: 'member',
    component: MemberCenterPage,
    meta: { title: '会员中心', requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage, meta: { title: '页面不存在' } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
})

/** 路由守卫：会员中心需要登录 */
router.beforeEach((to) => {
  const { isLoggedIn } = useAuth()
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return { name: 'member-login', query: { redirect: to.fullPath } }
  }
  return true
})

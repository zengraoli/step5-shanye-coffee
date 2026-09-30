import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { setUnauthorizedHandler } from './api/client'
import { useAuth } from './composables/useAuth'
import './styles/theme.css'
import './styles/base.css'

// 全局 401：清本地会话（client 已处理）并跳回登录页，带上当前路径作为 redirect
setUnauthorizedHandler(() => {
  const { logout } = useAuth()
  logout()
  const current = router.currentRoute.value
  if (current.name === 'member-login') {
    return
  }
  void router.replace({ name: 'member-login', query: { redirect: current.fullPath } })
})

createApp(App).use(router).mount('#app')

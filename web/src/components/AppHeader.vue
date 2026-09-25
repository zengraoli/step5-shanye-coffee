<script setup lang="ts">
import { computed, ref } from 'vue'
import BrandLogo from './BrandLogo.vue'
import { useAuth } from '@/composables/useAuth'

const { state, logout } = useAuth()
const mobileOpen = ref(false)

const links = computed(() => [
  { to: '/', label: '首页' },
  { to: '/menu', label: '菜单' },
  { to: '/stores', label: '门店' },
  { to: '/story', label: '品牌故事' },
])

const closeMobile = () => {
  mobileOpen.value = false
}
</script>

<template>
  <header class="site-header">
    <div class="site-header__inner container">
      <RouterLink to="/" class="brand-mark" @click="closeMobile">
        <BrandLogo :size="34" />
        <span class="brand-mark__text">
          <span class="brand-mark__name">山野咖啡</span>
          <span class="brand-mark__slogan">SHANYE COFFEE</span>
        </span>
      </RouterLink>

      <!-- 桌面端导航 -->
      <nav class="site-nav" aria-label="主导航">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="site-nav__link">
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="site-header__actions">
        <RouterLink v-if="!state.profile" to="/member/login" class="btn btn-outline site-header__login">
          会员登录
        </RouterLink>
        <RouterLink v-else to="/member" class="site-header__user">
          <span class="site-header__avatar">{{ state.profile.nickname.slice(0, 1) }}</span>
          <span class="site-header__username">{{ state.profile.nickname }}</span>
        </RouterLink>

        <!-- 手机端菜单按钮 -->
        <button
          class="site-header__burger"
          :class="{ 'is-open': mobileOpen }"
          aria-label="打开菜单"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = !mobileOpen"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </div>

    <!-- 手机端折叠导航 -->
    <Transition name="slide">
      <nav v-if="mobileOpen" class="site-header__mobile" aria-label="手机端导航">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" @click="closeMobile">
          {{ link.label }}
        </RouterLink>
        <RouterLink v-if="!state.profile" to="/member/login" @click="closeMobile">会员登录</RouterLink>
        <template v-else>
          <RouterLink to="/member" @click="closeMobile">会员中心</RouterLink>
          <button type="button" @click="logout(); closeMobile()">退出登录</button>
        </template>
      </nav>
    </Transition>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgb(250 246 239 / 88%);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-line);
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  height: var(--header-height);
}

.brand-mark__text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-mark__slogan {
  font-size: 9px;
  letter-spacing: 0.28em;
  color: var(--color-text-faint);
}

.site-nav {
  display: none;
  gap: var(--space-2);
  margin-left: var(--space-5);
}

.site-nav__link {
  position: relative;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  transition: color 0.2s ease, background-color 0.2s ease;
}

.site-nav__link:hover {
  color: var(--color-primary);
  background: rgb(74 55 40 / 5%);
}

.site-nav__link.router-link-active {
  color: var(--color-primary-strong);
  font-weight: 500;
}

.site-nav__link.router-link-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -2px;
  width: 14px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-accent);
  transform: translateX(-50%);
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

.site-header__login {
  display: none;
}

.site-header__user {
  display: none;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-primary);
}

.site-header__avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: var(--cream-50);
  font-size: var(--text-sm);
}

.site-header__burger {
  display: grid;
  gap: 5px;
  padding: 8px;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-sm);
  background: transparent;
}

.site-header__burger span {
  display: block;
  width: 18px;
  height: 2px;
  border-radius: 2px;
  background: var(--color-primary);
  transition: transform 0.25s ease, opacity 0.2s ease;
}

.site-header__burger.is-open span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.site-header__burger.is-open span:nth-child(2) {
  opacity: 0;
}

.site-header__burger.is-open span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

.site-header__mobile {
  display: flex;
  flex-direction: column;
  padding: var(--space-3) var(--space-5) var(--space-5);
  border-bottom: 1px solid var(--color-line);
  background: var(--color-surface);
}

.site-header__mobile a,
.site-header__mobile button {
  padding: var(--space-3) var(--space-2);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  font-size: var(--text-base);
  text-align: left;
  color: var(--color-text);
}

.site-header__mobile a.router-link-active {
  color: var(--color-accent-strong);
  font-weight: 500;
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (min-width: 768px) {
  .site-nav {
    display: flex;
  }

  .site-header__login {
    display: inline-flex;
  }
}

@media (min-width: 1024px) {
  .site-header__user {
    display: flex;
  }

  .site-header__burger {
    display: none;
  }
}
</style>

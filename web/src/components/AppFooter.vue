<script setup lang="ts">
import BrandLogo from './BrandLogo.vue'
</script>

<template>
  <footer class="site-footer">
    <div class="container site-footer__inner">
      <div class="site-footer__brand">
        <BrandLogo :size="40" tone="light" />
        <div>
          <p class="site-footer__name">山野咖啡</p>
          <p class="site-footer__slogan">山野之间，一杯好咖啡。</p>
        </div>
      </div>

      <div class="site-footer__columns">
        <div>
          <h3>关于</h3>
          <RouterLink to="/story">品牌故事</RouterLink>
          <RouterLink to="/stores">门店网络</RouterLink>
        </div>
        <div>
          <h3>点单</h3>
          <RouterLink to="/menu">全部菜单</RouterLink>
          <RouterLink to="/member">会员中心</RouterLink>
        </div>
        <div>
          <h3>联系</h3>
          <span>营业时间 08:00 - 22:00</span>
          <span>会员热线 400-000-0000</span>
        </div>
      </div>
    </div>
    <div class="site-footer__bar">
      <p class="container">© 2026 山野咖啡（虚构品牌，示例数据）· 本网站不收集任何真实个人信息</p>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  margin-top: var(--space-8);
  background: var(--footer-bg);
  color: var(--cream-100);
}

.site-footer__inner {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-7);
}

.site-footer__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.site-footer__name {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  letter-spacing: 0.1em;
}

.site-footer__slogan {
  font-size: var(--text-sm);
  color: rgb(243 236 224 / 65%);
}

.site-footer__columns {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-5);
}

.site-footer__columns h3 {
  margin-bottom: var(--space-3);
  font-size: var(--text-sm);
  letter-spacing: 0.2em;
  color: var(--caramel-300);
}

.site-footer__columns a,
.site-footer__columns span {
  display: block;
  padding-block: 5px;
  font-size: var(--text-sm);
  color: rgb(243 236 224 / 78%);
  transition: color 0.2s ease;
}

.site-footer__columns a:hover {
  color: var(--caramel-300);
}

.site-footer__bar {
  border-top: 1px solid rgb(243 236 224 / 14%);
  padding-block: var(--space-4);
  font-size: var(--text-xs);
  color: rgb(243 236 224 / 55%);
}

@media (min-width: 768px) {
  .site-footer__inner {
    grid-template-columns: 1fr 2fr;
    align-items: start;
  }

  .site-footer__columns {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>

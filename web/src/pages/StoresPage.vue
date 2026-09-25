<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import { fetchStores, type Store } from '@/api/catalog'
import { ApiError } from '@/api/client'

const stores = ref<Store[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    stores.value = await fetchStores()
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '门店加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="stores-page">
    <header class="stores-hero">
      <div class="container">
        <p class="stores-hero__eyebrow">OUR STORES</p>
        <h1 class="stores-hero__title">门店网络</h1>
        <p class="stores-hero__desc">
          三家门店，统一的出品标准。营业状态按北京时间实时计算，到店前建议先确认。
        </p>
      </div>
    </header>

    <!-- 自绘城市示意图 -->
    <div class="container stores-map">
      <svg viewBox="0 0 1200 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="门店分布示意图">
        <rect width="1200" height="320" rx="24" fill="#f3ece0" />
        <!-- 道路 -->
        <path d="M0 180h1200M160 0v320M520 0v320M900 0v320" stroke="#e9dfd0" stroke-width="14" />
        <path d="M0 90c220 40 420-30 640 10s360 60 560 20" stroke="#e9dfd0" stroke-width="10" />
        <!-- 街区 -->
        <rect x="40" y="30" width="90" height="40" rx="8" fill="#e9dfd0" />
        <rect x="200" y="30" width="260" height="40" rx="8" fill="#e9dfd0" />
        <rect x="560" y="30" width="280" height="40" rx="8" fill="#e9dfd0" />
        <rect x="40" y="220" width="90" height="60" rx="8" fill="#e9dfd0" />
        <rect x="200" y="220" width="260" height="60" rx="8" fill="#e9dfd0" />
        <rect x="560" y="220" width="280" height="60" rx="8" fill="#e9dfd0" />
        <!-- 公园 -->
        <circle cx="1010" cy="230" r="56" fill="#dfe8d8" />
        <circle cx="1010" cy="230" r="30" fill="#cddcc2" />
        <!-- 门店标记 -->
        <g v-for="(store, index) in stores" :key="store.id" :transform="`translate(${[300, 700, 1050][index] ?? 300} ${[110, 210, 110][index] ?? 110})`">
          <circle r="26" :fill="store.status === 'open' ? '#4a3728' : '#a68a6d'" />
          <path d="M-9 2l9-9 9 9" stroke="#e8c9a0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          <path d="M-6 1h12v7a6 6 0 0 1-12 0V1z" stroke="#e8c9a0" stroke-width="2.4" fill="none" />
        </g>
      </svg>
      <p class="stores-map__caption">示意图 · 非真实地理比例</p>
    </div>

    <section class="container stores-body">
      <SectionTitle eyebrow="STORES" title="门店列表" desc="点击门店卡片可查看营业时间与地址详情。" />

      <p v-if="loading" class="stores-status">门店加载中…</p>
      <p v-else-if="error" class="stores-status stores-status--error">{{ error }}</p>
      <div v-else class="stores-list">
        <article v-for="store in stores" :key="store.id" class="store-detail">
          <div class="store-detail__main">
            <div class="store-detail__head">
              <h3 class="store-detail__name">{{ store.name }}</h3>
              <span class="chip" :class="store.status === 'open' ? 'chip--open' : 'chip--rest'">
                <i class="store-detail__dot" :class="store.status === 'open' ? 'is-open' : 'is-rest'" />
                {{ store.statusText }}
              </span>
            </div>
            <p class="store-detail__address">{{ store.address }}</p>
            <div class="store-detail__meta">
              <span>营业时间：每日 {{ store.openTime }} - {{ store.closeTime }}</span>
              <span>门店电话：{{ store.phone }}</span>
            </div>
          </div>
          <div class="store-detail__side">
            <p class="store-detail__hours-label">今日营业</p>
            <p class="store-detail__hours">{{ store.openTime }} - {{ store.closeTime }}</p>
            <p class="store-detail__hint">
              {{ store.status === 'open' ? '正在营业，欢迎到店' : '休息中，可先浏览菜单' }}
            </p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stores-hero {
  border-bottom: 1px solid var(--color-line);
  background:
    radial-gradient(circle at 12% 10%, rgb(125 155 106 / 14%), transparent 50%),
    var(--color-surface-muted);
}

.stores-hero__eyebrow {
  padding-top: var(--space-7);
  font-size: var(--text-xs);
  letter-spacing: 0.4em;
  color: var(--color-accent-strong);
}

.stores-hero__title {
  margin-top: var(--space-3);
  font-size: var(--text-3xl);
  color: var(--color-primary-strong);
}

.stores-hero__desc {
  max-width: 520px;
  margin-top: var(--space-3);
  padding-bottom: var(--space-6);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

.stores-map {
  margin-top: var(--space-6);
}

.stores-map svg {
  width: 100%;
  height: auto;
}

.stores-map__caption {
  margin-top: var(--space-2);
  text-align: right;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.stores-body {
  padding-block: var(--space-7);
}

.stores-status {
  padding-block: var(--space-6);
  text-align: center;
  color: var(--color-text-soft);
}

.stores-status--error {
  color: #a4442f;
}

.stores-list {
  display: grid;
  gap: var(--space-4);
}

.store-detail {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.store-detail__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}

.store-detail__name {
  font-size: var(--text-xl);
  color: var(--color-primary-strong);
}

.store-detail__dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
}

.store-detail__dot.is-open {
  background: var(--color-success);
  box-shadow: 0 0 0 3px rgb(95 125 79 / 18%);
}

.store-detail__dot.is-rest {
  background: var(--color-text-faint);
}

.store-detail__address {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.store-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

.store-detail__side {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
}

.store-detail__hours-label {
  font-size: var(--text-xs);
  letter-spacing: 0.18em;
  color: var(--color-text-faint);
}

.store-detail__hours {
  margin-top: var(--space-1);
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-primary);
}

.store-detail__hint {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}

@media (min-width: 768px) {
  .store-detail {
    grid-template-columns: 2fr 1fr;
    align-items: center;
  }
}
</style>

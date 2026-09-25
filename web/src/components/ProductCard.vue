<script setup lang="ts">
import ProductArt from './ProductArt.vue'
import type { Product } from '@/api/catalog'
import { formatMoney } from '@/utils/format'

defineProps<{
  product: Product
  featured?: boolean
}>()
</script>

<template>
  <article class="product-card" :class="{ 'product-card--featured': featured }">
    <div class="product-card__art">
      <ProductArt :category="product.categoryName" :size="96" />
      <span v-if="featured" class="product-card__badge">当季推荐</span>
      <span v-if="product.soldOut" class="product-card__mask">已售罄</span>
    </div>
    <div class="product-card__body">
      <h3 class="product-card__name">{{ product.name }}</h3>
      <p class="product-card__subtitle">{{ product.subtitle || product.description }}</p>
      <div class="product-card__meta">
        <span class="price">{{ formatMoney(product.basePrice) }}</span>
        <span class="product-card__specs">大杯 +¥3.00</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  border-color: var(--caramel-300);
  box-shadow: var(--shadow-md);
}

.product-card--featured {
  border-color: var(--caramel-300);
  background: linear-gradient(180deg, #fffdf9 0%, #faf3e8 100%);
}

.product-card__art {
  position: relative;
  display: grid;
  place-items: center;
  padding-block: var(--space-5);
  background:
    radial-gradient(circle at 50% 120%, rgb(200 155 106 / 16%), transparent 62%),
    var(--color-surface-muted);
}

.product-card__badge {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  border-radius: var(--radius-full);
  padding: 3px 10px;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  background: var(--color-primary);
  color: var(--cream-50);
}

.product-card__mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(43 33 24 / 45%);
  color: var(--cream-50);
  font-size: var(--text-sm);
  letter-spacing: 0.2em;
}

.product-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4) var(--space-5) var(--space-5);
}

.product-card__name {
  font-size: var(--text-lg);
  color: var(--color-primary-strong);
}

.product-card__subtitle {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-card__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-2);
  border-top: 1px dashed var(--color-line-strong);
}

.product-card__meta .price {
  font-size: var(--text-xl);
}

.product-card__specs {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}
</style>

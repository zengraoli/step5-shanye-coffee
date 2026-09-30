<script setup lang="ts">
import { computed } from 'vue'
import ProductArt from './ProductArt.vue'
import type { Product } from '@/api/catalog'
import { formatMoney } from '@/utils/format'
import { findCupGroup, hasCupUpcharge } from '@/utils/spec'

const props = defineProps<{
  product: Product
  featured?: boolean
  /** 是否参与第二杯半价活动 */
  promo?: boolean
}>()

/** 跳转商品详情 */
const detailRoute = computed(() => ({ name: 'product' as const, params: { id: props.product.id } }))

/** 大杯加价角标：仅当规格含杯型且存在加价格式时展示（轻食 / 周边为 []，不标） */
const showCupBadge = computed(() => hasCupUpcharge(props.product.specs))
const cupBadgeText = computed(() => {
  const cup = findCupGroup(props.product.specs)
  const top = cup?.options.reduce((max, option) => Math.max(max, option.extra), 0) ?? 0
  return `大杯 +${formatMoney(top)}`
})
</script>

<template>
  <article class="product-card" :class="{ 'product-card--featured': featured }">
    <RouterLink :to="detailRoute" class="product-card__link">
      <div class="product-card__art">
        <ProductArt :category="product.categoryName" :size="96" />
        <span v-if="featured" class="product-card__badge">当季推荐</span>
        <span v-else-if="promo" class="product-card__promo">第二杯半价</span>
        <span v-if="product.soldOut" class="product-card__mask">已售罄</span>
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">{{ product.name }}</h3>
        <p class="product-card__subtitle">{{ product.subtitle || product.description }}</p>
        <div class="product-card__meta">
          <span class="price">{{ formatMoney(product.basePrice) }}</span>
          <span v-if="showCupBadge" class="product-card__specs">{{ cupBadgeText }}</span>
        </div>
      </div>
    </RouterLink>
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

.product-card__link {
  display: flex;
  flex: 1;
  flex-direction: column;
  color: inherit;
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

.product-card__promo {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  border-radius: var(--radius-full);
  padding: 3px 10px;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
  background: linear-gradient(120deg, var(--caramel-500), var(--caramel-600));
  color: #fff;
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

/* 小屏（390 宽）：收紧卡片内边距与字号，避免换行溢出 */
@media (max-width: 480px) {
  .product-card__art {
    padding-block: var(--space-4);
  }

  .product-card__body {
    gap: var(--space-1);
    padding: var(--space-3) var(--space-4) var(--space-4);
  }

  .product-card__name {
    font-size: var(--text-base);
  }

  .product-card__subtitle {
    font-size: var(--text-xs);
  }

  .product-card__meta {
    padding-top: var(--space-1);
  }

  .product-card__meta .price {
    font-size: var(--text-lg);
  }
}
</style>

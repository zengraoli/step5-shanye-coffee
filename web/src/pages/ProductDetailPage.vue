<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ProductArt from '@/components/ProductArt.vue'
import SectionTitle from '@/components/SectionTitle.vue'
import { fetchProduct, type Product } from '@/api/catalog'
import { fetchPromo, type PromoActivity } from '@/api/promo'
import { ApiError } from '@/api/client'
import { formatMoney } from '@/utils/format'
import { formatSpecOptions } from '@/utils/spec'

const route = useRoute()

const product = ref<Product | null>(null)
const promo = ref<PromoActivity | null>(null)
const loading = ref(true)
const error = ref('')

const productId = computed(() => Number(route.params.id))

/** 规格说明文案，如 “杯型：中杯 / 大杯（+¥3.00）” */
const specLines = computed(() =>
  (product.value?.specs ?? []).map((group) => ({
    key: group.key,
    label: group.label,
    text: formatSpecOptions(group, formatMoney),
  })),
)

const inPromo = computed(() => (product.value && promo.value?.productIds.includes(product.value.id)) ?? false)

/** 售罀 / 下架提示 */
const statusText = computed(() => {
  if (!product.value) {
    return ''
  }
  if (!product.value.onSale) {
    return '该商品已下架，去看看其他饮品吧。'
  }
  if (product.value.soldOut) {
    return '该商品当前门店已售罄，可先浏览其他商品。'
  }
  return ''
})

onMounted(async () => {
  loading.value = true
  error.value = ''
  try {
    const [detail, promoState] = await Promise.all([fetchProduct(productId.value), fetchPromo()])
    product.value = detail
    promo.value = promoState.active ? promoState.activity : null
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '商品加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="product-detail">
    <header class="product-detail__hero">
      <div class="container product-detail__hero-inner">
        <div class="product-detail__art" :class="{ 'product-detail__art--off': product && !product.onSale }">
          <ProductArt :category="product?.categoryName ?? '周边'" :size="180" />
          <span v-if="product?.soldOut" class="product-detail__mask">已售罄</span>
        </div>
        <div class="product-detail__intro">
          <p class="product-detail__eyebrow">SHANYE COFFEE · {{ product?.categoryName ?? '商品详情' }}</p>
          <h1 class="product-detail__name">{{ product?.name ?? '商品详情' }}</h1>
          <p class="product-detail__subtitle">{{ product?.subtitle || '山野之间，一杯好咖啡。' }}</p>
          <p class="product-detail__price price">{{ product ? formatMoney(product.basePrice) : '—' }}</p>
          <div class="product-detail__tags">
            <span v-if="inPromo" class="product-detail__promo">第二杯半价</span>
            <span v-if="product?.soldOut" class="chip chip--rest">已售罄</span>
            <span v-else-if="product" class="chip chip--open">有货</span>
          </div>
          <p v-if="statusText" role="status" class="product-detail__status">{{ statusText }}</p>
        </div>
      </div>
    </header>

    <section class="container product-detail__body">
      <p v-if="loading" class="product-detail__status-text">商品加载中…</p>
      <p v-else-if="error" class="product-detail__status-text product-detail__status-text--error">{{ error }}</p>
      <template v-else-if="product">
        <SectionTitle eyebrow="DESCRIPTION" title="商品介绍" :desc="product.description" />

        <div class="product-detail__specs">
          <h2 class="product-detail__specs-title">规格说明</h2>
          <p v-if="specLines.length === 0" class="product-detail__specs-empty">
            该商品无需选择规格（轻食 / 周边类），按标价直接购买。
          </p>
          <dl v-else class="product-detail__spec-list">
            <div v-for="line in specLines" :key="line.key">
              <dt>{{ line.label }}</dt>
              <dd>{{ line.text }}</dd>
            </div>
          </dl>
          <p class="product-detail__specs-tip">
            <RouterLink to="/menu" class="product-detail__back">← 返回完整菜单</RouterLink>
          </p>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.product-detail__hero {
  border-bottom: 1px solid var(--color-line);
  background:
    radial-gradient(circle at 85% 20%, rgb(200 155 106 / 18%), transparent 55%),
    var(--color-surface-muted);
}

.product-detail__hero-inner {
  display: grid;
  gap: var(--space-5);
  padding-block: var(--space-7);
}

.product-detail__art {
  position: relative;
  display: grid;
  place-items: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  background: var(--color-surface);
}

.product-detail__art--off {
  opacity: 0.55;
}

.product-detail__mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
  background: rgb(43 33 24 / 45%);
  color: var(--cream-50);
  font-size: var(--text-sm);
  letter-spacing: 0.2em;
}

.product-detail__eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.3em;
  color: var(--color-accent-strong);
}

.product-detail__name {
  margin-top: var(--space-3);
  font-size: var(--text-3xl);
  color: var(--color-primary-strong);
}

.product-detail__subtitle {
  margin-top: var(--space-2);
  font-size: var(--text-base);
  color: var(--color-text-soft);
}

.product-detail__price {
  margin-top: var(--space-4);
  font-size: var(--text-3xl);
}

.product-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.product-detail__promo {
  border-radius: var(--radius-full);
  padding: 3px 12px;
  background: linear-gradient(120deg, var(--caramel-500), var(--caramel-600));
  color: #fff;
  font-size: var(--text-xs);
  letter-spacing: 0.08em;
}

.product-detail__status {
  margin-top: var(--space-4);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: rgb(180 68 47 / 10%);
  font-size: var(--text-sm);
  color: #a4442f;
}

.product-detail__body {
  padding-block: var(--space-7);
}

.product-detail__status-text {
  padding-block: var(--space-7);
  text-align: center;
  color: var(--color-text-soft);
}

.product-detail__status-text--error {
  color: #a4442f;
}

.product-detail__specs-title {
  font-size: var(--text-xl);
  color: var(--color-primary-strong);
}

.product-detail__spec-list {
  display: grid;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.product-detail__spec-list > div {
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.product-detail__spec-list dt {
  font-size: var(--text-sm);
  letter-spacing: 0.14em;
  color: var(--color-accent-strong);
}

.product-detail__spec-list dd {
  margin: var(--space-2) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text);
}

.product-detail__specs-empty {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

.product-detail__specs-tip {
  margin-top: var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.product-detail__back {
  color: var(--color-accent-strong);
}

@media (min-width: 1024px) {
  .product-detail__hero-inner {
    grid-template-columns: 320px 1fr;
    align-items: center;
  }
}

@media (max-width: 480px) {
  .product-detail__hero-inner {
    padding-block: var(--space-5);
  }

  .product-detail__art {
    padding: var(--space-4);
  }

  .product-detail__name {
    font-size: var(--text-2xl);
  }

  .product-detail__price {
    font-size: var(--text-2xl);
  }

  .product-detail__spec-list > div {
    padding: var(--space-3);
  }
}
</style>

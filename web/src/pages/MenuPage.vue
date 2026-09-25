<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ProductCard from '@/components/ProductCard.vue'
import SectionTitle from '@/components/SectionTitle.vue'
import ProductArt from '@/components/ProductArt.vue'
import { fetchCategories, fetchProducts, type Category, type Product } from '@/api/catalog'
import { ApiError } from '@/api/client'

const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const activeId = ref<number | 'all'>('all')
const loading = ref(true)
const error = ref('')

const visibleProducts = computed(() =>
  activeId.value === 'all' ? products.value : products.value.filter((item) => item.categoryId === activeId.value),
)

const tabs = computed(() => [
  { id: 'all' as const, name: '全部', count: products.value.length },
  ...categories.value.map((category) => ({
    id: category.id,
    name: category.name,
    count: products.value.filter((item) => item.categoryId === category.id).length,
  })),
])

const activeCategory = computed(() =>
  categories.value.find((category) => category.id === activeId.value),
)

onMounted(async () => {
  try {
    const [categoryList, productResult] = await Promise.all([
      fetchCategories(),
      fetchProducts({ pageSize: 60 }),
    ])
    categories.value = categoryList
    products.value = productResult.list
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '菜单加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="menu-page">
    <!-- 页头 -->
    <header class="menu-hero">
      <div class="container menu-hero__inner">
        <div>
          <p class="menu-hero__eyebrow">OUR MENU</p>
          <h1 class="menu-hero__title">全部菜单</h1>
          <p class="menu-hero__desc">
            24 款现制饮品与轻食，规格可选：中杯 / 大杯（+¥3.00）、冰 / 热、无糖 / 少糖 / 标准糖。
          </p>
        </div>
        <ProductArt category="咖啡" :size="140" class="menu-hero__art" />
      </div>
    </header>

    <div class="container menu-body">
      <!-- 分类切换 -->
      <nav class="menu-tabs" aria-label="商品分类">
        <button
          v-for="tab in tabs"
          :key="String(tab.id)"
          type="button"
          class="menu-tabs__item"
          :class="{ 'is-active': activeId === tab.id }"
          @click="activeId = tab.id"
        >
          {{ tab.name }}
          <span class="menu-tabs__count">{{ tab.count }}</span>
        </button>
      </nav>

      <p v-if="loading" class="menu-status">菜单加载中…</p>
      <p v-else-if="error" class="menu-status menu-status--error">{{ error }}</p>
      <template v-else>
        <SectionTitle
          v-if="activeCategory"
          :eyebrow="activeCategory.name"
          :title="activeCategory.name"
          :desc="`${activeCategory.productCount} 款在售商品`"
        />
        <SectionTitle v-else eyebrow="ALL" title="全部在售" desc="按分类排序，价格单位为元" />

        <div class="menu-grid">
          <ProductCard v-for="product in visibleProducts" :key="product.id" :product="product" />
        </div>
        <p v-if="visibleProducts.length === 0" class="menu-status">该分类暂无在售商品</p>
      </template>
    </div>

    <!-- 规格说明 -->
    <section class="container menu-note">
      <h2 class="menu-note__title">规格与加价</h2>
      <div class="menu-note__grid">
        <div>
          <h3>杯型</h3>
          <p>中杯（默认）/ 大杯 <span class="price">+¥3.00</span></p>
        </div>
        <div>
          <h3>温度</h3>
          <p>冰 / 热，均可选择</p>
        </div>
        <div>
          <h3>糖度</h3>
          <p>无糖 / 少糖 / 标准糖</p>
        </div>
        <div>
          <h3>会员权益</h3>
          <p>消费 1 元积 1 分，最高黑卡享专属优惠券</p>
        </div>
      </div>
      <p class="menu-note__tip">
        完整点单（购物车、优惠券、取餐码）请前往小程序端，官网可先浏览菜单与门店。
      </p>
    </section>
  </div>
</template>

<style scoped>
.menu-hero {
  border-bottom: 1px solid var(--color-line);
  background:
    radial-gradient(circle at 85% 20%, rgb(200 155 106 / 18%), transparent 55%),
    var(--color-surface-muted);
}

.menu-hero__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  padding-block: var(--space-7);
}

.menu-hero__eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.4em;
  color: var(--color-accent-strong);
}

.menu-hero__title {
  margin-top: var(--space-3);
  font-size: var(--text-3xl);
  color: var(--color-primary-strong);
}

.menu-hero__desc {
  max-width: 520px;
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

.menu-hero__art {
  display: none;
}

.menu-body {
  padding-block: var(--space-6);
}

.menu-tabs {
  position: sticky;
  top: var(--header-height);
  z-index: 10;
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-block: var(--space-3);
  margin-bottom: var(--space-5);
  background: rgb(250 246 239 / 92%);
  backdrop-filter: blur(8px);
  scrollbar-width: none;
}

.menu-tabs::-webkit-scrollbar {
  display: none;
}

.menu-tabs__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-full);
  padding: 7px 16px;
  background: var(--color-surface);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  transition: all 0.2s ease;
}

.menu-tabs__item:hover {
  border-color: var(--caramel-500);
  color: var(--color-primary);
}

.menu-tabs__item.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--cream-50);
}

.menu-tabs__count {
  font-size: var(--text-xs);
  opacity: 0.7;
}

.menu-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

.menu-status {
  padding-block: var(--space-6);
  text-align: center;
  color: var(--color-text-soft);
}

.menu-status--error {
  color: #a4442f;
}

.menu-note {
  padding-block: var(--space-7);
}

.menu-note__title {
  font-size: var(--text-xl);
  color: var(--color-primary-strong);
}

.menu-note__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.menu-note__grid > div {
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.menu-note__grid h3 {
  font-size: var(--text-sm);
  letter-spacing: 0.14em;
  color: var(--color-accent-strong);
}

.menu-note__grid p {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.menu-note__tip {
  margin-top: var(--space-4);
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

@media (min-width: 640px) {
  .menu-grid,
  .menu-note__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .menu-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .menu-note__grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .menu-hero__art {
    display: block;
  }
}
</style>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import HeroArt from '@/components/HeroArt.vue'
import ProductCard from '@/components/ProductCard.vue'
import StoreCard from '@/components/StoreCard.vue'
import SectionTitle from '@/components/SectionTitle.vue'
import { fetchProducts, fetchStores, type Product, type Store } from '@/api/catalog'

const featured = ref<Product[]>([])
const stores = ref<Store[]>([])
const loading = ref(true)

/** 当季推荐：优先取带“招牌 / 限定 / 人气”标签的商品，补齐到 6 个 */
function pickFeatured(list: Product[]): Product[] {
  const preferred = list.filter((item) =>
    ['招牌', '限定', '人气', '新品'].some((tag) => item.subtitle.includes(tag)),
  )
  const rest = list.filter((item) => !preferred.includes(item))
  return [...preferred, ...rest].slice(0, 6)
}

onMounted(async () => {
  try {
    const [productResult, storeList] = await Promise.all([
      fetchProducts({ pageSize: 60 }),
      fetchStores(),
    ])
    featured.value = pickFeatured(productResult.list)
    stores.value = storeList
  } catch {
    featured.value = []
    stores.value = []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="home">
    <!-- 品牌主视觉 -->
    <section class="hero">
      <HeroArt />
      <div class="hero__content container">
        <p class="hero__eyebrow">SHANYE COFFEE · 云南SOE</p>
        <h1 class="hero__title">
          山野之间，<br />
          一杯好咖啡。
        </h1>
        <p class="hero__desc">
          从普洱咖啡园到你的手中，只做一件事：把山野的风味，认真地冲煮给你。
        </p>
        <div class="hero__actions">
          <RouterLink to="/menu" class="btn btn-primary">查看菜单</RouterLink>
          <RouterLink to="/stores" class="btn btn-outline">查找门店</RouterLink>
        </div>
        <dl class="hero__stats">
          <div>
            <dt>3</dt>
            <dd>家门店</dd>
          </div>
          <div>
            <dt>24+</dt>
            <dd>杯现制饮品</dd>
          </div>
          <div>
            <dt>3</dt>
            <dd>级会员体系</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- 当季推荐 -->
    <section class="section container">
      <SectionTitle
        eyebrow="SEASONAL PICKS"
        title="当季推荐"
        desc="本季主推：云南SOE单一产区豆，热带水果与红酒香气，适合手冲与奶咖。"
      />
      <div v-if="loading" class="home__skeletons">
        <div v-for="n in 3" :key="n" class="skeleton-card" />
      </div>
      <div v-else class="product-grid">
        <ProductCard
          v-for="(product, index) in featured"
          :key="product.id"
          :product="product"
          :featured="index < 3"
        />
      </div>
      <div class="home__more">
        <RouterLink to="/menu" class="btn btn-ghost">浏览完整菜单 →</RouterLink>
      </div>
    </section>

    <!-- 品牌理念条 -->
    <section class="belief">
      <div class="container belief__inner">
        <div class="belief__item">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M24 6l16 10v16L24 42 8 32V16L24 6z" stroke="#c89b6a" stroke-width="2.4" stroke-linejoin="round" />
            <path d="M24 16v16M16 20l16 8M32 20l-16 8" stroke="#e8c9a0" stroke-width="2" stroke-linecap="round" />
          </svg>
          <h3>单一产区</h3>
          <p>云南普洱自有咖啡园，日晒处理，批次可追溯。</p>
        </div>
        <div class="belief__item">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="16" stroke="#c89b6a" stroke-width="2.4" />
            <path d="M24 12v12l8 5" stroke="#e8c9a0" stroke-width="2.4" stroke-linecap="round" />
          </svg>
          <h3>小批量烘焙</h3>
          <p>每周两烘，出厂 7 天内使用，香气不将就。</p>
        </div>
        <div class="belief__item">
          <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M12 30c0-8 5-14 12-14s12 6 12 14" stroke="#c89b6a" stroke-width="2.4" stroke-linecap="round" />
            <path d="M10 34h28v6H10z" stroke="#e8c9a0" stroke-width="2.4" stroke-linejoin="round" />
          </svg>
          <h3>现制现售</h3>
          <p>每一杯都按订单制作，取餐码一响就知道。</p>
        </div>
      </div>
    </section>

    <!-- 门店入口 -->
    <section class="section container">
      <SectionTitle
        eyebrow="OUR STORES"
        title="找到离你最近的山野"
        desc="三家门店，统一的出品与温度。营业状态实时更新，建议到店前先确认。"
      />
      <div v-if="loading" class="home__skeletons">
        <div v-for="n in 3" :key="n" class="skeleton-card" />
      </div>
      <div v-else class="store-grid">
        <StoreCard v-for="store in stores" :key="store.id" :store="store" />
      </div>
    </section>

    <!-- 会员 CTA -->
    <section class="container">
      <div class="member-cta">
        <div>
          <h2 class="member-cta__title">加入山野会员</h2>
          <p class="member-cta__desc">消费积分、等级权益、专属优惠券，手机号即可登录。</p>
        </div>
        <RouterLink to="/member/login" class="btn btn-accent">立即加入</RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------- 主视觉 ---------- */
.hero {
  position: relative;
  min-height: 560px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
  border-bottom: 1px solid var(--color-line);
}

.hero__content {
  position: relative;
  z-index: 1;
  padding-block: var(--space-8) var(--space-7);
}

.hero__eyebrow,
.hero__content > .hero__eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.42em;
  color: var(--caramel-600);
}

.hero__title {
  margin-top: var(--space-3);
  font-size: var(--text-4xl);
  line-height: 1.18;
  color: var(--brand-900);
  text-shadow: 0 1px 0 rgb(255 253 249 / 60%);
}

.hero__desc {
  max-width: 460px;
  margin-top: var(--space-4);
  font-size: var(--text-base);
  color: #4d4034;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.hero__stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  margin: var(--space-6) 0 0;
}

.hero__stats dt {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--brand-700);
}

.hero__stats dd {
  margin: 0;
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  color: #6f6255;
}

/* ---------- 商品网格 ---------- */
.product-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

.store-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

.home__skeletons {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

.skeleton-card {
  height: 240px;
  border-radius: var(--radius-lg);
  background: linear-gradient(100deg, var(--cream-100) 30%, var(--cream-200) 50%, var(--cream-100) 70%);
  background-size: 220% 100%;
  animation: shimmer 1.6s infinite;
}

@keyframes shimmer {
  to {
    background-position: -220% 0;
  }
}

.home__more {
  margin-top: var(--space-5);
  text-align: center;
}

/* ---------- 理念条 ---------- */
.belief {
  background: var(--brand-900);
  color: var(--cream-100);
}

.belief__inner {
  display: grid;
  gap: var(--space-6);
  padding-block: var(--space-7);
}

.belief__item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.belief__item svg {
  width: 44px;
  height: 44px;
}

.belief__item h3 {
  font-size: var(--text-lg);
  color: var(--caramel-300);
}

.belief__item p {
  font-size: var(--text-sm);
  color: rgb(243 236 224 / 72%);
}

/* ---------- 会员 CTA ---------- */
.member-cta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
  padding: var(--space-6);
  border: 1px solid var(--caramel-300);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 88% 20%, rgb(200 155 106 / 22%), transparent 55%),
    var(--color-surface);
}

.member-cta__title {
  font-size: var(--text-2xl);
  color: var(--color-primary-strong);
}

.member-cta__desc {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

/* ---------- 响应式 ---------- */
@media (min-width: 640px) {
  .product-grid,
  .store-grid,
  .home__skeletons {
    grid-template-columns: repeat(2, 1fr);
  }

  .belief__inner {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .product-grid,
  .home__skeletons {
    grid-template-columns: repeat(3, 1fr);
  }

  .store-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .hero {
    min-height: 620px;
  }
}
</style>

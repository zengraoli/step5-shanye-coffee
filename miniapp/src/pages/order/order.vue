<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { fetchCategories, fetchProducts, fetchStores, type Category, type Product } from '@/api/catalog'
import { ApiError } from '@/api/client'
import { useCart } from '@/composables/useCart'
import { useCurrentStore } from '@/composables/useCurrentStore'
import { buildCartItem } from '@/utils/cart'
import { formatMoney } from '@/utils/format'
import { specExtra, specText, type SpecSelection } from '@/utils/specs'
import TabBar from '@/components/TabBar.vue'

const { currentStore, select } = useCurrentStore()
const cart = useCart()

const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const loading = ref(true)
const error = ref('')
const activeCategory = ref<number>(0)
const toView = ref('')
const cartOpen = ref(false)

/** 规格弹窗状态 */
const specProduct = ref<Product | null>(null)
const specSelection = ref<SpecSelection>({})
const sectionTops = ref<{ id: number; top: number }[]>([])

const isOpen = computed(() => currentStore.value?.status === 'open')
const count = cart.count
const totalFen = cart.totalFen
const cartItems = computed(() => cart.items.value)

const grouped = computed(() =>
  categories.value.map((category) => ({
    category,
    items: products.value.filter((product) => product.categoryId === category.id),
  })),
)

const specUnitPrice = computed(() => {
  if (!specProduct.value) {
    return 0
  }
  return specProduct.value.basePrice + specExtra(specSelection.value, specProduct.value.specs)
})


onMounted(async () => {
  try {
    const [categoryList, productResult] = await Promise.all([fetchCategories(), fetchProducts({ pageSize: 60 })])
    categories.value = categoryList
    products.value = productResult.list
    activeCategory.value = categoryList[0]?.id ?? 0
    // 未选择门店时默认第一家营业中的门店（与首页一致）
    if (!currentStore.value) {
      const storeList = await fetchStores()
      if (storeList.length > 0) {
        select(storeList.find((store) => store.status === 'open') ?? storeList[0]!)
      }
    }
    await nextTick()
    measureSections()
    // scroll-view 内容渲染有延迟，延迟补测一次
    setTimeout(measureSections, 120)
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '菜单加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
})

/**
 * 测量各分类区块相对滚动内容的偏移，用于滚动联动。
 * 查询失败（节点尚未渲染）时静默跳过，由首次滚动时补偿测量。
 */
function measureSections(): void {
  try {
    // 页面作用域查询（scroll-view 内节点在组件作用域下取不到）
    const query = uni.createSelectorQuery()
    query.select('.prods').boundingClientRect()
    query.selectAll('.prod-group').boundingClientRect()
    query.exec((results) => {
      if (!Array.isArray(results) || results.length < 2) {
        return
      }
      const groups = results[1]
      // 未命中时 uni-app 返回页面节点，需按数组类型过滤
      if (!Array.isArray(groups) || groups.length === 0) {
        return
      }
      const list = groups as { dataset: { id: number }; top?: number }[]
      const firstTop = list[0]?.top ?? 0
      sectionTops.value = list.map((node) => ({
        id: Number(node.dataset.id),
        top: (node.top ?? 0) - firstTop,
      }))
    })
  } catch {
    // 测量失败不影响点单主流程
  }
}

const onScroll = (event: CustomEvent<{ scrollTop: number }>) => {
  // 尚未测量成功时先补偿测量，本次不更新高亮（避免被重置）
  if (sectionTops.value.length === 0) {
    measureSections()
    return
  }
  const scrollTop = event.detail.scrollTop
  let current = sectionTops.value[0]?.id ?? activeCategory.value
  for (const section of sectionTops.value) {
    if (section.top <= scrollTop + 24) {
      current = section.id
    }
  }
  activeCategory.value = current
}

const pickCategory = (id: number) => {
  activeCategory.value = id
  toView.value = `cat-${id}`
}

const openSpec = (product: Product) => {
  if (!isOpen.value) {
    uni.showToast({ title: '门店休息中，暂不能点单', icon: 'none' })
    return
  }
  if (product.soldOut) {
    uni.showToast({ title: `${product.name} 已售罄`, icon: 'none' })
    return
  }
  specProduct.value = product
  const defaults: SpecSelection = {}
  for (const group of product.specs) {
    defaults[group.key] = group.options[0]?.value ?? ''
  }
  specSelection.value = defaults
}

const closeSpec = () => {
  specProduct.value = null
}

const confirmSpec = () => {
  const product = specProduct.value
  if (!product) {
    return
  }
  cart.add(
    buildCartItem({
      productId: product.id,
      productName: product.name,
      categoryName: product.categoryName,
      basePrice: product.basePrice,
      spec: specSelection.value,
      specText: specText(specSelection.value, product.specs),
      quantity: 1,
    }),
  )
  specProduct.value = null
  uni.showToast({ title: '已加入购物车', icon: 'none' })
}

const decrease = (index: number, quantity: number) => {
  cart.updateQuantity(index, quantity - 1)
}

const increase = (index: number, quantity: number) => {
  cart.updateQuantity(index, quantity + 1)
}

const goCheckout = () => {
  if (cart.items.value.length === 0) {
    return
  }
  if (!isOpen.value) {
    uni.showToast({ title: '门店休息中，暂不能结算', icon: 'none' })
    return
  }
  cartOpen.value = false
  uni.navigateTo({ url: '/pages/checkout/checkout' })
}
</script>

<template>
  <view class="order-page">
    <!-- 门店与营业状态 -->
    <view class="order-store">
      <text class="order-store__name">{{ currentStore?.name ?? '请选择门店' }}</text>
      <text class="chip" :class="isOpen ? 'chip--open' : 'chip--rest'">
        {{ currentStore?.statusText ?? '—' }}
      </text>
    </view>

    <view v-if="loading" class="order-tip">菜单加载中…</view>
    <view v-else-if="error" class="order-tip order-tip--error">{{ error }}</view>

    <template v-else>
      <view class="order-body">
        <!-- 左侧分类 -->
        <scroll-view class="cats" scroll-y enhanced :show-scrollbar="false">
          <view
            v-for="group in grouped"
            :key="group.category.id"
            class="cats__item"
            :class="{ 'is-active': activeCategory === group.category.id }"
            @click="pickCategory(group.category.id)"
          >
            <text class="cats__label">{{ group.category.name }}</text>
            <text class="cats__count">{{ group.items.length }}</text>
          </view>
        </scroll-view>

        <!-- 右侧商品 -->
        <scroll-view
          class="prods"
          scroll-y
          enhanced
          :show-scrollbar="false"
          :scroll-into-view="toView"
          scroll-with-animation
          :scroll-top="0"
          @scroll="onScroll"
        >
          <view v-for="group in grouped" :id="`cat-${group.category.id}`" :key="group.category.id" class="prod-group" :data-id="group.category.id">
            <view class="prod-group__title">
              <text>{{ group.category.name }}</text>
              <text class="prod-group__count">{{ group.items.length }} 款</text>
            </view>
            <view v-for="product in group.items" :key="product.id" class="prod" :class="{ 'is-soldout': product.soldOut }">
              <view class="prod__art" :class="`prod__art--${categoryClass(product.categoryName)}`">
                <view class="prod__cup" />
              </view>
              <view class="prod__body">
                <text class="prod__name">{{ product.name }}</text>
                <text class="prod__sub">{{ product.subtitle || product.description }}</text>
                <text class="prod__price">{{ formatMoney(product.basePrice) }}</text>
              </view>
              <view class="prod__action">
                <text v-if="product.soldOut" class="prod__soldout">售罄</text>
                <view v-else class="prod__add" @click="openSpec(product)">+</view>
              </view>
            </view>
          </view>
          <view class="prods__footer">— 已经到底啦 —</view>
        </scroll-view>
      </view>
    </template>

    <!-- 规格弹窗 -->
    <view v-if="specProduct" class="spec-mask" @click="closeSpec" />
    <view v-if="specProduct" class="spec">
      <view class="spec__head">
        <view class="spec__art">
          <view class="spec__cup" />
        </view>
        <view class="spec__info">
          <text class="spec__name">{{ specProduct.name }}</text>
          <text class="spec__desc">{{ specProduct.description || specProduct.subtitle }}</text>
          <text class="spec__price">{{ formatMoney(specUnitPrice) }}</text>
        </view>
      </view>

      <view v-for="group in specProduct.specs" :key="group.key" class="spec__group">
        <text class="spec__group-title">{{ group.label }}</text>
        <view class="spec__options">
          <view
            v-for="option in group.options"
            :key="option.value"
            class="spec__option"
            :class="{ 'is-active': specSelection[group.key] === option.value }"
            @click="specSelection[group.key] = option.value"
          >
            {{ option.label }}
            <text v-if="option.extra > 0" class="spec__option-extra">+{{ formatMoney(option.extra) }}</text>
          </view>
        </view>
      </view>

      <view class="spec__submit" @click="confirmSpec">加入购物车</view>
    </view>

    <!-- 购物车浮层 -->
    <view v-if="cartOpen" class="cart-mask" @click="cartOpen = false" />
    <view v-if="cartOpen" class="cart-panel">
      <view class="cart-panel__head">
        <text class="cart-panel__title">购物车</text>
        <text class="cart-panel__clear" @click="cart.clear(); cartOpen = false">清空</text>
      </view>
      <scroll-view class="cart-panel__list" scroll-y>
        <view v-for="(item, index) in cartItems" :key="`${item.productId}-${index}`" class="cart-line">
          <view class="cart-line__main">
            <text class="cart-line__name">{{ item.productName }}</text>
            <text class="cart-line__spec">{{ item.specText }}</text>
          </view>
          <text class="cart-line__price">{{ formatMoney(item.unitPrice) }}</text>
          <view class="stepper">
            <text class="stepper__btn" @click="decrease(index, item.quantity)">−</text>
            <text class="stepper__value">{{ item.quantity }}</text>
            <text class="stepper__btn" @click="increase(index, item.quantity)">+</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部购物车栏 -->
    <view class="cart-bar">
      <view class="cart-bar__icon" @click="cartOpen = !cartOpen">
        <view class="cart-bar__cup" />
        <view v-if="count > 0" class="cart-bar__badge">{{ count }}</view>
      </view>
      <view class="cart-bar__info" @click="cartOpen = !cartOpen">
        <text class="cart-bar__total">{{ formatMoney(totalFen) }}</text>
        <text class="cart-bar__hint">{{ count > 0 ? `已选 ${count} 件` : '购物车是空的' }}</text>
      </view>
      <view class="cart-bar__submit" :class="{ 'is-disabled': count === 0 }" @click="goCheckout">
        去结算
      </view>
    </view>

    <TabBar />
  </view>
</template>

<script lang="ts">
function categoryClass(name: string): string {
  if (name === '咖啡') return 'coffee'
  if (name === '茶饮') return 'tea'
  if (name === '轻食') return 'food'
  return 'merch'
}

export default {
  methods: { categoryClass },
}
</script>

<style scoped lang="scss">
.order-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $color-bg;
}

/* ---------- 门店栏 ---------- */
.order-store {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-2 $space-3;
  background: $color-surface;
  border-bottom: 1rpx solid $color-line;
}

.order-store__name {
  font-family: $font-display;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.order-tip {
  padding: $space-5;
  text-align: center;
  color: $color-text-soft;
}

.order-tip--error {
  color: #a4442f;
}

/* ---------- 主体 ---------- */
.order-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.cats {
  width: 176rpx;
  height: 100%;
  background: $cream-100;
}

.cats__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-2;
  transition: background-color 0.2s ease;
}

.cats__item.is-active {
  background: $color-bg;
}

.cats__item.is-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 6rpx;
  height: 32rpx;
  border-radius: 0 4rpx 4rpx 0;
  background: $color-accent;
  transform: translateY(-50%);
}

.cats__label {
  font-size: 26rpx;
  color: $color-text-soft;
}

.cats__item.is-active .cats__label {
  font-weight: 600;
  color: $color-primary-strong;
}

.cats__count {
  font-size: 20rpx;
  color: $color-text-faint;
}

.prods {
  flex: 1;
  height: 100%;
  padding: 0 $space-2 220rpx;
}

.prod-group {
  padding-top: $space-2;
}

.prod-group__title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: $space-1 $space-1 $space-2;
}

.prod-group__title text:first-child {
  font-family: $font-display;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.prod-group__count {
  font-size: 20rpx;
  color: $color-text-faint;
}

.prod {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2;
  margin-bottom: $space-2;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
}

.prod.is-soldout {
  opacity: 0.6;
}

.prod__art {
  display: grid;
  place-items: center;
  width: 140rpx;
  height: 140rpx;
  flex: none;
  border-radius: $radius-sm;
}

.prod__art--coffee {
  background: radial-gradient(circle at 50% 120%, rgb(200 155 106 / 22%), transparent 65%), $cream-100;
}

.prod__art--tea {
  background: radial-gradient(circle at 50% 120%, rgb(125 155 106 / 22%) transparent 65%), #eef3e8;
}

.prod__art--food {
  background: radial-gradient(circle at 50% 120%, rgb(232 201 160 / 35%), transparent 65%), $cream-100;
}

.prod__art--merch {
  background: radial-gradient(circle at 50% 120%, rgb(107 79 58 / 18%), transparent 65%), $cream-100;
}

.prod__cup {
  position: relative;
  width: 52rpx;
  height: 44rpx;
  border-radius: 6rpx 6rpx 18rpx 18rpx;
  background: $paper;
  border: 4rpx solid $brand-700;
}

.prod__cup::after {
  content: '';
  position: absolute;
  top: 4rpx;
  right: -16rpx;
  width: 16rpx;
  height: 16rpx;
  border: 4rpx solid $brand-700;
  border-radius: 50%;
  border-left-color: transparent;
}

.prod__body {
  flex: 1;
  min-width: 0;
}

.prod__name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: $color-text;
}

.prod__sub {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: $color-text-faint;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.prod__price {
  display: block;
  margin-top: 8rpx;
  font-family: $font-display;
  font-weight: 600;
  color: $color-accent-strong;
}

.prod__action {
  flex: none;
}

.prod__soldout {
  font-size: 20rpx;
  color: $color-text-faint;
}

.prod__add {
  display: grid;
  place-items: center;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: $color-primary;
  color: $cream-50;
  font-size: 32rpx;
  line-height: 1;
}

.prods__footer {
  padding: $space-3 0 $space-5;
  text-align: center;
  font-size: 20rpx;
  color: $color-text-faint;
}

/* ---------- 规格弹窗 ---------- */
.spec-mask {
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgb(43 33 24 / 45%);
}

.spec {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 301;
  padding: $space-3 $space-3 calc(32rpx + env(safe-area-inset-bottom));
  border-radius: $radius-lg $radius-lg 0 0;
  background: $color-surface;
}

.spec__head {
  display: flex;
  gap: $space-3;
}

.spec__art {
  display: grid;
  place-items: center;
  width: 160rpx;
  height: 160rpx;
  flex: none;
  border-radius: $radius-md;
  background: radial-gradient(circle at 50% 120%, rgb(200 155 106 / 22%), transparent 65%), $cream-100;
}

.spec__cup {
  position: relative;
  width: 64rpx;
  height: 54rpx;
  border-radius: 6rpx 6rpx 22rpx 22rpx;
  background: $paper;
  border: 4rpx solid $brand-700;
}

.spec__cup::after {
  content: '';
  position: absolute;
  top: 4rpx;
  right: -18rpx;
  width: 18rpx;
  height: 18rpx;
  border: 4rpx solid $brand-700;
  border-radius: 50%;
  border-left-color: transparent;
}

.spec__info {
  flex: 1;
  padding-top: $space-1;
}

.spec__name {
  display: block;
  font-family: $font-display;
  font-size: 34rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.spec__desc {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: $color-text-faint;
}

.spec__price {
  display: block;
  margin-top: 10rpx;
  font-family: $font-display;
  font-size: 36rpx;
  font-weight: 600;
  color: $color-accent-strong;
}

.spec__group {
  margin-top: $space-3;
}

.spec__group-title {
  font-size: 24rpx;
  color: $color-text-soft;
}

.spec__options {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin-top: $space-2;
}

.spec__option {
  border: 1rpx solid $color-line-strong;
  border-radius: $radius-full;
  padding: 8rpx 24rpx;
  background: $color-surface;
  font-size: 24rpx;
  color: $color-text;
}

.spec__option.is-active {
  border-color: $color-primary;
  background: $color-primary;
  color: $cream-50;
}

.spec__option-extra {
  font-size: 20rpx;
  opacity: 0.8;
}

.spec__submit {
  margin-top: $space-4;
  border-radius: $radius-full;
  padding: $space-3;
  text-align: center;
  background: $color-primary;
  color: $cream-50;
  font-size: 28rpx;
  font-weight: 500;
}

/* ---------- 购物车 ---------- */
.cart-mask {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgb(43 33 24 / 35%);
}

.cart-panel {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(110rpx + env(safe-area-inset-bottom));
  z-index: 151;
  max-height: 60vh;
  padding: $space-3;
  border-radius: $radius-lg $radius-lg 0 0;
  background: $color-surface;
  box-shadow: 0 -8rpx 32rpx rgb(43 33 24 / 12%);
}

.cart-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: $space-2;
  border-bottom: 1rpx solid $color-line;
}

.cart-panel__title {
  font-family: $font-display;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.cart-panel__clear {
  font-size: 22rpx;
  color: $color-text-faint;
}

.cart-panel__list {
  max-height: 46vh;
}

.cart-line {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 0;
  border-bottom: 1rpx solid $color-line;
}

.cart-line__main {
  flex: 1;
  min-width: 0;
}

.cart-line__name {
  display: block;
  font-size: 26rpx;
  color: $color-text;
}

.cart-line__spec {
  display: block;
  font-size: 20rpx;
  color: $color-text-faint;
}

.cart-line__price {
  font-family: $font-display;
  font-weight: 600;
  color: $color-accent-strong;
}

.stepper {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.stepper__btn {
  display: grid;
  place-items: center;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: $cream-100;
  color: $color-primary;
  font-size: 28rpx;
  line-height: 1;
}

.stepper__value {
  min-width: 40rpx;
  text-align: center;
  font-size: 26rpx;
  color: $color-text;
}

.cart-bar {
  position: fixed;
  left: $space-3;
  right: $space-3;
  bottom: calc(120rpx + env(safe-area-inset-bottom));
  z-index: 160;
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-2 $space-3;
  border-radius: $radius-full;
  background: $brand-900;
  box-shadow: 0 12rpx 32rpx rgb(43 33 24 / 28%);
}

.cart-bar__icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: $brand-700;
}

.cart-bar__cup {
  position: relative;
  width: 34rpx;
  height: 30rpx;
  border-radius: 4rpx 4rpx 12rpx 12rpx;
  background: $cream-50;
}

.cart-bar__cup::after {
  content: '';
  position: absolute;
  top: 3rpx;
  right: -11rpx;
  width: 12rpx;
  height: 12rpx;
  border: 4rpx solid $cream-50;
  border-radius: 50%;
  border-left-color: transparent;
}

.cart-bar__badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  background: #b4442f;
  color: #fff;
  font-size: 20rpx;
  line-height: 32rpx;
  text-align: center;
}

.cart-bar__info {
  flex: 1;
}

.cart-bar__total {
  display: block;
  font-family: $font-display;
  font-size: 34rpx;
  font-weight: 600;
  color: $caramel-300;
}

.cart-bar__hint {
  display: block;
  font-size: 20rpx;
  color: rgb(243 236 224 / 65%);
}

.cart-bar__submit {
  border-radius: $radius-full;
  padding: 14rpx 36rpx;
  background: $caramel-500;
  color: $brand-900;
  font-size: 28rpx;
  font-weight: 600;
}

.cart-bar__submit.is-disabled {
  background: rgb(200 155 106 / 35%);
  color: rgb(43 33 24 / 55%);
}

/* ---------- 通用 chip ---------- */
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: $radius-full;
  padding: 2rpx 14rpx;
  font-size: 20rpx;
  background: $cream-100;
  color: $color-text-soft;
}

.chip--open {
  background: rgb(95 125 79 / 14%);
  color: $color-success;
}

.chip--rest {
  background: rgb(43 33 24 / 8%);
  color: $color-text-soft;
}
</style>

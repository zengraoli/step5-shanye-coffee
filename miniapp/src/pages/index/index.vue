<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchProducts, fetchStores, type Product, type Store } from '@/api/catalog'
import { ApiError } from '@/api/client'
import { useCurrentStore } from '@/composables/useCurrentStore'
import { formatMoney } from '@/utils/format'
import { pickFeatured } from '@/utils/recommend'
import TabBar from '@/components/TabBar.vue'

const { currentStore, select } = useCurrentStore()

const stores = ref<Store[]>([])
const products = ref<Product[]>([])
const loading = ref(true)
const error = ref('')
const pickerOpen = ref(false)

const featured = computed(() =>
  currentStore.value ? pickFeatured(products.value, currentStore.value.id, 4) : [],
)
const isOpen = computed(() => currentStore.value?.status === 'open')

onMounted(async () => {
  try {
    const [storeList, productResult] = await Promise.all([fetchStores(), fetchProducts({ pageSize: 60 })])
    stores.value = storeList
    products.value = productResult.list
    // 未选择门店时默认第一家营业中的门店
    if (!currentStore.value && storeList.length > 0) {
      select(storeList.find((store) => store.status === 'open') ?? storeList[0]!)
    }
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
})

const chooseStore = (store: Store) => {
  select(store)
  pickerOpen.value = false
}

const go = (url: string) => {
  uni.reLaunch({ url })
}

const goOrder = () => {
  if (!isOpen.value) {
    uni.showToast({ title: '门店休息中，暂不能点单', icon: 'none' })
    return
  }
  go('/pages/order/order')
}
</script>

<template>
  <view class="home">
    <!-- 门店选择栏 -->
    <view class="store-bar" @click="pickerOpen = true">
      <view class="store-bar__info">
        <text class="store-bar__name">{{ currentStore?.name ?? '选择门店' }}</text>
        <view class="store-bar__meta">
          <text class="chip" :class="isOpen ? 'chip--open' : 'chip--rest'">
            {{ currentStore?.statusText ?? '—' }}
          </text>
          <text v-if="currentStore" class="store-bar__hours">
            {{ currentStore.openTime }}-{{ currentStore.closeTime }}
          </text>
        </view>
      </view>
      <text class="store-bar__action">切换 ▾</text>
    </view>

    <!-- 门店选择弹层 -->
    <view v-if="pickerOpen" class="picker-mask" @click="pickerOpen = false">
      <view class="picker" @click.stop>
        <view class="picker__head">
          <text class="picker__title">选择门店</text>
          <text class="picker__close" @click="pickerOpen = false">✕</text>
        </view>
        <view
          v-for="store in stores"
          :key="store.id"
          class="picker__item"
          :class="{ 'is-active': currentStore?.id === store.id }"
          @click="chooseStore(store)"
        >
          <view class="picker__item-main">
            <text class="picker__item-name">{{ store.name }}</text>
            <text class="picker__item-addr">{{ store.address }}</text>
            <text class="picker__item-hours">每日 {{ store.openTime }}-{{ store.closeTime }}</text>
          </view>
          <text class="chip" :class="store.status === 'open' ? 'chip--open' : 'chip--rest'">
            {{ store.statusText }}
          </text>
        </view>
      </view>
    </view>

    <!-- 轮播（CSS 自绘） -->
    <swiper class="banner" circular autoplay :interval="4000" indicator-dots indicator-color="rgba(250,246,239,0.5)"
      indicator-active-color="#c89b6a">
      <swiper-item>
        <view class="slide slide--brand">
          <view class="slide__art">
            <view class="slide__sun" />
            <view class="slide__hill slide__hill--far" />
            <view class="slide__hill slide__hill--near" />
            <view class="slide__cup"><view class="slide__cup-handle" /></view>
          </view>
          <view class="slide__text">
            <text class="slide__eyebrow">云南SOE · 当季新豆</text>
            <text class="slide__title">山野之间，一杯好咖啡</text>
            <text class="slide__desc">小批量烘焙，7 天内使用</text>
          </view>
        </view>
      </swiper-item>
      <swiper-item>
        <view class="slide slide--matcha">
          <view class="slide__art">
            <view class="slide__circle slide__circle--a" />
            <view class="slide__circle slide__circle--b" />
            <view class="slide__leaf" />
          </view>
          <view class="slide__text">
            <text class="slide__eyebrow">SEASONAL NEW</text>
            <text class="slide__title">当季限定已上架</text>
            <text class="slide__desc">白桃乌龙气泡 · 生椰丝绒拿铁</text>
          </view>
        </view>
      </swiper-item>
      <swiper-item>
        <view class="slide slide--dark">
          <view class="slide__art">
            <view class="slide__badge slide__badge--gold">金卡</view>
            <view class="slide__badge slide__badge--black">黑卡</view>
          </view>
          <view class="slide__text">
            <text class="slide__eyebrow">MEMBER</text>
            <text class="slide__title">消费 1 元积 1 分</text>
            <text class="slide__desc">等级越高，专属券越多</text>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <!-- 快捷入口 -->
    <view class="quick">
      <view class="quick__item" @click="goOrder">
        <view class="quick__icon quick__icon--cup" />
        <text>去点单</text>
      </view>
      <view class="quick__item" @click="go('/pages/orders/orders')">
        <view class="quick__icon quick__icon--receipt" />
        <text>我的订单</text>
      </view>
      <view class="quick__item" @click="go('/pages/profile/profile')">
        <view class="quick__icon quick__icon--user" />
        <text>会员中心</text>
      </view>
    </view>

    <!-- 营业状态提示 -->
    <view v-if="currentStore && !isOpen" class="rest-tip">
      <text class="rest-tip__icon">☾</text>
      <view>
        <text class="rest-tip__title">门店休息中</text>
        <text class="rest-tip__desc">营业时间为每日 {{ currentStore.openTime }}-{{ currentStore.closeTime }}，可先浏览菜单</text>
      </view>
    </view>

    <!-- 当季推荐 -->
    <view class="section">
      <view class="section__head">
        <text class="section__eyebrow">SEASONAL PICKS</text>
        <text class="section__title">当季推荐</text>
        <text class="section__desc">{{ currentStore ? currentStore.name : '' }} · 本季主推</text>
      </view>

      <view v-if="loading" class="section__loading">加载中…</view>
      <view v-else-if="error" class="section__loading">{{ error }}</view>
      <view v-else class="product-grid">
        <view v-for="product in featured" :key="product.id" class="product-card" @click="go('/pages/order/order')">
          <view class="product-card__art" :class="`product-card__art--${categoryClass(product.categoryName)}`">
            <view class="mini-cup" />
          </view>
          <view class="product-card__body">
            <text class="product-card__name">{{ product.name }}</text>
            <text class="product-card__sub">{{ product.subtitle || product.description }}</text>
            <view class="product-card__foot">
              <text class="price">{{ formatMoney(product.basePrice) }}</text>
              <text v-if="product.soldOut" class="product-card__soldout">售罄</text>
              <view v-else class="product-card__add">+</view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 门店信息 -->
    <view v-if="currentStore" class="store-info">
      <text class="store-info__name">{{ currentStore.name }}</text>
      <text class="store-info__row">地址：{{ currentStore.address }}</text>
      <text class="store-info__row">电话：{{ currentStore.phone }}</text>
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
.home {
  min-height: 100vh;
  padding: $space-3 $space-3 200rpx;
  background: $color-bg;
}

/* ---------- 门店选择栏 ---------- */
.store-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-3;
  border-radius: $radius-lg;
  background: linear-gradient(135deg, $brand-700, $brand-900);
  color: $cream-50;
  box-shadow: 0 8rpx 24rpx rgb(43 33 24 / 18%);
}

.store-bar__name {
  font-family: $font-display;
  font-size: 32rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.store-bar__meta {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-top: 8rpx;
}

.store-bar__hours {
  font-size: 22rpx;
  color: rgb(243 236 224 / 70%);
}

.store-bar__action {
  font-size: 24rpx;
  color: $caramel-300;
}

/* ---------- 弹层 ---------- */
.picker-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
  background: rgb(43 33 24 / 45%);
}

.picker {
  width: 100%;
  max-height: 70vh;
  overflow-y: auto;
  padding: $space-3 $space-3 calc(40rpx + env(safe-area-inset-bottom));
  border-radius: $radius-lg $radius-lg 0 0;
  background: $color-surface;
}

.picker__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: $space-2;
}

.picker__title {
  font-family: $font-display;
  font-size: 34rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.picker__close {
  padding: 8rpx 16rpx;
  color: $color-text-faint;
}

.picker__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  padding: $space-3 $space-2;
  border-bottom: 1rpx solid $color-line;
}

.picker__item.is-active .picker__item-name {
  color: $color-accent-strong;
  font-weight: 600;
}

.picker__item-main {
  flex: 1;
}

.picker__item-name {
  display: block;
  font-size: 28rpx;
  color: $color-text;
}

.picker__item-addr,
.picker__item-hours {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: $color-text-faint;
}

/* ---------- 轮播 ---------- */
.banner {
  height: 320rpx;
  margin-top: $space-3;
  border-radius: $radius-lg;
  overflow: hidden;
}

.slide {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.slide--brand {
  background: linear-gradient(160deg, #f9eedd, #f3dfc4);
}

.slide--matcha {
  background: linear-gradient(160deg, #eef3e8, #dfe8d8);
}

.slide--dark {
  background: linear-gradient(160deg, #4a3728, #2b2118);
}

.slide__art {
  position: absolute;
  inset: 0;
}

.slide__sun {
  position: absolute;
  top: 24rpx;
  right: 60rpx;
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  background: radial-gradient(circle, #e8b87d 40%, rgb(232 184 125 / 0%) 72%);
}

.slide__hill {
  position: absolute;
  bottom: 178rpx;
  width: 160rpx;
  height: 160rpx;
  border-radius: 26rpx;
  transform: rotate(45deg);
}

.slide__hill--far {
  left: 300rpx;
  background: rgb(168 138 109 / 40%);
}

.slide__hill--near {
  left: 390rpx;
  background: rgb(107 79 58 / 45%);
}

.slide__cup {
  position: absolute;
  right: 70rpx;
  bottom: 40rpx;
  width: 64rpx;
  height: 60rpx;
  border-radius: 8rpx 8rpx 24rpx 24rpx;
  background: $paper;
  border: 4rpx solid $brand-900;
}

.slide__cup-handle {
  position: absolute;
  top: 6rpx;
  right: -22rpx;
  width: 22rpx;
  height: 22rpx;
  border: 5rpx solid $brand-900;
  border-radius: 50%;
  border-left-color: transparent;
}

.slide__circle {
  position: absolute;
  border-radius: 50%;
}

.slide__circle--a {
  top: 40rpx;
  right: 80rpx;
  width: 120rpx;
  height: 120rpx;
  background: rgb(125 155 106 / 35%);
}

.slide__circle--b {
  bottom: -30rpx;
  left: 60rpx;
  width: 160rpx;
  height: 160rpx;
  background: rgb(95 125 79 / 45%);
}

.slide__leaf {
  position: absolute;
  top: 90rpx;
  left: 120rpx;
  width: 70rpx;
  height: 70rpx;
  border-radius: 4rpx 40rpx 4rpx 40rpx;
  background: $matcha-600;
  transform: rotate(-20deg);
}

.slide__badge {
  position: absolute;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-family: $font-display;
  font-weight: 600;
}

.slide__badge--gold {
  top: 50rpx;
  right: 110rpx;
  width: 96rpx;
  height: 96rpx;
  background: linear-gradient(135deg, #e8c9a0, #c89b6a);
  color: $brand-900;
  font-size: 30rpx;
}

.slide__badge--black {
  bottom: 30rpx;
  right: 190rpx;
  width: 72rpx;
  height: 72rpx;
  background: linear-gradient(135deg, #4a3728, #2b2118);
  color: $caramel-300;
  font-size: 24rpx;
  border: 2rpx solid $caramel-300;
}

.slide__text {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  padding: 48rpx 40rpx 28rpx;
  background: linear-gradient(
    180deg,
    rgb(249 238 221 / 0%) 0%,
    rgb(249 238 221 / 62%) 24%,
    rgb(249 238 221 / 92%) 52%,
    rgb(249 238 221 / 97%) 100%
  );
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.slide--dark .slide__text {
  color: $cream-50;
}

.slide__eyebrow {
  font-size: 20rpx;
  letter-spacing: 6rpx;
  color: $caramel-600;
}

.slide--dark .slide__eyebrow {
  color: $caramel-300;
}

.slide__title {
  font-family: $font-display;
  font-size: 40rpx;
  font-weight: 600;
  color: $brand-900;
}

.slide--dark .slide__title {
  color: $cream-50;
}

.slide__desc {
  font-size: 22rpx;
  color: $color-text-soft;
}

.slide--dark .slide__desc {
  color: rgb(243 236 224 / 72%);
}

/* ---------- 快捷入口 ---------- */
.quick {
  display: flex;
  gap: $space-2;
  margin-top: $space-3;
}

.quick__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: $space-3 $space-2;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
  font-size: 24rpx;
  color: $color-text;
}

.quick__icon {
  position: relative;
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  background: $cream-100;
}

.quick__icon--cup::after {
  content: '';
  position: absolute;
  left: 10rpx;
  top: 10rpx;
  width: 18rpx;
  height: 20rpx;
  border-radius: 3rpx 3rpx 8rpx 8rpx;
  background: $brand-700;
}

.quick__icon--receipt::after {
  content: '';
  position: absolute;
  left: 11rpx;
  top: 8rpx;
  width: 22rpx;
  height: 28rpx;
  border-radius: 4rpx;
  background: $brand-700;
}

.quick__icon--user::after {
  content: '';
  position: absolute;
  left: 11rpx;
  top: 8rpx;
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  background: $brand-700;
}

/* ---------- 休息提示 ---------- */
.rest-tip {
  display: flex;
  align-items: center;
  gap: $space-3;
  margin-top: $space-3;
  padding: $space-3;
  border-radius: $radius-md;
  background: rgb(43 33 24 / 6%);
}

.rest-tip__icon {
  font-size: 40rpx;
  color: $color-text-faint;
}

.rest-tip__title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $color-text;
}

.rest-tip__desc {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: $color-text-soft;
}

/* ---------- 分区 ---------- */
.section {
  margin-top: $space-4;
}

.section__head {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  margin-bottom: $space-3;
}

.section__eyebrow {
  font-size: 20rpx;
  letter-spacing: 8rpx;
  color: $color-accent-strong;
}

.section__title {
  font-family: $font-display;
  font-size: 38rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.section__desc {
  font-size: 22rpx;
  color: $color-text-faint;
}

.section__loading {
  padding: $space-5 0;
  text-align: center;
  font-size: 24rpx;
  color: $color-text-soft;
}

/* ---------- 商品卡片 ---------- */
.product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-2;
}

.product-card {
  overflow: hidden;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
}

.product-card__art {
  position: relative;
  display: grid;
  place-items: center;
  height: 150rpx;
}

.product-card__art--coffee {
  background: radial-gradient(circle at 50% 120%, rgb(200 155 106 / 22%), transparent 65%), $cream-100;
}

.product-card__art--tea {
  background: radial-gradient(circle at 50% 120%, rgb(125 155 106 / 22%), transparent 65%), #eef3e8;
}

.product-card__art--food {
  background: radial-gradient(circle at 50% 120%, rgb(232 201 160 / 35%), transparent 65%), $cream-100;
}

.product-card__art--merch {
  background: radial-gradient(circle at 50% 120%, rgb(107 79 58 / 18%), transparent 65%), $cream-100;
}

.mini-cup {
  width: 56rpx;
  height: 48rpx;
  border-radius: 6rpx 6rpx 20rpx 20rpx;
  background: $paper;
  border: 4rpx solid $brand-700;
  position: relative;
}

.mini-cup::after {
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

.product-card__body {
  padding: $space-2;
}

.product-card__name {
  display: block;
  font-size: 26rpx;
  font-weight: 500;
  color: $color-text;
}

.product-card__sub {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: $color-text-faint;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.product-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10rpx;
}

.price {
  font-family: $font-display;
  font-weight: 600;
  color: $color-accent-strong;
}

.product-card__soldout {
  font-size: 20rpx;
  color: $color-text-faint;
}

.product-card__add {
  display: grid;
  place-items: center;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: $color-primary;
  color: $cream-50;
  font-size: 28rpx;
  line-height: 1;
}

/* ---------- 门店信息 ---------- */
.store-info {
  margin-top: $space-4;
  padding: $space-3;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
}

.store-info__name {
  display: block;
  font-family: $font-display;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.store-info__row {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $color-text-soft;
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

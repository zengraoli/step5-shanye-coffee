<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

/** 自定义底部导航：图标全部用 CSS 绘制，不依赖任何图片资源 */
const TABS = [
  { key: 'home', path: 'pages/index/index', label: '首页' },
  { key: 'order', path: 'pages/order/order', label: '点单' },
  { key: 'orders', path: 'pages/orders/orders', label: '订单' },
  { key: 'profile', path: 'pages/profile/profile', label: '我的' },
] as const

type TabKey = (typeof TABS)[number]['key']

const currentRoute = ref('')

onShow(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  currentRoute.value = current?.route ?? ''
})

const activeKey = computed<TabKey>(() => {
  const found = TABS.find((tab) => tab.path === currentRoute.value)
  return found?.key ?? 'home'
})

const go = (path: string) => {
  uni.reLaunch({ url: `/pages/${path.replace(/^pages\//, '').replace(/\//g, '/')}` })
}
</script>

<template>
  <view class="tabbar">
    <view
      v-for="tab in TABS"
      :key="tab.key"
      class="tabbar__item"
      :class="{ 'is-active': activeKey === tab.key }"
      @click="go(tab.path)"
    >
      <!-- 自绘图标 -->
      <view class="tab-icon" :class="`tab-icon--${tab.key}`" aria-hidden="true">
        <template v-if="tab.key === 'home'">
          <view class="icon-roof" />
          <view class="icon-body" />
        </template>
        <template v-else-if="tab.key === 'order'">
          <view class="icon-cup">
            <view class="icon-cup__handle" />
          </view>
        </template>
        <template v-else-if="tab.key === 'orders'">
          <view class="icon-receipt">
            <view class="icon-receipt__line" />
            <view class="icon-receipt__line icon-receipt__line--short" />
          </view>
        </template>
        <template v-else>
          <view class="icon-user">
            <view class="icon-user__head" />
            <view class="icon-user__body" />
          </view>
        </template>
      </view>
      <text class="tabbar__label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
  display: flex;
  padding-bottom: env(safe-area-inset-bottom);
  background: $color-surface;
  border-top: 1rpx solid $color-line;
  box-shadow: 0 -4rpx 24rpx rgb(43 33 24 / 6%);
}

.tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 0 10rpx;
  color: $color-text-faint;
  transition: color 0.2s ease;
}

.tabbar__item.is-active {
  color: $color-primary;
}

.tabbar__label {
  font-size: 22rpx;
  letter-spacing: 2rpx;
}

.tabbar__item.is-active .tabbar__label {
  font-weight: 600;
}

/* ---------- 自绘图标 ---------- */
.tab-icon {
  position: relative;
  width: 44rpx;
  height: 44rpx;
}

/* 首页：房子 */
.icon-roof {
  position: absolute;
  top: 6rpx;
  left: 50%;
  width: 22rpx;
  height: 22rpx;
  background: currentColor;
  transform: translateX(-50%) rotate(45deg);
  border-radius: 4rpx;
}

.icon-body {
  position: absolute;
  bottom: 2rpx;
  left: 50%;
  width: 26rpx;
  height: 18rpx;
  background: currentColor;
  border-radius: 3rpx;
  transform: translateX(-50%);
}

/* 点单：咖啡杯 */
.icon-cup {
  position: absolute;
  top: 8rpx;
  left: 8rpx;
  width: 22rpx;
  height: 24rpx;
  background: currentColor;
  border-radius: 4rpx 4rpx 10rpx 10rpx;
}

.icon-cup__handle {
  position: absolute;
  top: 4rpx;
  right: -10rpx;
  width: 12rpx;
  height: 12rpx;
  border: 4rpx solid currentColor;
  border-radius: 50%;
  border-left-color: transparent;
}

/* 订单：小票 */
.icon-receipt {
  position: absolute;
  top: 4rpx;
  left: 10rpx;
  width: 24rpx;
  height: 34rpx;
  background: currentColor;
  border-radius: 5rpx;
}

.icon-receipt__line {
  position: absolute;
  top: 9rpx;
  left: 6rpx;
  width: 12rpx;
  height: 3rpx;
  border-radius: 2rpx;
  background: $color-surface;
}

.icon-receipt__line--short {
  top: 17rpx;
  width: 8rpx;
}

/* 我的：用户 */
.icon-user {
  position: absolute;
  top: 4rpx;
  left: 8rpx;
  width: 28rpx;
  height: 34rpx;
}

.icon-user__head {
  position: absolute;
  top: 0;
  left: 50%;
  width: 14rpx;
  height: 14rpx;
  background: currentColor;
  border-radius: 50%;
  transform: translateX(-50%);
}

.icon-user__body {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 26rpx;
  height: 16rpx;
  background: currentColor;
  border-radius: 13rpx 13rpx 6rpx 6rpx;
  transform: translateX(-50%);
}
</style>

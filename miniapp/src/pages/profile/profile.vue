<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchMemberCoupons, fetchMemberOrders, fetchPointsSummary, type MemberCoupon, type MemberOrder, type PointsSummary } from '@/api/member'
import { ApiError } from '@/api/client'
import { useAuth } from '@/composables/useAuth'
import { useCart } from '@/composables/useCart'
import { formatBeijingShort, formatMoney } from '@/utils/format'
import TabBar from '@/components/TabBar.vue'

const { state, isLoggedIn, logout } = useAuth()
const cart = useCart()

const summary = ref<PointsSummary | null>(null)
const coupons = ref<MemberCoupon[]>([])
const recentOrders = ref<MemberOrder[]>([])
const loading = ref(false)
const error = ref('')

const profile = computed(() => state.value.profile)

async function load() {
  if (!isLoggedIn()) {
    return
  }
  loading.value = true
  error.value = ''
  try {
    const [points, couponList, orderResult] = await Promise.all([
      fetchPointsSummary(),
      fetchMemberCoupons(),
      fetchMemberOrders({ pageSize: 20 }),
    ])
    summary.value = points
    coupons.value = couponList
    recentOrders.value = orderResult.list
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(load)
onShow(() => {
  if (isLoggedIn()) {
    void load()
  }
})

const goLogin = () => {
  uni.reLaunch({ url: '/pages/login/login?redirect=/pages/profile/profile' })
}

const goOrders = () => {
  uni.reLaunch({ url: '/pages/orders/orders' })
}

const goOrder = () => {
  uni.reLaunch({ url: '/pages/order/order' })
}

const goStory = () => {
  uni.reLaunch({ url: '/pages/index/index' })
}

const openOrder = (id: number) => {
  uni.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
}

const unusedCoupons = computed(() => coupons.value.filter((item) => item.status === 'unused'))

const onLogout = () => {
  logout()
  cart.clear()
  uni.showToast({ title: '已退出登录', icon: 'none' })
}

/** 优惠券规则 */
function couponRule(coupon: MemberCoupon): string {
  if (coupon.type === 'full_reduction') {
    return `满 ${formatMoney(coupon.thresholdFen)} 减 ${formatMoney(coupon.reduceFen)}`
  }
  const max = coupon.maxReduceFen > 0 ? `，最高减 ${formatMoney(coupon.maxReduceFen)}` : ''
  return `${(coupon.discountPercent / 10).toFixed(1)} 折（满 ${formatMoney(coupon.thresholdFen)} 可用${max}）`
}
</script>

<template>
  <view class="profile">
    <!-- 会员卡 / 登录引导 -->
    <view v-if="profile" class="member-card">
      <view class="member-card__top">
        <view class="member-card__avatar">{{ profile.nickname.slice(0, 1) }}</view>
        <view class="member-card__info">
          <text class="member-card__name">{{ profile.nickname }}</text>
          <text class="member-card__phone">{{ profile.maskedPhone }}</text>
        </view>
        <view class="member-card__level">
          <text class="member-card__level-text">{{ profile.levelText }}</text>
          <text class="member-card__level-hint">山野会员</text>
        </view>
      </view>

      <view class="member-card__stats">
        <view class="member-card__stat">
          <text class="member-card__stat-value">{{ profile.points }}</text>
          <text class="member-card__stat-label">当前积分</text>
        </view>
        <view class="member-card__stat">
          <text class="member-card__stat-value">{{ summary ? summary.totalEarned : 0 }}</text>
          <text class="member-card__stat-label">累计获得</text>
        </view>
        <view class="member-card__stat">
          <text class="member-card__stat-value">{{ unusedCoupons.length }}</text>
          <text class="member-card__stat-label">可用券</text>
        </view>
      </view>

      <view class="member-card__progress">
        <view class="member-card__progress-bar">
          <view
            class="member-card__progress-fill"
            :style="{
              width: profile.nextLevel
                ? `${Math.min(100, Math.round((profile.points / (profile.points + profile.pointsToNextLevel)) * 100))}%`
                : '100%',
            }"
          />
        </view>
        <text class="member-card__progress-text">
          <template v-if="profile.nextLevel">
            再积 {{ profile.pointsToNextLevel }} 分升级为{{ profile.nextLevelText }}
          </template>
          <template v-else> 已是最高等级，感谢陪伴 </template>
        </text>
      </view>
    </view>

    <view v-else class="guest" @click="goLogin">
      <view class="guest__avatar">
        <view class="guest__cup" />
      </view>
      <view class="guest__info">
        <text class="guest__title">登录会员中心</text>
        <text class="guest__desc">查看订单、积分、等级与优惠券</text>
      </view>
      <text class="guest__arrow">›</text>
    </view>

    <!-- 快捷入口 -->
    <view class="quick">
      <view class="quick__item" @click="goOrders">
        <view class="quick__icon quick__icon--receipt" />
        <text>我的订单</text>
      </view>
      <view class="quick__item" @click="goOrder">
        <view class="quick__icon quick__icon--cup" />
        <text>去点单</text>
      </view>
      <view class="quick__item" @click="goStory">
        <view class="quick__icon quick__icon--story" />
        <text>品牌故事</text>
      </view>
    </view>

    <!-- 我的优惠券 -->
    <view v-if="profile" class="section">
      <view class="section__head">
        <text class="section__title">我的优惠券</text>
        <text class="section__more" @click="goOrders">去使用 →</text>
      </view>
      <view v-if="loading" class="section__empty">加载中…</view>
      <view v-else-if="coupons.length === 0" class="section__empty">
        还没有优惠券，下单时自动推荐最优券
      </view>
      <view v-else class="coupon-list">
        <view
          v-for="coupon in coupons.slice(0, 4)"
          :key="coupon.id"
          class="coupon-item"
          :class="{ 'coupon-item--used': coupon.status !== 'unused' }"
        >
          <view class="coupon-item__value">
            <template v-if="coupon.type === 'full_reduction'">
              <text class="coupon-item__amount">{{ formatMoney(coupon.reduceFen) }}</text>
              <text class="coupon-item__threshold">满 {{ formatMoney(coupon.thresholdFen) }}</text>
            </template>
            <template v-else>
              <text class="coupon-item__amount">{{ (coupon.discountPercent / 10).toFixed(1) }}折</text>
              <text class="coupon-item__threshold">满 {{ formatMoney(coupon.thresholdFen) }}</text>
            </template>
          </view>
          <view class="coupon-item__body">
            <text class="coupon-item__name">{{ coupon.name }}</text>
            <text class="coupon-item__rule">{{ couponRule(coupon) }}</text>
            <text class="coupon-item__meta">有效期至 {{ formatBeijingShort(coupon.validTo) }}</text>
          </view>
          <text class="coupon-item__status">{{ coupon.statusText }}</text>
        </view>
      </view>
    </view>

    <!-- 最近订单 -->
    <view v-if="profile" class="section">
      <view class="section__head">
        <text class="section__title">最近订单</text>
        <text class="section__more" @click="goOrders">全部订单 →</text>
      </view>
      <view v-if="recentOrders.length === 0" class="section__empty">还没有订单，去点一杯吧</view>
      <view v-else class="order-mini">
        <view
          v-for="order in recentOrders.slice(0, 3)"
          :key="order.id"
          class="order-mini__item"
          @click="openOrder(order.id)"
        >
          <view class="order-mini__main">
            <text class="order-mini__no">{{ order.orderNo }}</text>
            <text class="order-mini__meta">
              {{ order.storeName }} · {{ formatBeijingShort(order.createdAt) }}
            </text>
          </view>
          <view class="order-mini__side">
            <text class="chip" :class="statusClass(order.status)">{{ order.statusText }}</text>
            <text class="order-mini__pay">{{ formatMoney(order.payFen) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 其他 -->
    <view class="menu">
      <view class="menu__item" @click="goStory">
        <text>品牌故事</text>
        <text class="menu__arrow">›</text>
      </view>
      <view class="menu__item" @click="goOrders">
        <text>帮助与联系</text>
        <text class="menu__arrow">›</text>
      </view>
      <view v-if="profile" class="menu__item menu__item--danger" @click="onLogout">
        <text>退出登录</text>
        <text class="menu__arrow">›</text>
      </view>
    </view>

    <view v-if="error" class="profile__error">{{ error }}</view>

    <TabBar />
  </view>
</template>

<script lang="ts">
function statusClass(status: string): string {
  if (status === 'cancelled') return 'chip--rest'
  if (status === 'completed') return 'chip--done'
  if (status === 'pending_pay') return 'chip--rest'
  return 'chip--accent'
}

export default {
  methods: { statusClass },
}
</script>

<style scoped lang="scss">
.profile {
  min-height: 100vh;
  padding: $space-3 $space-3 200rpx;
  background: $color-bg;
}

/* ---------- 会员卡 ---------- */
.member-card {
  position: relative;
  overflow: hidden;
  padding: $space-4;
  border-radius: $radius-lg;
  background:
    radial-gradient(circle at 88% 8%, rgb(232 184 125 / 26%), transparent 45%),
    linear-gradient(150deg, $brand-700, $brand-900);
  color: $cream-50;
  box-shadow: 0 10rpx 28rpx rgb(43 33 24 / 22%);
}

.member-card::after {
  content: '';
  position: absolute;
  right: -50rpx;
  bottom: -70rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  border: 1rpx solid rgb(232 201 160 / 22%);
}

.member-card__top {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.member-card__avatar {
  display: grid;
  place-items: center;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $caramel-300, $caramel-500);
  color: $brand-900;
  font-family: $font-display;
  font-size: 40rpx;
  font-weight: 600;
}

.member-card__info {
  flex: 1;
  min-width: 0;
}

.member-card__name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $cream-50;
}

.member-card__phone {
  display: block;
  margin-top: 2rpx;
  font-size: 22rpx;
  color: rgb(243 236 224 / 70%);
}

.member-card__level {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 20rpx;
  border-radius: $radius-md;
  background: rgb(232 201 160 / 16%);
  border: 1rpx solid rgb(232 201 160 / 35%);
}

.member-card__level-text {
  font-family: $font-display;
  font-size: 28rpx;
  font-weight: 600;
  color: $caramel-300;
}

.member-card__level-hint {
  font-size: 18rpx;
  color: rgb(243 236 224 / 60%);
}

.member-card__stats {
  display: flex;
  margin-top: $space-4;
}

.member-card__stat {
  flex: 1;
  text-align: center;
}

.member-card__stat-value {
  display: block;
  font-family: $font-display;
  font-size: 36rpx;
  font-weight: 600;
  color: $cream-50;
}

.member-card__stat-label {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: rgb(243 236 224 / 62%);
}

.member-card__progress {
  margin-top: $space-4;
}

.member-card__progress-bar {
  height: 8rpx;
  border-radius: 4rpx;
  background: rgb(250 246 239 / 16%);
  overflow: hidden;
}

.member-card__progress-fill {
  height: 100%;
  border-radius: 4rpx;
  background: linear-gradient(90deg, $caramel-500, $caramel-300);
  transition: width 0.4s ease;
}

.member-card__progress-text {
  display: block;
  margin-top: $space-2;
  font-size: 20rpx;
  color: rgb(243 236 224 / 72%);
}

/* ---------- 未登录 ---------- */
.guest {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-4;
  border-radius: $radius-lg;
  background: $color-surface;
  border: 1rpx solid $color-line;
}

.guest__avatar {
  display: grid;
  place-items: center;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: $cream-100;
}

.guest__cup {
  position: relative;
  width: 40rpx;
  height: 34rpx;
  border-radius: 5rpx 5rpx 14rpx 14rpx;
  background: $paper;
  border: 4rpx solid $brand-300;
}

.guest__cup::after {
  content: '';
  position: absolute;
  top: 3rpx;
  right: -13rpx;
  width: 13rpx;
  height: 13rpx;
  border: 4rpx solid $brand-300;
  border-radius: 50%;
  border-left-color: transparent;
}

.guest__info {
  flex: 1;
}

.guest__title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-text;
}

.guest__desc {
  display: block;
  margin-top: 2rpx;
  font-size: 22rpx;
  color: $color-text-faint;
}

.guest__arrow {
  font-size: 40rpx;
  color: $color-text-faint;
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

.quick__icon--story::after {
  content: '';
  position: absolute;
  left: 12rpx;
  top: 12rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 4rpx;
  background: $brand-700;
  transform: rotate(45deg);
}

/* ---------- 分区 ---------- */
.section {
  margin-top: $space-4;
}

.section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: $space-2;
}

.section__title {
  font-family: $font-display;
  font-size: 30rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.section__more {
  font-size: 22rpx;
  color: $color-accent-strong;
}

.section__empty {
  padding: $space-4 0;
  text-align: center;
  font-size: 24rpx;
  color: $color-text-faint;
}

/* ---------- 优惠券 ---------- */
.coupon-list {
  display: grid;
  gap: $space-2;
}

.coupon-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: $space-3;
  padding: $space-3;
  border: 1rpx solid $caramel-300;
  border-radius: $radius-md;
  background: linear-gradient(120deg, #fffdf9, #faf3e8);
}

.coupon-item--used {
  border-color: $color-line;
  background: $color-surface;
  opacity: 0.7;
}

.coupon-item__value {
  display: flex;
  flex-direction: column;
  min-width: 110rpx;
  padding-right: $space-3;
  border-right: 1rpx dashed $color-line;
}

.coupon-item__amount {
  font-family: $font-display;
  font-size: 34rpx;
  font-weight: 600;
  color: $color-accent-strong;
}

.coupon-item__threshold {
  font-size: 20rpx;
  color: $color-text-faint;
}

.coupon-item__body {
  min-width: 0;
}

.coupon-item__name {
  display: block;
  font-size: 26rpx;
  color: $color-text;
}

.coupon-item__rule,
.coupon-item__meta {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: $color-text-faint;
}

.coupon-item__status {
  font-size: 20rpx;
  color: $color-text-faint;
}

/* ---------- 最近订单 ---------- */
.order-mini {
  display: grid;
  gap: $space-2;
}

.order-mini__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-3;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
}

.order-mini__main {
  flex: 1;
  min-width: 0;
}

.order-mini__no {
  display: block;
  font-family: $font-display;
  font-size: 24rpx;
  color: $color-primary;
}

.order-mini__meta {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: $color-text-faint;
}

.order-mini__side {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.order-mini__pay {
  font-family: $font-display;
  font-weight: 600;
  color: $color-accent-strong;
}

/* ---------- 菜单 ---------- */
.menu {
  margin-top: $space-4;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
  overflow: hidden;
}

.menu__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3;
  border-bottom: 1rpx solid $color-line;
  font-size: 26rpx;
  color: $color-text;
}

.menu__item:last-child {
  border-bottom: 0;
}

.menu__item--danger {
  color: #b4442f;
}

.menu__arrow {
  color: $color-text-faint;
}

.profile__error {
  margin-top: $space-3;
  padding: $space-2 $space-3;
  border-radius: $radius-sm;
  background: rgb(180 68 47 / 10%);
  color: #a4442f;
  font-size: 24rpx;
}

/* chip */
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: $radius-full;
  padding: 2rpx 14rpx;
  font-size: 20rpx;
  background: $cream-100;
  color: $color-text-soft;
}

.chip--accent {
  background: rgb(200 155 106 / 18%);
  color: $color-accent-strong;
}

.chip--done {
  background: rgb(95 125 79 / 14%);
  color: $color-success;
}

.chip--rest {
  background: rgb(43 33 24 / 8%);
  color: $color-text-soft;
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchMemberOrders, type MemberOrder } from '@/api/member'
import { cancelOrder, confirmOrder, payOrder } from '@/api/checkout'
import { ApiError } from '@/api/client'
import { useAuth } from '@/composables/useAuth'
import { formatBeijingShort, formatMoney } from '@/utils/format'
import TabBar from '@/components/TabBar.vue'

const { isLoggedIn } = useAuth()

const STATUS_TABS = [
  { value: '', label: '全部' },
  { value: 'pending_pay', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'making', label: '制作中' },
  { value: 'pickable', label: '待取餐' },
  { value: 'completed', label: '已完成' },
] as const

const orders = ref<MemberOrder[]>([])
const activeTab = ref<string>('')
const loading = ref(true)
const error = ref('')
const acting = ref<number | null>(null)

const counts = computed(() => {
  const map: Record<string, number> = {}
  for (const order of orders.value) {
    map[order.status] = (map[order.status] ?? 0) + 1
  }
  return map
})

const visible = computed(() =>
  activeTab.value ? orders.value.filter((order) => order.status === activeTab.value) : orders.value,
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchMemberOrders({ pageSize: 50 })
    orders.value = result.list
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '订单加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/login?redirect=/pages/orders/orders' })
    return
  }
  await load()
})

// 每次显示都刷新：后台推进状态后回到小程序即可看到最新状态
onShow(() => {
  if (isLoggedIn()) {
    void load()
  }
})

const openDetail = (id: number) => {
  uni.navigateTo({ url: `/pages/order-detail/order-detail?id=${id}` })
}

const quickPay = async (order: MemberOrder) => {
  if (acting.value) {
    return
  }
  acting.value = order.id
  try {
    await payOrder(order.id)
    uni.showToast({ title: '支付成功', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: err instanceof ApiError ? err.message : '支付失败', icon: 'none' })
  } finally {
    acting.value = null
  }
}

const quickCancel = async (order: MemberOrder) => {
  if (acting.value) {
    return
  }
  acting.value = order.id
  try {
    await cancelOrder(order.id)
    uni.showToast({ title: '已取消', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: err instanceof ApiError ? err.message : '取消失败', icon: 'none' })
  } finally {
    acting.value = null
  }
}

const quickConfirm = async (order: MemberOrder) => {
  if (acting.value) {
    return
  }
  acting.value = order.id
  try {
    await confirmOrder(order.id)
    uni.showToast({ title: '已确认取餐', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: err instanceof ApiError ? err.message : '操作失败', icon: 'none' })
  } finally {
    acting.value = null
  }
}
</script>

<template>
  <view class="orders">
    <!-- 状态筛选 -->
    <view class="tabs">
      <view
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        class="tabs__item"
        :class="{ 'is-active': activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        <text>{{ tab.label }}</text>
        <text v-if="tab.value && counts[tab.value]" class="tabs__count">{{ counts[tab.value] }}</text>
      </view>
    </view>

    <view v-if="loading" class="orders__tip">加载中…</view>
    <view v-else-if="error" class="orders__tip orders__tip--error">
      <text>{{ error }}</text>
      <view class="orders__retry" @click="load">重试</view>
    </view>
    <view v-else-if="visible.length === 0" class="orders__empty">
      <view class="orders__empty-art" aria-hidden="true">
        <view class="orders__empty-cup" />
      </view>
      <text class="orders__empty-text">还没有相关订单</text>
      <text class="orders__empty-hint">去点一杯试试吧</text>
    </view>

    <view v-else class="orders__list">
      <view v-for="order in visible" :key="order.id" class="order-card" @click="openDetail(order.id)">
        <view class="order-card__head">
          <text class="order-card__no">{{ order.orderNo }}</text>
          <text class="chip" :class="statusClass(order.status)">{{ order.statusText }}</text>
        </view>
        <view class="order-card__store">
          {{ order.storeName }} · {{ order.orderTypeText }} · {{ formatBeijingShort(order.createdAt) }}
        </view>
        <view class="order-card__items">
          <text class="order-card__item">{{ order.items.map((item) => item.productName).join('、') }}</text>
          <text class="order-card__qty">共 {{ order.items.reduce((sum, item) => sum + item.quantity, 0) }} 件</text>
        </view>
        <view class="order-card__foot">
          <text class="order-card__pay">
            实付 <text class="price">{{ formatMoney(order.payFen) }}</text>
          </text>
          <view class="order-card__actions" @click.stop>
            <text v-if="order.pickupCode" class="order-card__code">取餐码 {{ order.pickupCode }}</text>
            <text
              v-if="order.status === 'pending_pay'"
              class="order-card__btn order-card__btn--primary"
              @click="quickPay(order)"
            >
              {{ acting === order.id ? '…' : '去支付' }}
            </text>
            <text
              v-else-if="order.status === 'pickable'"
              class="order-card__btn order-card__btn--primary"
              @click="quickConfirm(order)"
            >
              {{ acting === order.id ? '…' : '确认取餐' }}
            </text>
            <text
              v-if="order.status === 'pending_pay'"
              class="order-card__btn"
              @click="quickCancel(order)"
            >
              取消
            </text>
          </view>
        </view>
      </view>
    </view>

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
.orders {
  min-height: 100vh;
  padding: $space-2 $space-3 200rpx;
  background: $color-bg;
}

/* 状态筛选 */
.tabs {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: $space-1;
  overflow-x: auto;
  padding: $space-2 $space-1;
  background: rgb(250 246 239 / 94%);
  backdrop-filter: blur(8rpx);
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tabs__item {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  flex: none;
  border: 1rpx solid $color-line-strong;
  border-radius: $radius-full;
  padding: 6rpx 20rpx;
  background: $color-surface;
  font-size: 24rpx;
  color: $color-text-soft;
}

.tabs__item.is-active {
  border-color: $color-primary;
  background: $color-primary;
  color: $cream-50;
}

.tabs__count {
  font-size: 20rpx;
  opacity: 0.75;
}

.orders__tip {
  padding: $space-6 0;
  text-align: center;
  color: $color-text-soft;
}

.orders__tip--error {
  color: #a4442f;
}

.orders__retry {
  margin: $space-3 auto 0;
  width: 160rpx;
  padding: $space-1 0;
  border-radius: $radius-full;
  background: $color-primary;
  color: $cream-50;
  font-size: 24rpx;
}

.orders__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  padding: $space-8 0;
}

.orders__empty-art {
  display: grid;
  place-items: center;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: $cream-100;
}

.orders__empty-cup {
  position: relative;
  width: 56rpx;
  height: 48rpx;
  border-radius: 6rpx 6rpx 20rpx 20rpx;
  background: $paper;
  border: 4rpx solid $brand-300;
}

.orders__empty-cup::after {
  content: '';
  position: absolute;
  top: 4rpx;
  right: -16rpx;
  width: 16rpx;
  height: 16rpx;
  border: 4rpx solid $brand-300;
  border-radius: 50%;
  border-left-color: transparent;
}

.orders__empty-text {
  font-size: 28rpx;
  color: $color-text;
}

.orders__empty-hint {
  font-size: 22rpx;
  color: $color-text-faint;
}

/* 订单卡片 */
.orders__list {
  display: grid;
  gap: $space-2;
}

.order-card {
  padding: $space-3;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
  box-shadow: var(--shadow-sm, 0 1rpx 4rpx rgb(43 33 24 / 5%));
}

.order-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
}

.order-card__no {
  font-family: $font-display;
  font-size: 26rpx;
  color: $color-primary;
}

.order-card__store {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $color-text-faint;
}

.order-card__items {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: $space-3;
  margin-top: $space-2;
}

.order-card__item {
  flex: 1;
  font-size: 26rpx;
  color: $color-text;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.order-card__qty {
  flex: none;
  font-size: 22rpx;
  color: $color-text-faint;
}

.order-card__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  margin-top: $space-2;
  padding-top: $space-2;
  border-top: 1rpx dashed $color-line;
}

.order-card__pay {
  font-size: 24rpx;
  color: $color-text-soft;
}

.order-card__pay .price {
  font-size: 30rpx;
}

.order-card__actions {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.order-card__code {
  font-size: 22rpx;
  color: $color-primary;
  font-family: $font-display;
  letter-spacing: 2rpx;
}

.order-card__btn {
  border: 1rpx solid $color-line-strong;
  border-radius: $radius-full;
  padding: 4rpx 20rpx;
  font-size: 22rpx;
  color: $color-text-soft;
}

.order-card__btn--primary {
  border-color: $color-primary;
  background: $color-primary;
  color: $cream-50;
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

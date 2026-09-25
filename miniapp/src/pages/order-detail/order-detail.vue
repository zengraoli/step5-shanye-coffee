<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchMemberOrders, type MemberOrder } from '@/api/member'
import { cancelOrder, confirmOrder, payOrder } from '@/api/checkout'
import { ApiError } from '@/api/client'
import { useAuth } from '@/composables/useAuth'
import { formatBeijingTime, formatMoney } from '@/utils/format'
import TabBar from '@/components/TabBar.vue'

const { isLoggedIn } = useAuth()

const STEPS = [
  { status: 'pending_pay', label: '待支付' },
  { status: 'paid', label: '已支付' },
  { status: 'making', label: '制作中' },
  { status: 'pickable', label: '待取餐' },
  { status: 'completed', label: '已完成' },
] as const

const order = ref<MemberOrder | null>(null)
const loading = ref(true)
const error = ref('')
const acting = ref(false)
const orderId = ref(0)

const currentStep = computed(() => {
  if (!order.value) {
    return -1
  }
  if (order.value.status === 'cancelled') {
    return -1
  }
  return STEPS.findIndex((step) => step.status === order.value?.status)
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await fetchMemberOrders({ pageSize: 50 })
    const found = result.list.find((item) => item.id === orderId.value)
    if (!found) {
      error.value = '订单不存在或已被删除'
      order.value = null
    } else {
      order.value = found
    }
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '订单加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 从页面栈取出当前页参数（onLoad 参数在 options 中）
  const pages = getCurrentPages()
  const current = pages[pages.length - 1] as unknown as { options?: { id?: string } } | undefined
  orderId.value = Number(current?.options?.id ?? 0)
  if (!isLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  await load()
})

// 每次显示都刷新：后台推进状态后回到小程序即可看到最新状态
onShow(() => {
  if (isLoggedIn() && orderId.value > 0) {
    void load()
  }
})

const pay = async () => {
  if (!order.value || acting.value) {
    return
  }
  acting.value = true
  try {
    await payOrder(order.value.id)
    uni.showToast({ title: '支付成功', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: err instanceof ApiError ? err.message : '支付失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

const cancel = async () => {
  if (!order.value || acting.value) {
    return
  }
  const { confirm } = await uni.showModal({ title: '取消订单', content: '确认取消这笔订单吗？' })
  if (!confirm) {
    return
  }
  acting.value = true
  try {
    await cancelOrder(order.value.id)
    uni.showToast({ title: '已取消', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: err instanceof ApiError ? err.message : '取消失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}

const confirm = async () => {
  if (!order.value || acting.value) {
    return
  }
  acting.value = true
  try {
    await confirmOrder(order.value.id)
    uni.showToast({ title: '已确认取餐', icon: 'success' })
    await load()
  } catch (err) {
    uni.showToast({ title: err instanceof ApiError ? err.message : '操作失败', icon: 'none' })
  } finally {
    acting.value = false
  }
}
</script>

<template>
  <view class="detail">
    <view v-if="loading" class="detail__tip">加载中…</view>
    <view v-else-if="error" class="detail__tip detail__tip--error">
      <text>{{ error }}</text>
      <view class="detail__retry" @click="load">重试</view>
    </view>

    <template v-else-if="order">
      <!-- 取餐码 -->
      <view v-if="order.pickupCode && order.status !== 'cancelled'" class="pickup">
        <text class="pickup__label">取餐码</text>
        <text class="pickup__code">{{ order.pickupCode }}</text>
        <text class="pickup__hint">到店后向店员出示取餐码</text>
      </view>

      <!-- 状态进度条 -->
      <view class="progress-card">
        <view class="progress-card__head">
          <text class="progress-card__title">订单进度</text>
          <text class="chip" :class="statusClass(order.status)">{{ order.statusText }}</text>
        </view>

        <view v-if="order.status === 'cancelled'" class="progress-cancelled">
          <text class="progress-cancelled__icon">✕</text>
          <view>
            <text class="progress-cancelled__title">订单已取消</text>
            <text class="progress-cancelled__hint">如有疑问请联系门店</text>
          </view>
        </view>

        <view v-else class="progress">
          <view class="progress__track">
            <view
              class="progress__fill"
              :style="{ width: `${(Math.max(currentStep, 0) / (STEPS.length - 1)) * 100}%` }"
            />
          </view>
          <view class="progress__steps">
            <view
              v-for="(step, index) in STEPS"
              :key="step.status"
              class="progress__step"
              :class="{
                'is-done': index < currentStep,
                'is-current': index === currentStep,
              }"
            >
              <view class="progress__dot">
                <text v-if="index < currentStep">✓</text>
                <text v-else>{{ index + 1 }}</text>
              </view>
              <text class="progress__label">{{ step.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 订单信息 -->
      <view class="card">
        <view class="row">
          <text class="row__label">订单号</text>
          <text class="row__value row__value--mono">{{ order.orderNo }}</text>
        </view>
        <view class="row">
          <text class="row__label">门店</text>
          <text class="row__value">{{ order.storeName }}</text>
        </view>
        <view class="row">
          <text class="row__label">下单方式</text>
          <text class="row__value">{{ order.orderTypeText }}</text>
        </view>
        <view class="row">
          <text class="row__label">下单时间</text>
          <text class="row__value">{{ formatBeijingTime(order.createdAt) }}</text>
        </view>
        <view class="row" v-if="order.remark">
          <text class="row__label">备注</text>
          <text class="row__value">{{ order.remark }}</text>
        </view>
      </view>

      <!-- 商品明细 -->
      <view class="card">
        <view class="card__title">商品明细</view>
        <view v-for="(item, index) in order.items" :key="index" class="line">
          <view class="line__main">
            <text class="line__name">{{ item.productName }}</text>
            <text class="line__spec">{{ item.specText }}</text>
          </view>
          <text class="line__qty">×{{ item.quantity }}</text>
          <text class="line__amount">{{ formatMoney(item.amount) }}</text>
        </view>
        <view class="divider" />
        <view class="row">
          <text class="row__label">商品原价</text>
          <text class="row__value">{{ formatMoney(order.totalFen) }}</text>
        </view>
        <view class="row">
          <text class="row__label">优惠券减免</text>
          <text class="row__value row__value--discount">-{{ formatMoney(order.discountFen) }}</text>
        </view>
        <view class="row row--strong">
          <text class="row__label">实付金额</text>
          <text class="row__value row__value--pay">{{ formatMoney(order.payFen) }}</text>
        </view>
        <view class="row row--muted" v-if="order.coupon">
          <text class="row__label">已用优惠券</text>
          <text class="row__value">{{ order.coupon.name }}（-{{ formatMoney(order.coupon.discountFen) }}）</text>
        </view>
      </view>

      <!-- 时间线 -->
      <view class="card">
        <view class="card__title">订单动态</view>
        <view v-for="entry in order.timeline" :key="entry.status" class="timeline">
          <view class="timeline__dot" />
          <text class="timeline__label">{{ entry.statusText }}</text>
          <text class="timeline__time">{{ formatBeijingTime(entry.time) }}</text>
        </view>
      </view>

      <!-- 操作栏 -->
      <view v-if="order.status !== 'cancelled'" class="actions">
        <text v-if="order.status === 'pending_pay'" class="actions__btn actions__btn--ghost" @click="cancel">
          取消订单
        </text>
        <text v-if="order.status === 'pending_pay'" class="actions__btn actions__btn--primary" @click="pay">
          {{ acting ? '支付中' : `模拟支付 ${formatMoney(order.payFen)}` }}
        </text>
        <text v-if="order.status === 'pickable'" class="actions__btn actions__btn--primary" @click="confirm">
          {{ acting ? '处理中' : '确认取餐' }}
        </text>
        <text v-if="order.status === 'completed'" class="actions__done">订单已完成，感谢品尝</text>
      </view>
      <view v-else class="actions">
        <text class="actions__done">订单已取消</text>
      </view>
    </template>

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
.detail {
  min-height: 100vh;
  padding: $space-2 $space-3 200rpx;
  background: $color-bg;
}

.detail__tip {
  padding: $space-6 0;
  text-align: center;
  color: $color-text-soft;
}

.detail__tip--error {
  color: #a4442f;
}

.detail__retry {
  margin: $space-3 auto 0;
  width: 160rpx;
  padding: $space-1 0;
  border-radius: $radius-full;
  background: $color-primary;
  color: $cream-50;
  font-size: 24rpx;
}

/* 取餐码 */
.pickup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-1;
  margin-bottom: $space-2;
  padding: $space-5 $space-3;
  border-radius: $radius-lg;
  background: linear-gradient(150deg, $brand-700, $brand-900);
  color: $cream-50;
  box-shadow: 0 10rpx 28rpx rgb(43 33 24 / 22%);
}

.pickup__label {
  font-size: 22rpx;
  letter-spacing: 8rpx;
  color: $caramel-300;
}

.pickup__code {
  font-family: $font-display;
  font-size: 84rpx;
  font-weight: 700;
  letter-spacing: 16rpx;
  line-height: 1.2;
  color: $cream-50;
  text-indent: 16rpx;
}

.pickup__hint {
  font-size: 22rpx;
  color: rgb(243 236 224 / 65%);
}

/* 卡片 */
.card {
  margin-bottom: $space-2;
  padding: $space-3;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
}

.card__title {
  margin-bottom: $space-2;
  font-family: $font-display;
  font-size: 28rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  padding: $space-1 0;
  font-size: 26rpx;
}

.row__label {
  color: $color-text-soft;
}

.row__value {
  color: $color-text;
  text-align: right;
}

.row__value--mono {
  font-family: $font-display;
  font-size: 24rpx;
}

.row--strong {
  margin-top: $space-1;
  padding-top: $space-2;
  border-top: 1rpx solid $color-line;
}

.row--muted {
  font-size: 22rpx;
  color: $color-text-faint;
}

.row__value--discount {
  color: #b4442f;
}

.row__value--pay {
  font-family: $font-display;
  font-size: 36rpx;
  font-weight: 600;
  color: $color-accent-strong;
}

.divider {
  height: 1rpx;
  margin: $space-2 0;
  background: $color-line;
}

.line {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-1 0;
}

.line__main {
  flex: 1;
  min-width: 0;
}

.line__name {
  display: block;
  font-size: 26rpx;
  color: $color-text;
}

.line__spec {
  display: block;
  font-size: 20rpx;
  color: $color-text-faint;
}

.line__qty {
  font-size: 24rpx;
  color: $color-text-soft;
}

.line__amount {
  min-width: 110rpx;
  text-align: right;
  font-family: $font-display;
  font-weight: 600;
  color: $color-text;
}

/* 进度条 */
.progress-card {
  margin-bottom: $space-2;
  padding: $space-3;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
}

.progress-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-4;
}

.progress-card__title {
  font-family: $font-display;
  font-size: 28rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.progress {
  padding: 0 $space-1;
}

.progress__track {
  position: relative;
  height: 6rpx;
  border-radius: 3rpx;
  background: $cream-200;
}

.progress__fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  border-radius: 3rpx;
  background: linear-gradient(90deg, $caramel-500, $caramel-600);
  transition: width 0.4s ease;
}

.progress__steps {
  display: flex;
  justify-content: space-between;
  margin-top: -18rpx;
}

.progress__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.progress__dot {
  display: grid;
  place-items: center;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid $cream-200;
  background: $color-surface;
  color: $color-text-faint;
  font-size: 20rpx;
}

.progress__step.is-done .progress__dot {
  border-color: $caramel-500;
  background: $caramel-500;
  color: #fff;
}

.progress__step.is-current .progress__dot {
  border-color: $caramel-600;
  background: $color-surface;
  color: $caramel-600;
  font-weight: 700;
  box-shadow: 0 0 0 6rpx rgb(200 155 106 / 18%);
}

.progress__label {
  font-size: 20rpx;
  color: $color-text-faint;
}

.progress__step.is-current .progress__label {
  color: $caramel-600;
  font-weight: 600;
}

.progress-cancelled {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.progress-cancelled__icon {
  display: grid;
  place-items: center;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgb(180 68 47 / 12%);
  color: #b4442f;
  font-size: 28rpx;
}

.progress-cancelled__title {
  display: block;
  font-size: 26rpx;
  font-weight: 600;
  color: $color-text;
}

.progress-cancelled__hint {
  display: block;
  font-size: 22rpx;
  color: $color-text-faint;
}

/* 时间线 */
.timeline {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-1 0;
  font-size: 24rpx;
}

.timeline__dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: $caramel-500;
}

.timeline__label {
  width: 120rpx;
  color: $color-text;
}

.timeline__time {
  color: $color-text-faint;
}

/* 操作栏 */
.actions {
  display: flex;
  gap: $space-2;
  margin-top: $space-2;
}

.actions__btn {
  flex: 1;
  border-radius: $radius-full;
  padding: $space-2 0;
  text-align: center;
  font-size: 28rpx;
}

.actions__btn--ghost {
  border: 1rpx solid $color-line-strong;
  color: $color-text-soft;
}

.actions__btn--primary {
  background: $color-primary;
  color: $cream-50;
  font-weight: 500;
}

.actions__done {
  flex: 1;
  padding: $space-2 0;
  text-align: center;
  font-size: 24rpx;
  color: $color-text-faint;
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

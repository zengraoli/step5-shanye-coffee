<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { createOrder, payOrder, quoteOrder, type QuoteCoupon, type QuoteResult } from '@/api/checkout'
import { ApiError } from '@/api/client'
import { useAuth } from '@/composables/useAuth'
import { useCart } from '@/composables/useCart'
import { useCurrentStore } from '@/composables/useCurrentStore'
import { formatMoney } from '@/utils/format'
import TabBar from '@/components/TabBar.vue'

const { isLoggedIn } = useAuth();
const cart = useCart();
const { currentStore } = useCurrentStore();

const orderType = ref<'takeout' | 'dine_in'>('takeout');
const remark = ref('');
const quote = ref<QuoteResult | null>(null);
const selectedCouponId = ref<number | null>(null);
const loading = ref(true);
const error = ref('');
const submitting = ref(false);

const cartItems = computed(() => cart.items.value);

/** 优惠券规则描述 */
function couponRule(coupon: QuoteCoupon): string {
  if (coupon.type === 'full_reduction') {
    return `满 ${formatMoney(coupon.thresholdFen)} 减 ${formatMoney(coupon.reduceFen)}`;
  }
  const max = coupon.maxReduceFen > 0 ? `，最高减 ${formatMoney(coupon.maxReduceFen)}` : '';
  return `${(coupon.discountPercent / 10).toFixed(1)} 折（满 ${formatMoney(coupon.thresholdFen)} 可用${max}）`;
}

onMounted(async () => {
  if (!currentStore.value) {
    uni.reLaunch({ url: '/pages/order/order' });
    return;
  }
  if (cart.items.value.length === 0) {
    uni.reLaunch({ url: '/pages/order/order' });
    return;
  }
  if (!isLoggedIn()) {
    // 下单需要登录，跳转登录页并带回跳地址
    uni.reLaunch({ url: '/pages/login/login?redirect=/pages/checkout/checkout' });
    return;
  }
  await loadQuote(null, true);
});

/**
 * 重新报价。
 * @param couponId 用户选择的券（null 表示不使用）
 * @param useBest 是否默认选中服务端推荐的最优券（仅首次进入与切换下单方式时）
 */
async function loadQuote(couponId: number | null = selectedCouponId.value, useBest = false) {
  loading.value = true;
  error.value = '';
  try {
    const result = await quoteOrder({
      storeId: currentStore.value!.id,
      orderType: orderType.value,
      items: cart.items.value.map((item) => ({
        productId: item.productId,
        spec: item.spec,
        quantity: item.quantity,
      })),
      memberCouponId: couponId,
      // 用户主动取消选券时，明确告知服务端不使用优惠券
      withoutCoupon: couponId === null && !useBest ? true : undefined,
    });
    quote.value = result;
    // 首次进入默认最优券；用户手动选择后以服务端确认的选中结果为准
    selectedCouponId.value = useBest ? (result.bestCouponId ?? null) : (result.selectedCouponId ?? null);
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '报价失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

const switchType = (type: 'takeout' | 'dine_in') => {
  orderType.value = type;
  void loadQuote(null, true);
};

const chooseCoupon = (id: number | null) => {
  selectedCouponId.value = id;
  void loadQuote(id);
};

const submit = async () => {
  if (!quote.value || submitting.value) {
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    // 1. 创建订单
    const order = await createOrder({
      storeId: currentStore.value!.id,
      orderType: orderType.value,
      items: cart.items.value.map((item) => ({
        productId: item.productId,
        spec: item.spec,
        quantity: item.quantity,
      })),
      memberCouponId: selectedCouponId.value,
      remark: remark.value.trim() || undefined,
    });
    // 2. 模拟支付
    await payOrder(order.id);
    // 3. 清空购物车并进入订单详情
    cart.clear();
    uni.reLaunch({ url: `/pages/order-detail/order-detail?id=${order.id}` });
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '下单失败，请稍后重试';
    submitting.value = false;
  }
};
</script>

<template>
  <view class="checkout">
    <view v-if="loading" class="checkout__tip">正在计算金额…</view>
    <view v-else-if="error && !quote" class="checkout__tip checkout__tip--error">
      <text>{{ error }}</text>
      <view class="checkout__retry" @click="loadQuote()">重试</view>
    </view>

    <template v-else-if="quote">
      <!-- 门店与方式 -->
      <view class="card">
        <view class="row">
          <text class="row__label">下单门店</text>
          <text class="row__value">{{ quote.storeName }}</text>
        </view>
        <view class="type">
          <view
            class="type__item"
            :class="{ 'is-active': orderType === 'takeout' }"
            @click="switchType('takeout')"
          >
            <text class="type__title">自提</text>
            <text class="type__desc">到店出示取餐码</text>
          </view>
          <view
            class="type__item"
            :class="{ 'is-active': orderType === 'dine_in' }"
            @click="switchType('dine_in')"
          >
            <text class="type__title">堂食</text>
            <text class="type__desc">店内用餐</text>
          </view>
        </view>
      </view>

      <!-- 商品明细 -->
      <view class="card">
        <view class="card__title">商品明细</view>
        <view v-for="(item, index) in cartItems" :key="index" class="line">
          <view class="line__main">
            <text class="line__name">{{ item.productName }}</text>
            <text class="line__spec">{{ item.specText }}</text>
          </view>
          <text class="line__qty">×{{ item.quantity }}</text>
          <text class="line__amount">{{ formatMoney(item.unitPrice * item.quantity) }}</text>
        </view>
      </view>

      <!-- 优惠券 -->
      <view class="card">
        <view class="card__title">优惠券</view>
        <view v-if="quote.coupons.length === 0" class="card__empty">暂无可用优惠券</view>
        <view
          v-for="coupon in quote.coupons"
          :key="coupon.id"
          class="coupon"
          :class="{
            'is-active': selectedCouponId === coupon.id,
            'is-disabled': !coupon.usable || coupon.discountFen <= 0,
          }"
          @click="coupon.usable && coupon.discountFen > 0 && chooseCoupon(selectedCouponId === coupon.id ? null : coupon.id)"
        >
          <view class="coupon__radio" :class="{ 'is-on': selectedCouponId === coupon.id }" />
          <view class="coupon__main">
            <text class="coupon__name">{{ coupon.name }}</text>
            <text class="coupon__rule">{{ couponRule(coupon) }}</text>
          </view>
          <text v-if="coupon.usable && coupon.discountFen > 0" class="coupon__discount">
            -{{ formatMoney(coupon.discountFen) }}
          </text>
          <text v-else class="coupon__unusable">不可用</text>
        </view>
        <view v-if="!isLoggedIn()" class="card__empty">登录后可使用优惠券</view>
      </view>

      <!-- 备注 -->
      <view class="card">
        <view class="card__title">备注</view>
        <input v-model="remark" class="remark" placeholder="选填，如：少冰、打包分开装" maxlength="100" />
      </view>

      <!-- 金额明细 -->
      <view class="card">
        <view class="card__title">金额明细</view>
        <view class="row">
          <text class="row__label">商品原价</text>
          <text class="row__value">{{ formatMoney(quote.totalFen) }}</text>
        </view>
        <view class="row">
          <text class="row__label">活动优惠（第二杯半价）</text>
          <text class="row__value row__value--discount">-{{ formatMoney(quote.promoDiscountFen) }}</text>
        </view>
        <view class="row">
          <text class="row__label">优惠券减免</text>
          <text class="row__value row__value--discount">-{{ formatMoney(quote.discountFen) }}</text>
        </view>
        <view class="row row--strong">
          <text class="row__label">实付金额</text>
          <text class="row__value row__value--pay">{{ formatMoney(quote.payFen) }}</text>
        </view>
        <view class="row row--muted">
          <text class="row__label">预计获得积分</text>
          <text class="row__value">{{ Math.floor(quote.payFen / 100) }} 分</text>
        </view>
      </view>

      <view v-if="error" class="checkout__error">{{ error }}</view>

      <!-- 提交栏 -->
      <view class="submit-bar">
        <view class="submit-bar__info">
          <text class="submit-bar__pay">{{ formatMoney(quote.payFen) }}</text>
          <text class="submit-bar__hint">已优惠 {{ formatMoney(quote.discountFen) }}</text>
        </view>
        <view class="submit-bar__btn" :class="{ 'is-disabled': submitting }" @click="submit">
          {{ submitting ? '支付中' : '模拟支付' }}
        </view>
      </view>
    </template>

    <TabBar />
  </view>
</template>

<style scoped lang="scss">
.checkout {
  min-height: 100vh;
  padding: $space-2 $space-3 240rpx;
  background: $color-bg;
}

.checkout__tip {
  padding: $space-6 $space-3;
  text-align: center;
  color: $color-text-soft;
}

.checkout__tip--error {
  color: #a4442f;
}

.checkout__retry {
  margin: $space-3 auto 0;
  width: 160rpx;
  padding: $space-1 0;
  border-radius: $radius-full;
  background: $color-primary;
  color: $cream-50;
  font-size: 24rpx;
}

.checkout__error {
  margin: $space-2 0;
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  background: rgb(180 68 47 / 10%);
  color: #a4442f;
  font-size: 24rpx;
}

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
}

.row--strong {
  margin-top: $space-1;
  padding-top: $space-2;
  border-top: 1rpx solid $color-line;
}

.row--strong .row__label {
  color: $color-text;
  font-weight: 500;
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

.row--muted {
  font-size: 22rpx;
  color: $color-text-faint;
}

/* 下单方式 */
.type {
  display: flex;
  gap: $space-2;
  margin-top: $space-2;
}

.type__item {
  flex: 1;
  padding: $space-2;
  border: 2rpx solid $color-line-strong;
  border-radius: $radius-md;
  text-align: center;
}

.type__item.is-active {
  border-color: $color-primary;
  background: rgb(74 55 40 / 5%);
}

.type__title {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: $color-text;
}

.type__item.is-active .type__title {
  color: $color-primary-strong;
}

.type__desc {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: $color-text-faint;
}

/* 商品行 */
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

.card__empty {
  padding: $space-2 0;
  font-size: 24rpx;
  color: $color-text-faint;
}

/* 优惠券 */
.coupon {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2;
  margin-bottom: $space-2;
  border: 2rpx solid $color-line;
  border-radius: $radius-md;
  background: $color-surface;
}

.coupon.is-active {
  border-color: $caramel-500;
  background: rgb(200 155 106 / 8%);
}

.coupon.is-disabled {
  opacity: 0.55;
}

.coupon__radio {
  width: 34rpx;
  height: 34rpx;
  flex: none;
  border-radius: 50%;
  border: 2rpx solid $color-line-strong;
}

.coupon__radio.is-on {
  border-color: $caramel-600;
  background: radial-gradient(circle, $caramel-600 0 45%, transparent 50%);
}

.coupon__main {
  flex: 1;
  min-width: 0;
}

.coupon__name {
  display: block;
  font-size: 26rpx;
  color: $color-text;
}

.coupon__rule {
  display: block;
  margin-top: 2rpx;
  font-size: 20rpx;
  color: $color-text-faint;
}

.coupon__discount {
  font-family: $font-display;
  font-weight: 600;
  color: #b4442f;
}

.coupon__unusable {
  font-size: 20rpx;
  color: $color-text-faint;
}

.remark {
  box-sizing: border-box;
  width: 100%;
  border: 1rpx solid $color-line-strong;
  border-radius: $radius-sm;
  padding: $space-2;
  background: $color-bg;
  font-size: 24rpx;
  color: $color-text;
}

/* 提交栏 */
.submit-bar {
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

.submit-bar__info {
  flex: 1;
}

.submit-bar__pay {
  display: block;
  font-family: $font-display;
  font-size: 36rpx;
  font-weight: 600;
  color: $caramel-300;
}

.submit-bar__hint {
  display: block;
  font-size: 20rpx;
  color: rgb(243 236 224 / 65%);
}

.submit-bar__btn {
  border-radius: $radius-full;
  padding: 16rpx 44rpx;
  background: $caramel-500;
  color: $brand-900;
  font-size: 28rpx;
  font-weight: 600;
}

.submit-bar__btn.is-disabled {
  opacity: 0.7;
}
</style>

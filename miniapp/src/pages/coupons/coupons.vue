<template>
  <view class="coupons">
    <view v-if="!loggedIn" class="coupons__guest">
      <text class="coupons__guest-title">登录后查看与领取优惠券</text>
      <view class="coupons__guest-btn" @click="goLogin">
        <text class="coupons__guest-btn-text">去登录</text>
      </view>
    </view>

    <template v-else>
      <view class="coupons__section">
        <text class="coupons__section-title">我的优惠券</text>
        <view v-if="mine.length === 0" class="coupons__empty">还没有优惠券，去下面领一张吧</view>
        <view v-for="item in mine" :key="item.id" class="coupon" :class="{ 'coupon--muted': item.status !== 'unused' }">
          <view class="coupon__left">
            <text class="coupon__amount">{{ couponAmount(item) }}</text>
            <text class="coupon__rule">{{ couponRule(item) }}</text>
          </view>
          <view class="coupon__right">
            <text class="coupon__status">{{ item.statusText }}</text>
            <text class="coupon__valid">{{ formatDate(item.validTo) }} 前有效</text>
          </view>
        </view>
      </view>

      <view class="coupons__section">
        <text class="coupons__section-title">领券中心</text>
        <view v-if="claimable.length === 0" class="coupons__empty">暂时没有可领取的优惠券</view>
        <view v-for="item in claimable" :key="item.id" class="coupon coupon--claim">
          <view class="coupon__left">
            <text class="coupon__amount">{{ couponAmount(item) }}</text>
            <text class="coupon__rule">{{ couponRule(item) }}</text>
            <text class="coupon__valid">领取后 {{ item.validDays }} 天内有效 · 剩余 {{ item.remaining }} 张</text>
          </view>
          <view class="coupon__right">
            <view
              class="coupon__claim"
              :class="{ 'coupon__claim--done': claimedIds.includes(item.id) || item.remaining <= 0 }"
              @click="claim(item)"
            >
              <text class="coupon__claim-text">
                {{ claimedIds.includes(item.id) ? '已领取' : item.remaining <= 0 ? '已领完' : claimingId === item.id ? '领取中' : '领取' }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="tip" class="coupons__tip">{{ tip }}</view>
    </template>

    <TabBar />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  claimCoupon,
  couponRule as ruleText,
  fetchClaimableCoupons,
  fetchMemberCoupons,
  type CouponTemplate,
  type MemberCoupon,
} from '@/api/member'
import { ApiError } from '@/api/client'
import { useAuth } from '@/composables/useAuth'
import { formatBeijingShort } from '@/utils/format'
import TabBar from '@/components/TabBar.vue'

const { isLoggedIn } = useAuth()
const loggedIn = computed(() => isLoggedIn())

const mine = ref<MemberCoupon[]>([])
const claimable = ref<CouponTemplate[]>([])
const claimingId = ref(0)
const tip = ref('')

const claimedIds = computed(() => mine.value.map((item) => item.couponId))

const couponAmount = (coupon: CouponTemplate | MemberCoupon): string => {
  if (coupon.type === 'full_reduction') {
    return `¥${(coupon.reduceFen / 100).toFixed(2)}`
  }
  return `${(coupon.discountPercent / 10).toFixed(1)} 折`
}

const couponRule = (coupon: CouponTemplate | MemberCoupon): string => ruleText(coupon)

const formatDate = (iso: string) => formatBeijingShort(iso).slice(0, 10)

const goLogin = () => {
  uni.navigateTo({ url: '/pages/login/login?redirect=/pages/coupons/coupons' })
}

async function load() {
  if (!loggedIn.value) {
    return
  }
  try {
    const [myList, templates] = await Promise.all([fetchMemberCoupons(), fetchClaimableCoupons()])
    mine.value = myList
    claimable.value = templates.filter((item) => item.status === 'active' && item.remaining > 0)
  } catch (err) {
    tip.value = err instanceof ApiError ? err.message : '加载失败，请稍后重试'
  }
}

async function claim(template: CouponTemplate) {
  if (claimingId.value || claimedIds.value.includes(template.id) || template.remaining <= 0) {
    return
  }
  claimingId.value = template.id
  tip.value = ''
  try {
    await claimCoupon(template.id)
    tip.value = '领取成功，已放入“我的优惠券”'
    await load()
  } catch (err) {
    tip.value = err instanceof ApiError ? err.message : '领取失败，请稍后重试'
  } finally {
    claimingId.value = 0
  }
}

onMounted(load)
onShow(load)
</script>

<style scoped lang="scss">
.coupons {
  min-height: 100vh;
  padding: $space-4 $space-4 140rpx;
  background: $color-bg;
}

.coupons__guest {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 140rpx 0;
}

.coupons__guest-title {
  font-size: 30rpx;
  color: $color-text;
}

.coupons__guest-btn {
  margin-top: $space-4;
  padding: $space-2 $space-5;
  border-radius: $radius-full;
  background: $color-primary;
}

.coupons__guest-btn-text {
  font-size: 28rpx;
  color: $cream-50;
}

.coupons__section {
  margin-bottom: $space-5;
}

.coupons__section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $color-text;
}

.coupons__empty {
  margin-top: $space-3;
  font-size: 24rpx;
  color: $color-text-faint;
}

.coupon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $space-3;
  padding: $space-4;
  border-radius: $radius-md;
  background: $color-surface;
  border: 1rpx solid $color-line;
}

.coupon--muted {
  opacity: 0.55;
}

.coupon__left {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6rpx;
}

.coupon__amount {
  font-size: 36rpx;
  font-weight: 600;
  color: $color-accent-strong;
}

.coupon__rule,
.coupon__valid {
  font-size: 22rpx;
  color: $color-text-soft;
}

.coupon__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
}

.coupon__status {
  font-size: 22rpx;
  color: $color-text-faint;
}

.coupon__claim {
  padding: 10rpx 28rpx;
  border-radius: $radius-full;
  background: $color-primary;
}

.coupon__claim--done {
  background: $color-line-strong;
}

.coupon__claim-text {
  font-size: 24rpx;
  color: $cream-50;
}

.coupons__tip {
  margin-top: $space-3;
  padding: $space-3;
  border-radius: $radius-md;
  background: $cream-100;
  font-size: 22rpx;
  color: $color-text;
  text-align: center;
}
</style>

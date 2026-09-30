<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toAuthRefreshError, useAuth } from '@/composables/useAuth'
import { ApiError } from '@/api/client'
import {
  claimCoupon,
  fetchClaimableCoupons,
  fetchMemberCoupons,
  fetchMemberOrders,
  fetchPointsSummary,
  type ClaimableCoupon,
  type MemberCoupon,
  type MemberOrder,
  type PointsSummary,
} from '@/api/member'
import { formatBeijingTime, formatMoney } from '@/utils/format'

const router = useRouter()
const { state, logout } = useAuth()

const loading = ref(true)
/** '' 正常 / auth 登录态失效 / network 网络或服务不可用 / other 其他错误 */
const errorKind = ref<'' | 'auth' | 'network' | 'other'>('')
const error = ref('')
const summary = ref<PointsSummary | null>(null)
const coupons = ref<MemberCoupon[]>([])
const orders = ref<MemberOrder[]>([])
const claimable = ref<ClaimableCoupon[]>([])
const activeTab = ref<'orders' | 'points' | 'coupons' | 'claim'>('orders')
/** 领取中的券模板 id，避免重复点击 */
const claiming = ref<number | null>(null)
const claimTip = ref('')

const COUPON_TABS: { value: '' | 'unused' | 'used' | 'expired'; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'unused', label: '未使用' },
  { value: 'used', label: '已使用' },
  { value: 'expired', label: '已过期' },
]

const couponTab = ref<'' | 'unused' | 'used' | 'expired'>('')

/** 已领取的券模板 id 集合（会员券接口按 couponId 关联模板） */
const claimedTemplateIds = computed(() => new Set(coupons.value.map((item) => item.couponId)))

/** 某张模板是否已领取 */
const isClaimed = (id: number): boolean => claimedTemplateIds.value.has(id)

/** 模板的优惠文案 */
const couponBenefitText = (template: ClaimableCoupon): string =>
  template.type === 'discount'
    ? `${(template.discountPercent / 10).toFixed(1)} 折${template.maxReduceFen > 0 ? ` · 最高减 ${formatMoney(template.maxReduceFen)}` : ''}`
    : `减 ${formatMoney(template.reduceFen)}`

const progressPercent = () => {
  const profile = state.profile
  if (!profile) {
    return 0
  }
  const next = profile.pointsToNextLevel
  const current = profile.points
  if (next <= 0) {
    return 100
  }
  return Math.min(100, Math.round((current / (current + next)) * 100))
}

/** 领券中心：可领取模板（无需登录）/ 我的优惠券 */
async function loadClaimable() {
  try {
    claimable.value = await fetchClaimableCoupons()
  } catch {
    claimable.value = []
  }
}

async function load() {
  loading.value = true
  errorKind.value = ''
  error.value = ''
  try {
    const [pointsResult, couponList, orderResult] = await Promise.all([
      fetchPointsSummary(),
      fetchMemberCoupons(),
      fetchMemberOrders({ pageSize: 20 }),
    ])
    summary.value = pointsResult
    coupons.value = couponList
    orders.value = orderResult.list
  } catch (err) {
    const failure = toAuthRefreshError(err)
    errorKind.value = failure.kind === 'auth' ? 'auth' : failure.kind === 'network' ? 'network' : 'other'
    error.value = failure.message
  } finally {
    loading.value = false
  }
}

/** 领券：未登录先引导登录，已领取提示，成功后刷新我的优惠券 */
async function onClaim(id: number) {
  if (!state.profile) {
    router.push({ name: 'member-login', query: { redirect: '/member' } })
    return
  }
  if (isClaimed(id) || claiming.value === id) {
    return
  }
  claiming.value = id
  claimTip.value = ''
  try {
    await claimCoupon(id)
    claimTip.value = '领取成功，已放入“我的优惠券”'
    await Promise.all([load(), loadClaimable()])
  } catch (err) {
    if (err instanceof ApiError && err.message.includes('已领取')) {
      claimTip.value = '该券已领取过，快去使用吧'
      await Promise.all([load(), loadClaimable()])
      return
    }
    errorKind.value = err instanceof ApiError && err.status === 0 ? 'network' : 'other'
    error.value = err instanceof ApiError ? err.message : '领取失败，请稍后重试'
  } finally {
    claiming.value = null
  }
}

const gotoLogin = () => {
  router.push({ name: 'member-login', query: { redirect: '/member' } })
}

onMounted(() => {
  void load()
  void loadClaimable()
})

const onLogout = () => {
  logout()
  router.replace('/')
}
</script>

<template>
  <div class="member">
    <div class="container member__inner">
      <!-- 会员卡 -->
      <section v-if="state.profile" class="member-card">
        <div class="member-card__top">
          <div>
            <p class="member-card__label">山野会员</p>
            <h1 class="member-card__name">{{ state.profile.nickname }}</h1>
            <p class="member-card__phone">{{ state.profile.maskedPhone }}</p>
          </div>
          <span class="member-card__level">{{ state.profile.levelText }}</span>
        </div>
        <div class="member-card__stats">
          <div>
            <p class="member-card__stat-value">{{ state.profile.points }}</p>
            <p class="member-card__stat-label">当前积分</p>
          </div>
          <div>
            <p class="member-card__stat-value">{{ summary ? summary.totalEarned : 0 }}</p>
            <p class="member-card__stat-label">累计获得</p>
          </div>
          <div>
            <p class="member-card__stat-value">
              {{ state.profile.nextLevelText ?? '已达最高' }}
            </p>
            <p class="member-card__stat-label">下一等级</p>
          </div>
        </div>
        <div class="member-card__progress">
          <div class="member-card__progress-bar">
            <span :style="{ width: `${progressPercent()}%` }" />
          </div>
          <p class="member-card__progress-text">
            <template v-if="state.profile.nextLevelText">
              再积 {{ state.profile.pointsToNextLevel }} 分升级为{{ state.profile.nextLevelText }}
            </template>
            <template v-else> 已是最高等级，感谢陪伴 </template>
          </p>
        </div>
        <button type="button" class="member-card__logout" @click="onLogout">退出登录</button>
      </section>

      <!-- 内容区 -->
      <section class="member__body">
        <nav class="member__tabs" aria-label="会员中心导航">
          <button type="button" :class="{ 'is-active': activeTab === 'orders' }" @click="activeTab = 'orders'">
            我的订单
          </button>
          <button type="button" :class="{ 'is-active': activeTab === 'points' }" @click="activeTab = 'points'">
            积分明细
          </button>
          <button type="button" :class="{ 'is-active': activeTab === 'coupons' }" @click="activeTab = 'coupons'">
            我的优惠券
          </button>
          <button type="button" :class="{ 'is-active': activeTab === 'claim' }" @click="activeTab = 'claim'">
            领券中心
          </button>
        </nav>

        <p v-if="loading" class="member__status">加载中…</p>
        <div v-else-if="errorKind" class="member__status member__status--error">
          <p v-if="errorKind === 'auth'">{{ error }}</p>
          <p v-else>{{ error || '网络异常，请检查服务是否启动' }}</p>
          <button v-if="errorKind === 'auth'" type="button" class="btn btn-primary member__retry" @click="gotoLogin">
            登录已过期，重新登录
          </button>
          <button v-else type="button" class="btn btn-outline member__retry" @click="load()">重试</button>
        </div>

        <!-- 订单 -->
        <div v-else-if="activeTab === 'orders'" class="member__panel">
          <p v-if="orders.length === 0" class="member__empty">还没有订单，去小程序点一杯吧。</p>
          <article v-for="order in orders" :key="order.id" class="order-item">
            <header class="order-item__head">
              <span class="order-item__no">{{ order.orderNo }}</span>
              <span class="chip" :class="order.status === 'cancelled' ? 'chip--rest' : 'chip--accent'">
                {{ order.statusText }}
              </span>
            </header>
            <p class="order-item__store">
              {{ order.storeName }} · {{ order.orderTypeText }} · {{ formatBeijingTime(order.createdAt) }}
            </p>
            <ul class="order-item__products">
              <li v-for="(item, index) in order.items" :key="index">
                <span>{{ item.productName }}</span>
                <span class="order-item__spec">{{ item.specText }}</span>
                <span>×{{ item.quantity }}</span>
                <span class="order-item__amount">{{ formatMoney(item.amount) }}</span>
              </li>
            </ul>
            <footer class="order-item__foot">
              <span v-if="order.coupon" class="order-item__coupon">已用券：{{ order.coupon.name }}</span>
              <span v-else />
              <span class="order-item__foot-right">
                <span class="order-item__pay">
                  实付 <strong class="price">{{ formatMoney(order.payFen) }}</strong>
                </span>
                <span v-if="order.pickupCode" class="order-item__code">取餐码 {{ order.pickupCode }}</span>
              </span>
            </footer>
          </article>
        </div>

        <!-- 积分 -->
        <div v-else-if="activeTab === 'points'" class="member__panel">
          <p v-if="!summary || summary.logs.length === 0" class="member__empty">还没有积分记录。</p>
          <table v-else class="points-table">
            <thead>
              <tr>
                <th>说明</th>
                <th>积分</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="log in summary.logs" :key="log.id">
                <td>{{ log.reason }}</td>
                <td class="points-table__change">+{{ log.change }}</td>
                <td>{{ formatBeijingTime(log.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 优惠券 -->
        <div v-else-if="activeTab === 'coupons'" class="member__panel">
          <div class="coupon-filter">
            <button
              v-for="tab in COUPON_TABS"
              :key="tab.value || 'all'"
              type="button"
              :class="{ 'is-active': couponTab === tab.value }"
              @click="couponTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>
          <p v-if="coupons.length === 0" class="member__empty">还没有优惠券。</p>
          <div v-else class="coupon-list">
            <article
              v-for="coupon in coupons.filter((item) => !couponTab || item.status === couponTab)"
              :key="coupon.id"
              class="coupon-item"
              :class="{ 'coupon-item--used': coupon.status !== 'unused' }"
            >
              <div class="coupon-item__value">
                <template v-if="coupon.type === 'full_reduction'">
                  <strong>{{ formatMoney(coupon.reduceFen) }}</strong>
                  <span>满 {{ formatMoney(coupon.thresholdFen) }} 可用</span>
                </template>
                <template v-else>
                  <strong>{{ (coupon.discountPercent / 10).toFixed(1) }} 折</strong>
                  <span>满 {{ formatMoney(coupon.thresholdFen) }} 可用</span>
                </template>
              </div>
              <div class="coupon-item__body">
                <p class="coupon-item__name">{{ coupon.name }}</p>
                <p class="coupon-item__meta">
                  {{ coupon.typeText }} · 有效期至 {{ formatBeijingTime(coupon.validTo) }}
                </p>
              </div>
              <span class="coupon-item__status">{{ coupon.statusText }}</span>
            </article>
          </div>
        </div>

        <!-- 领券中心 -->
        <div v-else class="member__panel">
          <p v-if="!state.profile" class="member__empty">
            登录后即可领券，手机号一键登录。
            <button type="button" class="member__inline-btn" @click="gotoLogin">去登录</button>
          </p>
          <template v-else>
            <p v-if="claimTip" class="member__tip">{{ claimTip }}</p>
            <p v-if="claimable.length === 0" class="member__empty">暂无可领取的优惠券，先去小程序点一杯吧。</p>
            <div v-else class="claim-list">
              <article v-for="template in claimable" :key="template.id" class="claim-item">
                <div class="claim-item__value">
                  <strong>{{
                    template.type === 'discount'
                      ? `${(template.discountPercent / 10).toFixed(1)} 折`
                      : formatMoney(template.reduceFen)
                  }}</strong>
                  <span>满 {{ formatMoney(template.thresholdFen) }} 可用</span>
                </div>
                <div class="claim-item__body">
                  <p class="claim-item__name">{{ template.name }}</p>
                  <p class="claim-item__meta">
                    {{ template.typeText }} · 领取后 {{ template.validDays }} 天内有效 · 剩余
                    {{ template.remaining }} 张
                  </p>
                  <p class="claim-item__benefit">优惠：{{ couponBenefitText(template) }}</p>
                </div>
                <button
                  type="button"
                  class="btn btn-accent claim-item__btn"
                  :disabled="isClaimed(template.id) || template.remaining <= 0 || claiming !== null"
                  @click="onClaim(template.id)"
                >
                  {{
                    isClaimed(template.id)
                      ? '已领取'
                      : template.remaining <= 0
                        ? '已领完'
                        : claiming === template.id
                          ? '领取中'
                          : '领取'
                  }}
                </button>
              </article>
            </div>
            <p class="member__empty">领取成功的券会同步到“我的优惠券”，下单时自动推荐最优券。</p>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.member {
  padding-block: var(--space-7);
}

.member__inner {
  display: grid;
  gap: var(--space-5);
  align-items: start;
}

/* ---------- 会员卡 ---------- */
.member-card {
  position: relative;
  overflow: hidden;
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  background:
    radial-gradient(circle at 88% 8%, rgb(232 184 125 / 26%), transparent 45%),
    linear-gradient(150deg, #4a3728 0%, #33261c 100%);
  color: var(--cream-100);
  box-shadow: var(--shadow-lg);
}

.member-card::after {
  content: '';
  position: absolute;
  right: -40px;
  bottom: -60px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 1px solid rgb(232 201 160 / 22%);
}

.member-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.member-card__label {
  font-size: var(--text-xs);
  letter-spacing: 0.3em;
  color: var(--caramel-300);
}

.member-card__name {
  margin-top: var(--space-2);
  font-size: var(--text-2xl);
  color: var(--cream-50);
}

.member-card__phone {
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  color: rgb(243 236 224 / 70%);
}

.member-card__level {
  border-radius: var(--radius-full);
  padding: 5px 14px;
  background: linear-gradient(120deg, #e8c9a0, #c89b6a);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--brand-900);
}

.member-card__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.member-card__stat-value {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--cream-50);
}

.member-card__stat-label {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: rgb(243 236 224 / 62%);
}

.member-card__progress {
  margin-top: var(--space-5);
}

.member-card__progress-bar {
  height: 8px;
  border-radius: var(--radius-full);
  background: rgb(250 246 239 / 16%);
  overflow: hidden;
}

.member-card__progress-bar span {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, #c89b6a, #e8c9a0);
  transition: width 0.4s ease;
}

.member-card__progress-text {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: rgb(243 236 224 / 72%);
}

.member-card__logout {
  position: relative;
  margin-top: var(--space-5);
  border: 1px solid rgb(243 236 224 / 30%);
  border-radius: var(--radius-full);
  padding: 6px 18px;
  background: transparent;
  font-size: var(--text-sm);
  color: var(--cream-100);
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.member-card__logout:hover {
  border-color: var(--caramel-300);
  background: rgb(232 201 160 / 12%);
}

/* ---------- 内容区 ---------- */
.member__tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-line);
}

.member__tabs button {
  border: 0;
  border-bottom: 2px solid transparent;
  padding: var(--space-3) var(--space-4);
  background: transparent;
  font-size: var(--text-sm);
  color: var(--color-text-soft);
  transition: color 0.2s ease, border-color 0.2s ease;
}

.member__tabs button:hover {
  color: var(--color-primary);
}

.member__tabs button.is-active {
  border-bottom-color: var(--color-accent);
  color: var(--color-primary-strong);
  font-weight: 500;
}

.member__status,
.member__empty {
  padding-block: var(--space-7);
  text-align: center;
  color: var(--color-text-soft);
}

.member__status--error {
  color: #a4442f;
}

.member__panel {
  display: grid;
  gap: var(--space-4);
}

/* ---------- 订单 ---------- */
.order-item {
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.order-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.order-item__no {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--color-primary);
}

.order-item__store {
  margin-top: var(--space-2);
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.order-item__products {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-3);
  font-size: var(--text-sm);
}

.order-item__products li {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: baseline;
  gap: var(--space-3);
}

.order-item__spec {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.order-item__amount {
  font-variant-numeric: tabular-nums;
}

.order-item__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px dashed var(--color-line-strong);
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}

.order-item__foot-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

.order-item__pay {
  font-size: var(--text-sm);
}

.order-item__pay .price {
  font-size: var(--text-lg);
}

.order-item__code {
  border-radius: var(--radius-full);
  padding: 3px 12px;
  background: var(--color-surface-muted);
  font-family: var(--font-display);
  letter-spacing: 0.14em;
  color: var(--color-primary);
}

/* ---------- 积分表 ---------- */
.points-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.points-table th,
.points-table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-line);
  text-align: left;
}

.points-table th {
  font-size: var(--text-xs);
  letter-spacing: 0.14em;
  color: var(--color-text-faint);
  font-weight: 500;
}

.points-table__change {
  font-variant-numeric: tabular-nums;
  color: var(--color-accent-strong);
  font-weight: 600;
}

/* ---------- 优惠券 ---------- */
.coupon-filter {
  display: flex;
  gap: var(--space-2);
}

.coupon-filter button {
  border: 1px solid var(--color-line-strong);
  border-radius: var(--radius-full);
  padding: 5px 14px;
  background: var(--color-surface);
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}

.coupon-filter button.is-active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: var(--cream-50);
}

.coupon-list {
  display: grid;
  gap: var(--space-3);
}

.coupon-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--caramel-300);
  border-radius: var(--radius-lg);
  background: linear-gradient(120deg, #fffdf9, #faf3e8);
}

.coupon-item--used {
  border-color: var(--color-line);
  background: var(--color-surface-muted);
  opacity: 0.75;
}

.coupon-item__value {
  display: flex;
  flex-direction: column;
  min-width: 96px;
  padding-right: var(--space-4);
  border-right: 1px dashed var(--color-line-strong);
}

.coupon-item__value strong {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--color-accent-strong);
}

.coupon-item__value span {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.coupon-item__name {
  font-size: var(--text-base);
  color: var(--color-primary-strong);
}

.coupon-item__meta {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}

.coupon-item__status {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

/* ---------- 加载失败 / 领券中心 ---------- */
.member__retry {
  margin-top: var(--space-3);
}

.member__inline-btn {
  border: 0;
  background: transparent;
  color: var(--color-accent-strong);
  font-size: inherit;
  text-decoration: underline;
  cursor: pointer;
}

.member__tip {
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: rgb(125 155 106 / 12%);
  font-size: var(--text-sm);
  color: var(--matcha-600);
}

.claim-list {
  display: grid;
  gap: var(--space-3);
}

.claim-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--caramel-300);
  border-radius: var(--radius-lg);
  background: linear-gradient(120deg, #fffdf9, #faf3e8);
}

.claim-item__value {
  display: flex;
  min-width: 96px;
  flex-direction: column;
  padding-right: var(--space-4);
  border-right: 1px dashed var(--color-line-strong);
}

.claim-item__value strong {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--color-accent-strong);
}

.claim-item__value span {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.claim-item__name {
  font-size: var(--text-base);
  color: var(--color-primary-strong);
}

.claim-item__meta {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}

.claim-item__benefit {
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.claim-item__btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .claim-item {
    grid-template-columns: 1fr;
    gap: var(--space-3);
    padding: var(--space-4);
  }

  .claim-item__value {
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-2);
    padding-right: 0;
    padding-bottom: var(--space-2);
    border-right: 0;
    border-bottom: 1px dashed var(--color-line-strong);
  }

  .claim-item__value strong {
    font-size: var(--text-xl);
  }

  .claim-item__btn {
    justify-self: stretch;
  }
}

@media (min-width: 1024px) {
  .member__inner {
    grid-template-columns: 380px 1fr;
  }
}
</style>

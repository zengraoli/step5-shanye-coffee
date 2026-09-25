<script setup lang="ts">
/**
 * 商品插画：按分类自绘 SVG（咖啡杯 / 茶杯 / 轻食 / 周边）。
 * 纯矢量、无外部资源，颜色取自品牌主题变量。
 */
withDefaults(
  defineProps<{
    category: string
    size?: number
  }>(),
  { size: 120 },
)
</script>

<template>
  <svg
    v-if="category === '咖啡'"
    :width="size"
    :height="size"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- 咖啡杯 -->
    <path d="M28 52h56v22a24 24 0 0 1-24 24h-8a24 24 0 0 1-24-24V52z" fill="#f3ece0" stroke="#4a3728" stroke-width="2.4" />
    <path d="M84 58h8a10 10 0 0 1 0 20h-8" stroke="#4a3728" stroke-width="2.4" stroke-linecap="round" />
    <path d="M28 52h56" stroke="#4a3728" stroke-width="2.4" stroke-linecap="round" />
    <!-- 热气 -->
    <path d="M44 42c4-4 0-8 0-12M60 40c4-5 0-9 0-14M76 42c4-4 0-8 0-12" stroke="#c89b6a" stroke-width="2.4" stroke-linecap="round" />
    <!-- 豆子 -->
    <ellipse cx="30" cy="98" rx="7" ry="5" fill="#4a3728" transform="rotate(-18 30 98)" />
    <path d="M27 98c2-2 4-2 6 0" stroke="#faf6ef" stroke-width="1.4" stroke-linecap="round" />
    <ellipse cx="90" cy="98" rx="7" ry="5" fill="#6b4f3a" transform="rotate(14 90 98)" />
    <path d="M87 98c2-2 4-2 6 0" stroke="#faf6ef" stroke-width="1.4" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="category === '茶饮'"
    :width="size"
    :height="size"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- 玻璃杯 -->
    <path d="M36 40h48l-5 46a14 14 0 0 1-14 12h-10a14 14 0 0 1-14-12l-5-46z" fill="#f3ece0" stroke="#4a3728" stroke-width="2.4" />
    <path d="M38 66h44" stroke="#7d9b6a" stroke-width="6" stroke-linecap="round" opacity="0.55" />
    <!-- 叶片 -->
    <path d="M78 30c8-6 16-4 18 2-6 6-14 6-18-2z" fill="#7d9b6a" />
    <path d="M78 30c4 2 8 6 10 10" stroke="#faf6ef" stroke-width="1.6" stroke-linecap="round" />
    <!-- 气泡 -->
    <circle cx="52" cy="52" r="3" fill="#c89b6a" />
    <circle cx="66" cy="46" r="2.4" fill="#c89b6a" />
    <circle cx="60" cy="58" r="2" fill="#c89b6a" />
    <!-- 吸管 -->
    <path d="M70 40l6-18" stroke="#c89b6a" stroke-width="3" stroke-linecap="round" />
  </svg>

  <svg
    v-else-if="category === '轻食'"
    :width="size"
    :height="size"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- 餐盘 -->
    <ellipse cx="60" cy="86" rx="38" ry="10" fill="#f3ece0" stroke="#4a3728" stroke-width="2.4" />
    <!-- 可颂 -->
    <path d="M34 78c-4-14 4-30 16-32 6 8 6 18 2 26l-18 6z" fill="#e8c9a0" stroke="#4a3728" stroke-width="2.4" stroke-linejoin="round" />
    <path d="M44 52c4 6 5 14 4 22M54 48c3 7 4 15 3 22" stroke="#4a3728" stroke-width="2" stroke-linecap="round" />
    <path d="M70 78c-2-12 4-26 14-30 6 8 6 20 1 28l-15 2z" fill="#c89b6a" stroke="#4a3728" stroke-width="2.4" stroke-linejoin="round" />
    <path d="M78 54c3 6 4 14 3 20" stroke="#4a3728" stroke-width="2" stroke-linecap="round" />
    <!-- 叉子 -->
    <path d="M22 44v18M26 44v18M24 62v22" stroke="#4a3728" stroke-width="2.2" stroke-linecap="round" />
  </svg>

  <svg
    v-else
    :width="size"
    :height="size"
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- 帆布咖啡袋 -->
    <path d="M34 44h52l6 44a8 8 0 0 1-8 9H36a8 8 0 0 1-8-9l6-44z" fill="#f3ece0" stroke="#4a3728" stroke-width="2.4" />
    <path d="M34 44c0-8 8-12 26-12s26 4 26 12" stroke="#4a3728" stroke-width="2.4" stroke-linecap="round" />
    <!-- 标签 -->
    <rect x="46" y="60" width="28" height="18" rx="4" fill="#c89b6a" />
    <path d="M52 69h16M52 73h10" stroke="#4a3728" stroke-width="2" stroke-linecap="round" />
    <!-- 咖啡豆装饰 -->
    <ellipse cx="86" cy="34" rx="6" ry="4.4" fill="#4a3728" transform="rotate(16 86 34)" />
    <path d="M83.6 34c1.6-1.6 3.2-1.6 4.8 0" stroke="#faf6ef" stroke-width="1.3" stroke-linecap="round" />
  </svg>
</template>

<script setup lang="ts">
/** 烘焙曲线插画：自绘 SVG（坐标轴 + 曲线 + 标注），不依赖图表库 */
withDefaults(defineProps<{ height?: number }>(), { height: 220 })
</script>

<template>
  <svg
    viewBox="0 0 560 260"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :style="{ height: `${height}px` }"
    class="roast-curve"
    aria-hidden="true"
  >
    <rect width="560" height="260" rx="16" fill="#faf6ef" />
    <!-- 网格 -->
    <g stroke="#e9dfd0" stroke-width="1.4">
      <path d="M64 40h456M64 90h456M64 140h456M64 190h456" />
      <path d="M64 40v170M172 40v170M280 40v170M388 40v170M496 40v170" />
    </g>
    <!-- 坐标轴 -->
    <path d="M64 210h456M64 40v170" stroke="#4a3728" stroke-width="2.4" stroke-linecap="round" />
    <!-- 一爆标记 -->
    <path d="M330 40v170" stroke="#c89b6a" stroke-width="2" stroke-dasharray="5 5" />
    <circle cx="330" cy="132" r="6" fill="#c89b6a" />
    <text x="342" y="128" font-size="13" fill="#6b4f3a" font-family="sans-serif">一爆</text>
    <!-- 下豆标记 -->
    <circle cx="486" cy="96" r="6" fill="#7d9b6a" />
    <text x="430" y="82" font-size="13" fill="#5f7d4f" font-family="sans-serif">下豆</text>
    <!-- 烘焙曲线 -->
    <path
      d="M64 200C120 188 150 150 200 128s110-22 150 4 90 22 120-16 80-40 116-20"
      stroke="#4a3728"
      stroke-width="3.4"
      stroke-linecap="round"
    />
    <!-- 关键节点 -->
    <circle cx="64" cy="200" r="5" fill="#4a3728" />
    <text x="70" y="228" font-size="12" fill="#6f6255" font-family="sans-serif">回温点</text>
    <circle cx="200" cy="128" r="5" fill="#4a3728" />
    <text x="182" y="116" font-size="12" fill="#6f6255" font-family="sans-serif">脱水完成</text>
    <!-- 轴标签 -->
    <text x="20" y="46" font-size="12" fill="#6f6255" font-family="sans-serif">温度</text>
    <text x="486" y="234" font-size="12" fill="#6f6255" font-family="sans-serif">时间</text>
    <!-- 图例 -->
    <g transform="translate(388 44)">
      <rect x="0" y="0" width="10" height="10" rx="3" fill="#4a3728" />
      <text x="16" y="9" font-size="12" fill="#6f6255" font-family="sans-serif">豆温</text>
    </g>
  </svg>
</template>

<style scoped>
.roast-curve {
  width: 100%;
  height: auto;
}
</style>

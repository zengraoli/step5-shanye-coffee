<script setup lang="ts">
/** 手冲咖啡插画：自绘 SVG（V60 滤杯、分享壶、手冲壶与水流） */
</script>

<template>
  <svg
    viewBox="0 0 420 340"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="pour-over"
    aria-hidden="true"
  >
    <rect width="420" height="340" rx="20" fill="#f3ece0" />
    <!-- 台面 -->
    <path d="M0 268h420v72H0z" fill="#e9dfd0" />
    <path d="M0 268h420" stroke="#dccfba" stroke-width="3" />
    <!-- 分享壶 -->
    <path d="M150 196h100v42a34 34 0 0 1-34 34h-32a34 34 0 0 1-34-34v-42z" fill="#faf6ef" stroke="#4a3728" stroke-width="3" />
    <path d="M150 212h100" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
    <path d="M176 214v42M200 214v42M224 214v42" stroke="#c89b6a" stroke-width="3" stroke-linecap="round" />
    <ellipse cx="200" cy="286" rx="58" ry="8" fill="#4a3728" opacity="0.18" />
    <!-- 咖啡液滴 -->
    <path d="M200 240c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z" fill="#6b4f3a" />
    <!-- V60 滤杯 -->
    <path d="M138 96h124l-24 66a20 20 0 0 1-18 12h-40a20 20 0 0 1-18-12l-24-66z" fill="#faf6ef" stroke="#4a3728" stroke-width="3" />
    <path d="M138 96h124" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
    <ellipse cx="200" cy="98" rx="62" ry="10" fill="#e9dfd0" stroke="#4a3728" stroke-width="2.4" />
    <ellipse cx="200" cy="98" rx="46" ry="6" fill="#6b4f3a" opacity="0.55" />
    <!-- 肋骨纹 -->
    <path d="M160 108l-8 44M240 108l8 44" stroke="#dccfba" stroke-width="3" stroke-linecap="round" />
    <!-- 手冲壶 -->
    <g transform="translate(258 34)">
      <path d="M6 34h56v26a26 26 0 0 1-26 26H32a26 26 0 0 1-26-26V34z" fill="#c89b6a" stroke="#4a3728" stroke-width="3" />
      <path d="M6 34h56" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
      <path d="M62 44l22-10" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
      <path d="M34 86c0 10-4 16-4 22" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
      <!-- 水流 -->
      <path d="M30 110c-1 14 2 22 2 30" stroke="#c89b6a" stroke-width="4" stroke-linecap="round" opacity="0.9" />
      <circle cx="32" cy="146" r="3.4" fill="#c89b6a" />
      <circle cx="32" cy="158" r="3" fill="#c89b6a" />
    </g>
    <!-- 蒸汽 -->
    <g stroke="#faf6ef" stroke-width="4" stroke-linecap="round" opacity="0.9">
      <path d="M200 78c6-6 0-12 0-18" />
    </g>
    <!-- 温度计 -->
    <g transform="translate(76 120)">
      <rect x="0" y="0" width="10" height="76" rx="5" fill="#faf6ef" stroke="#4a3728" stroke-width="2.4" />
      <rect x="3" y="34" width="4" height="38" rx="2" fill="#b4442f" />
      <circle cx="5" cy="82" r="8" fill="#b4442f" />
    </g>
  </svg>
</template>

<style scoped>
.pour-over {
  width: 100%;
  height: auto;
}
</style>

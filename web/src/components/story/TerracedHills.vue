<script setup lang="ts">
/** 咖啡园梯田插画：自绘 SVG（梯田、咖啡树枝、咖啡樱桃） */
</script>

<template>
  <svg
    viewBox="0 0 560 380"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="terraced"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="t-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#f7ead6" />
        <stop offset="100%" stop-color="#f3dfc4" />
      </linearGradient>
    </defs>
    <rect width="560" height="380" rx="20" fill="url(#t-sky)" />
    <!-- 远山 -->
    <path d="M0 190L120 90l110 90 90-70 130 110 110-60v120H0V190z" fill="#c9a986" opacity="0.7" />
    <!-- 太阳 -->
    <circle cx="430" cy="86" r="38" fill="#e8b87d" />
    <circle cx="430" cy="86" r="54" stroke="#e8b87d" stroke-width="2" opacity="0.4" />
    <!-- 梯田（三层） -->
    <path d="M0 250c90-26 180-26 280 0s190 26 280 0v40H0v-40z" fill="#7d9b6a" opacity="0.35" />
    <path d="M0 286c100-28 190-28 280 0s180 28 280 0v44H0v-44z" fill="#7d9b6a" opacity="0.55" />
    <path d="M0 330c110-30 200-30 280 0s170 30 280 0v50H0v-50z" fill="#5f7d4f" opacity="0.8" />
    <!-- 田埂线 -->
    <path d="M0 250c90-26 180-26 280 0s190 26 280 0M0 286c100-28 190-28 280 0s180 28 280 0M0 330c110-30 200-30 280 0s170 30 280 0"
      stroke="#faf6ef" stroke-width="2.4" opacity="0.65" stroke-linecap="round" />
    <!-- 咖啡树枝 -->
    <g transform="translate(392 236)">
      <path d="M0 90V22" stroke="#4a3728" stroke-width="4" stroke-linecap="round" />
      <path d="M0 52c-18-6-28-20-30-38 16 2 28 12 30 26M0 40c18-8 26-22 28-40-16 4-26 14-28 28"
        stroke="#5f7d4f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <!-- 咖啡樱桃 -->
      <circle cx="-30" cy="18" r="7" fill="#b4442f" />
      <circle cx="-30" cy="18" r="3" fill="#d97b62" />
      <circle cx="28" cy="4" r="7" fill="#b4442f" />
      <circle cx="28" cy="4" r="3" fill="#d97b62" />
      <circle cx="8" cy="-14" r="7" fill="#b4442f" />
      <circle cx="8" cy="-14" r="3" fill="#d97b62" />
    </g>
    <!-- 采收篮 -->
    <g transform="translate(96 300)">
      <path d="M0 12h44l-6 30H6L0 12z" fill="#c89b6a" stroke="#4a3728" stroke-width="3" stroke-linejoin="round" />
      <path d="M4 12c4-14 12-20 18-20s14 6 18 20" stroke="#4a3728" stroke-width="3" stroke-linecap="round" />
      <circle cx="14" cy="24" r="5" fill="#b4442f" />
      <circle cx="30" cy="28" r="5" fill="#b4442f" />
    </g>
  </svg>
</template>

<style scoped>
.terraced {
  width: 100%;
  height: auto;
}
</style>

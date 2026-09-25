<script setup lang="ts">
/**
 * 品牌主视觉插画：山野日出 + 山脊上的咖啡杯。
 * 纯自绘 SVG；上中部为天空与山峦，下三分之一为浅色前景，
 * 保证首屏文字（深色）始终落在浅色区域上，任何宽度都清晰可读。
 */
</script>

<template>
  <div class="hero-art">
    <svg
      viewBox="0 0 1200 620"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f9eeddff" />
          <stop offset="60%" stop-color="#f6e6d0" />
          <stop offset="100%" stop-color="#f3dfc4" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#e8b87d" stop-opacity="0.9" />
          <stop offset="55%" stop-color="#e8b87d" stop-opacity="0.22" />
          <stop offset="100%" stop-color="#e8b87d" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="farHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#dcc0a0" />
          <stop offset="100%" stop-color="#cbb392" />
        </linearGradient>
        <linearGradient id="midHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#b8946f" />
          <stop offset="100%" stop-color="#a3815f" />
        </linearGradient>
        <linearGradient id="foreground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f5eee2" />
          <stop offset="100%" stop-color="#ecdfcb" />
        </linearGradient>
      </defs>

      <!-- 天空 -->
      <rect width="1200" height="620" fill="url(#sky)" />

      <!-- 太阳与光晕 -->
      <circle cx="920" cy="120" r="180" fill="url(#sunGlow)" />
      <circle cx="920" cy="120" r="58" fill="#e8b87d" />
      <circle cx="920" cy="120" r="58" stroke="#c89b6a" stroke-width="3" opacity="0.45" />

      <!-- 飞鸟 -->
      <path d="M210 120c8-8 14-8 20 0 6-8 12-8 20 0" stroke="#8a6a4d" stroke-width="3" stroke-linecap="round" opacity="0.65" />
      <path d="M270 156c6-6 10-6 15 0 5-6 9-6 15 0" stroke="#8a6a4d" stroke-width="2.4" stroke-linecap="round" opacity="0.45" />

      <!-- 远山 -->
      <path d="M0 330L170 190l150 120 130-110 190 170 150-110 410 170v90H0V330z" fill="url(#farHill)" opacity="0.9" />
      <!-- 中山 -->
      <path d="M0 430L230 280l190 130 180-120 220 160 180-90 200 110v70H0V430z" fill="url(#midHill)" opacity="0.95" />

      <!-- 山脊上的咖啡杯（右侧，不与左侧文字重叠） -->
      <g transform="translate(772 214)">
        <ellipse cx="108" cy="212" rx="104" ry="16" fill="#8a6a4d" opacity="0.28" />
        <path d="M40 82h136v58a58 58 0 0 1-58 58h-20a58 58 0 0 1-58-58v-58z" fill="#fffdf9" stroke="#4a3728" stroke-width="4" />
        <path d="M40 82h136" stroke="#4a3728" stroke-width="4" stroke-linecap="round" />
        <path d="M176 92h18a26 26 0 0 1 0 52h-12" stroke="#4a3728" stroke-width="4" stroke-linecap="round" />
        <ellipse cx="108" cy="84" rx="68" ry="10" fill="#6b4f3a" />
        <ellipse cx="108" cy="82" rx="50" ry="7" fill="#4a3728" opacity="0.55" />
        <!-- 热气（CSS 动画） -->
        <g class="hero-art__steam" stroke="#fffdf9" stroke-width="5" stroke-linecap="round" opacity="0.95">
          <path d="M78 62c10-10 0-22 0-34" />
          <path d="M108 54c12-12 0-26 0-40" />
          <path d="M138 62c10-10 0-22 0-34" />
        </g>
      </g>

      <!-- 浅色前景（文字区） -->
      <path d="M0 620V470c180-34 340-34 520 0s340 34 680 0v150H0z" fill="url(#foreground)" />
      <!-- 田埂弧线 -->
      <path d="M0 486c180-30 340-30 520 0s340 30 680 0" stroke="#dccfba" stroke-width="3" opacity="0.9" stroke-linecap="round" />
      <path d="M0 528c200-28 360-28 560 0s300 28 640 0" stroke="#dccfba" stroke-width="3" opacity="0.65" stroke-linecap="round" />
      <path d="M0 578c220-26 380-26 600 0s280 26 620 0" stroke="#dccfba" stroke-width="3" opacity="0.45" stroke-linecap="round" />

      <!-- 前景咖啡豆与枝叶 -->
      <g opacity="0.95">
        <ellipse cx="180" cy="512" rx="15" ry="10" fill="#4a3728" transform="rotate(-16 180 512)" />
        <path d="M174 512c4-4 8-4 12 0" stroke="#faf6ef" stroke-width="2" stroke-linecap="round" />
        <ellipse cx="1030" cy="540" rx="15" ry="10" fill="#4a3728" transform="rotate(12 1030 540)" />
        <path d="M1024 540c4-4 8-4 12 0" stroke="#faf6ef" stroke-width="2" stroke-linecap="round" />
        <ellipse cx="640" cy="588" rx="13" ry="9" fill="#6b4f3a" transform="rotate(-8 640 588)" />
        <path d="M635 588c3-3 7-3 10 0" stroke="#faf6ef" stroke-width="1.8" stroke-linecap="round" />
      </g>
      <g transform="translate(1130 452)">
        <path d="M0 40V8" stroke="#5f7d4f" stroke-width="3.4" stroke-linecap="round" />
        <path d="M0 26c-14-5-22-16-24-30 13 2 23 10 25 21M0 20c14-6 21-17 23-31-13 3-21 11-23 23"
          stroke="#5f7d4f" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="-24" cy="0" r="5.6" fill="#b4442f" />
        <circle cx="23" cy="-11" r="5.6" fill="#b4442f" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.hero-art {
  position: absolute;
  inset: 0;
}

.hero-art svg {
  width: 100%;
  height: 100%;
}

.hero-art__steam path {
  animation: steam 3.6s ease-in-out infinite;
  transform-origin: bottom center;
}

.hero-art__steam path:nth-child(2) {
  animation-delay: 0.9s;
}

.hero-art__steam path:nth-child(3) {
  animation-delay: 1.8s;
}

@keyframes steam {
  0%,
  100% {
    opacity: 0.25;
    transform: translateY(4px) scaleY(0.94);
  }
  50% {
    opacity: 0.95;
    transform: translateY(-4px) scaleY(1.06);
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-art__steam path {
    animation: none;
  }
}
</style>

<script setup lang="ts">
/**
 * 品牌主视觉插画：山野日出 + 一杯咖啡。
 * 纯自绘 SVG（分层山峦、太阳、咖啡杯、热气、飞鸟），无外部资源。
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
          <stop offset="0%" stop-color="#f7ead6" />
          <stop offset="55%" stop-color="#f3dfc4" />
          <stop offset="100%" stop-color="#efd3b4" />
        </linearGradient>
        <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#e8b87d" stop-opacity="0.95" />
          <stop offset="60%" stop-color="#e8b87d" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#e8b87d" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="farHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#c9a986" />
          <stop offset="100%" stop-color="#b08e6c" />
        </linearGradient>
        <linearGradient id="midHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8a6a4d" />
          <stop offset="100%" stop-color="#6b4f3a" />
        </linearGradient>
        <linearGradient id="nearHill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#4a3728" />
          <stop offset="100%" stop-color="#33261c" />
        </linearGradient>
      </defs>

      <!-- 天空 -->
      <rect width="1200" height="620" fill="url(#sky)" />

      <!-- 太阳与光晕 -->
      <circle cx="860" cy="200" r="190" fill="url(#sunGlow)" />
      <circle cx="860" cy="200" r="72" fill="#e8b87d" />
      <circle cx="860" cy="200" r="72" stroke="#c89b6a" stroke-width="3" opacity="0.5" />

      <!-- 飞鸟 -->
      <path d="M240 150c8-8 14-8 20 0 6-8 12-8 20 0" stroke="#6b4f3a" stroke-width="3" stroke-linecap="round" opacity="0.7" />
      <path d="M300 190c6-6 10-6 15 0 5-6 9-6 15 0" stroke="#6b4f3a" stroke-width="2.4" stroke-linecap="round" opacity="0.5" />

      <!-- 远山 -->
      <path d="M0 380L180 220l160 130L420 180l220 200 180-120 380 180v140H0V380z" fill="url(#farHill)" opacity="0.85" />
      <!-- 中山 -->
      <path d="M0 470L220 300l200 150L560 260l260 210 180-90 200 130v90H0v-230z" fill="url(#midHill)" opacity="0.92" />
      <!-- 近山 -->
      <path d="M0 620V540l260-170 220 140 260-190 460 220v80H0z" fill="url(#nearHill)" />

      <!-- 咖啡园梯田线条 -->
      <path d="M120 560c120-40 260-40 380 0s260 40 380 0" stroke="#c89b6a" stroke-width="3" opacity="0.35" stroke-linecap="round" />
      <path d="M180 596c120-34 240-34 360 0s240 34 360 0" stroke="#c89b6a" stroke-width="3" opacity="0.22" stroke-linecap="round" />

      <!-- 前景咖啡杯 -->
      <g transform="translate(470 372)">
        <ellipse cx="130" cy="212" rx="120" ry="18" fill="#33261c" opacity="0.35" />
        <path d="M52 76h156v66a66 66 0 0 1-66 66h-24a66 66 0 0 1-66-66V76z" fill="#faf6ef" stroke="#33261c" stroke-width="4" />
        <path d="M52 76h156" stroke="#33261c" stroke-width="4" stroke-linecap="round" />
        <path d="M208 88h22a30 30 0 0 1 0 60h-16" stroke="#33261c" stroke-width="4" stroke-linecap="round" />
        <!-- 杯口咖啡液 -->
        <ellipse cx="130" cy="78" rx="78" ry="12" fill="#6b4f3a" />
        <ellipse cx="130" cy="76" rx="60" ry="8" fill="#4a3728" opacity="0.6" />
        <!-- 热气（CSS 动画） -->
        <g class="hero-art__steam" stroke="#faf6ef" stroke-width="5" stroke-linecap="round" opacity="0.9">
          <path d="M96 56c10-10 0-22 0-34" />
          <path d="M130 48c12-12 0-26 0-40" />
          <path d="M164 56c10-10 0-22 0-34" />
        </g>
      </g>

      <!-- 咖啡豆散落 -->
      <g opacity="0.9">
        <ellipse cx="380" cy="520" rx="14" ry="10" fill="#33261c" transform="rotate(-16 380 520)" />
        <path d="M374 520c4-4 8-4 12 0" stroke="#faf6ef" stroke-width="2" stroke-linecap="round" />
        <ellipse cx="830" cy="548" rx="14" ry="10" fill="#33261c" transform="rotate(12 830 548)" />
        <path d="M824 548c4-4 8-4 12 0" stroke="#faf6ef" stroke-width="2" stroke-linecap="round" />
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

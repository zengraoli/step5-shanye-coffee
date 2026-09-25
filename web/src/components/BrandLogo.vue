<script setup lang="ts">
/** 山野咖啡品牌标识：自绘 SVG（山形 + 咖啡杯） */
withDefaults(
  defineProps<{
    size?: number
    tone?: 'brand' | 'light'
  }>(),
  { size: 32, tone: 'brand' },
)
</script>

<template>
  <svg
    class="brand-logo"
    :width="size"
    :height="size"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="40" height="40" rx="11" :fill="tone === 'light' ? '#f3ece0' : '#4a3728'" />
    <path
      d="M7.5 26.5L15 15l5 6.5L22.5 17l10 9.5h-25z"
      :stroke="tone === 'light' ? '#4a3728' : '#e8c9a0'"
      stroke-width="2.2"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
    <path
      d="M12.5 30.5h15"
      :stroke="tone === 'light' ? '#c89b6a' : '#c89b6a'"
      stroke-width="2.2"
      stroke-linecap="round"
    />
    <circle
      cx="26.5"
      cy="12"
      r="2.6"
      :stroke="tone === 'light' ? '#c89b6a' : '#faf6ef'"
      stroke-width="2"
    />
  </svg>
</template>

<style scoped>
.brand-logo {
  flex: none;
}
</style>

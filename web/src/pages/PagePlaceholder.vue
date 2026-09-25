<script setup lang="ts">
/** 骨架阶段占位页（T17-T20 会替换为真实页面） */
defineProps<{
  title: string
  desc: string
}>()
</script>

<template>
  <section class="placeholder section">
    <div class="container">
      <p class="placeholder__eyebrow">SHANYE COFFEE</p>
      <h1 class="placeholder__title">{{ title }}</h1>
      <p class="placeholder__desc">{{ desc }}</p>
    </div>
  </section>
</template>

<style scoped>
.placeholder {
  padding-block: var(--space-9);
  text-align: center;
}

.placeholder__eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.4em;
  color: var(--color-accent-strong);
}

.placeholder__title {
  margin-top: var(--space-3);
  font-size: var(--text-3xl);
  color: var(--color-primary-strong);
}

.placeholder__desc {
  margin: var(--space-4) auto 0;
  max-width: 480px;
  color: var(--color-text-soft);
}
</style>

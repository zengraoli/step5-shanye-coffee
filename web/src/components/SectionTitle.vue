<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    desc?: string
    align?: 'left' | 'center'
  }>(),
  { eyebrow: '', desc: '', align: 'left' },
)
</script>

<template>
  <div class="section-head" :class="`section-head--${align}`">
    <p v-if="eyebrow" class="section-head__eyebrow">{{ eyebrow }}</p>
    <h2 class="section-head__title">{{ title }}</h2>
    <p v-if="desc" class="section-head__desc">{{ desc }}</p>
    <slot />
  </div>
</template>

<style scoped>
.section-head--center {
  align-items: center;
  text-align: center;
}

.section-head--center .section-head__desc {
  margin-inline: auto;
}
</style>

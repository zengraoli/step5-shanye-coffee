<script setup lang="ts">
import type { Store } from '@/api/catalog'

defineProps<{
  store: Store
}>()
</script>

<template>
  <article class="store-card">
    <header class="store-card__head">
      <h3 class="store-card__name">{{ store.name }}</h3>
      <span class="chip" :class="store.status === 'open' ? 'chip--open' : 'chip--rest'">
        <i class="store-card__dot" :class="store.status === 'open' ? 'is-open' : 'is-rest'" />
        {{ store.statusText }}
      </span>
    </header>
    <dl class="store-card__meta">
      <div>
        <dt>营业时间</dt>
        <dd>每日 {{ store.openTime }} - {{ store.closeTime }}</dd>
      </div>
      <div>
        <dt>地址</dt>
        <dd>{{ store.address }}</dd>
      </div>
      <div>
        <dt>电话</dt>
        <dd>{{ store.phone }}</dd>
      </div>
    </dl>
    <RouterLink to="/stores" class="store-card__link">查看门店详情 →</RouterLink>
  </article>
</template>

<style scoped>
.store-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.store-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.store-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.store-card__name {
  font-size: var(--text-lg);
  color: var(--color-primary-strong);
}

.store-card__dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
}

.store-card__dot.is-open {
  background: var(--color-success);
  box-shadow: 0 0 0 3px rgb(95 125 79 / 18%);
}

.store-card__dot.is-rest {
  background: var(--color-text-faint);
}

.store-card__meta {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  font-size: var(--text-sm);
}

.store-card__meta dt {
  font-size: var(--text-xs);
  letter-spacing: 0.16em;
  color: var(--color-text-faint);
}

.store-card__meta dd {
  margin: 2px 0 0;
  color: var(--color-text);
}

.store-card__link {
  margin-top: auto;
  font-size: var(--text-sm);
  color: var(--color-accent-strong);
  transition: color 0.2s ease;
}

.store-card__link:hover {
  color: var(--color-primary);
}
</style>

<script setup lang="ts">
import SectionTitle from '@/components/SectionTitle.vue'
import TerracedHills from '@/components/story/TerracedHills.vue'
import RoastCurve from '@/components/story/RoastCurve.vue'
import PourOver from '@/components/story/PourOver.vue'

interface Milestone {
  year: string
  title: string
  desc: string
}

const milestones: Milestone[] = [
  {
    year: '2016',
    title: '从一间小烘焙室开始',
    desc: '两位主理人在城市边缘租下 30 平米的空间，用一台 3 公斤 sample 烘焙机开始琢磨云南豆。',
  },
  {
    year: '2019',
    title: '遇见普洱咖啡园',
    desc: '在普洱深山找到第一批合作农户，卡蒂姆与铁皮卡混采，第一次把生豆变成自己的风味。',
  },
  {
    year: '2022',
    title: '自有烘焙工坊落成',
    desc: '小批量、多批次、可追溯的烘焙体系建立，每一锅曲线都记录在册。',
  },
  {
    year: '2026',
    title: '三家门店同时营业',
    desc: '望京、三里屯、五道口，统一的出品标准，和一杯认真冲煮的咖啡。',
  },
]
</script>

<template>
  <div class="story">
    <!-- 故事头图 -->
    <header class="story-hero">
      <div class="container">
        <p class="story-hero__eyebrow">OUR STORY</p>
        <h1 class="story-hero__title">从一座山，<br />到一杯咖啡。</h1>
        <p class="story-hero__desc">
          山野咖啡的名字来自云南的大山。我们相信，好咖啡不只是味道，还有它生长的那片土地、
          采摘它的那双手，和把它端给你时的那个瞬间。
        </p>
      </div>
      <svg class="story-hero__wave" viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 30c240 34 480-34 720-18s480 46 720 18v30H0V30z" fill="#faf6ef" />
      </svg>
    </header>

    <!-- 品牌时间线 -->
    <section class="section container">
      <SectionTitle eyebrow="TIMELINE" title="山野的十年" desc="每一个节点，都由一杯杯咖啡堆出来。" />
      <ol class="timeline">
        <li v-for="item in milestones" :key="item.year" class="timeline__item">
          <div class="timeline__marker" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#c89b6a" stroke-width="2" />
              <path d="M12 7v5l4 2" stroke="#4a3728" stroke-width="2" stroke-linecap="round" />
            </svg>
          </div>
          <div class="timeline__body">
            <p class="timeline__year">{{ item.year }}</p>
            <h3 class="timeline__title">{{ item.title }}</h3>
            <p class="timeline__desc">{{ item.desc }}</p>
          </div>
        </li>
      </ol>
    </section>

    <!-- 产地 -->
    <section class="section story-band">
      <div class="container story-split">
        <div class="story-split__text">
          <SectionTitle
            eyebrow="ORIGIN"
            title="产地：普洱的山与云"
            desc="海拔 1200-1600 米的普洱产区，昼夜温差大，咖啡樱桃成熟更慢，糖分与酸质积累更充分。我们与 12 户农户长期合作，鲜采当日处理，批次可追溯。"
          />
          <ul class="story-facts">
            <li><strong>12 户</strong><span>长期合作农户</span></li>
            <li><strong>1200m+</strong><span>平均种植海拔</span></li>
            <li><strong>当日</strong><span>鲜采鲜处理</span></li>
          </ul>
        </div>
        <div class="story-split__art">
          <TerracedHills />
        </div>
      </div>
    </section>

    <!-- 烘焙 -->
    <section class="section container">
      <div class="story-split story-split--reverse">
        <div class="story-split__text">
          <SectionTitle
            eyebrow="ROASTING"
            title="烘焙：曲线即性格"
            desc="同一支豆子，不同的曲线会讲出完全不同的故事。我们把每一锅的曲线记录下来，反复杯测，直到风味稳定才允许上架。浅中烘保留花果香，中深烘偏向坚果与可可。"
          />
        </div>
        <div class="story-split__art">
          <RoastCurve />
        </div>
      </div>
    </section>

    <!-- 冲煮 -->
    <section class="section story-band">
      <div class="container story-split">
        <div class="story-split__text">
          <SectionTitle
            eyebrow="BREWING"
            title="冲煮：把风味交给你"
            desc="门店全部使用 V60 手冲与意式双系统。手冲参数贴在吧台上：粉水比 1:15、水温 92°C、三段注水。你可以照着做，也可以直接问咖啡师。"
          />
          <div class="story-params">
            <div><span>粉水比</span><strong>1 : 15</strong></div>
            <div><span>水温</span><strong>92°C</strong></div>
            <div><span>注水</span><strong>三段式</strong></div>
          </div>
        </div>
        <div class="story-split__art">
          <PourOver />
        </div>
      </div>
    </section>

    <!-- 承诺 -->
    <section class="container">
      <blockquote class="story-quote">
        <svg class="story-quote__icon" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M18 14c-6 2-10 7-10 14v6h12V22h-6c0-4 2-7 6-8l-2-0zM38 14c-6 2-10 7-10 14v6h12V22h-6c0-4 2-7 6-8l-2-0z" fill="#c89b6a" />
        </svg>
        <p>
          我们不追求最特别的味道，只追求每一杯都稳定、干净、值得你再来一次。
          如果今天的咖啡不好喝，请告诉吧台的咖啡师——我们会重做一杯。
        </p>
        <footer>—— 山野咖啡主理人</footer>
      </blockquote>
    </section>

    <!-- CTA -->
    <section class="container story-cta">
      <div class="story-cta__inner">
        <div>
          <h2>来店里，喝一杯山野</h2>
          <p>查看完整菜单，或找到离你最近的门店。</p>
        </div>
        <div class="story-cta__actions">
          <RouterLink to="/menu" class="btn btn-primary">浏览菜单</RouterLink>
          <RouterLink to="/stores" class="btn btn-outline">查找门店</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* ---------- 头图 ---------- */
.story-hero {
  position: relative;
  padding-block: var(--space-8) var(--space-9);
  background:
    radial-gradient(circle at 82% 12%, rgb(232 184 125 / 32%), transparent 46%),
    radial-gradient(circle at 8% 90%, rgb(125 155 106 / 18%), transparent 42%),
    var(--color-surface-muted);
  border-bottom: 1px solid var(--color-line);
}

.story-hero__eyebrow {
  font-size: var(--text-xs);
  letter-spacing: 0.4em;
  color: var(--color-accent-strong);
}

.story-hero__title {
  margin-top: var(--space-3);
  font-size: var(--text-4xl);
  line-height: 1.2;
  color: var(--brand-900);
}

.story-hero__desc {
  max-width: 560px;
  margin-top: var(--space-4);
  color: var(--color-text-soft);
}

.story-hero__wave {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  width: 100%;
  height: 48px;
}

/* ---------- 时间线 ---------- */
.timeline {
  position: relative;
  display: grid;
  gap: var(--space-5);
  margin-top: var(--space-5);
}

.timeline::before {
  content: '';
  position: absolute;
  left: 19px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(180deg, var(--caramel-300), var(--cream-200));
}

.timeline__item {
  position: relative;
  display: flex;
  gap: var(--space-4);
  padding-left: 0;
}

.timeline__marker {
  z-index: 1;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: none;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  border: 1px solid var(--caramel-300);
  box-shadow: var(--shadow-sm);
}

.timeline__marker svg {
  width: 22px;
  height: 22px;
}

.timeline__body {
  padding-top: 4px;
}

.timeline__year {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  letter-spacing: 0.2em;
  color: var(--color-accent-strong);
}

.timeline__title {
  margin-top: var(--space-1);
  font-size: var(--text-lg);
  color: var(--color-primary-strong);
}

.timeline__desc {
  margin-top: var(--space-2);
  max-width: 640px;
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

/* ---------- 分栏 ---------- */
.story-band {
  background: var(--color-surface-muted);
  border-block: 1px solid var(--color-line);
}

.story-split {
  display: grid;
  gap: var(--space-6);
  align-items: center;
}

.story-split__art {
  padding: var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.story-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  margin-top: var(--space-5);
}

.story-facts li {
  display: flex;
  flex-direction: column;
}

.story-facts strong {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  color: var(--color-primary);
}

.story-facts span {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.story-params {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-5);
}

.story-params > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
}

.story-params span {
  font-size: var(--text-xs);
  color: var(--color-text-faint);
}

.story-params strong {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--color-primary);
}

/* ---------- 引言 ---------- */
.story-quote {
  position: relative;
  margin: var(--space-7) 0;
  padding: var(--space-6);
  border-left: 4px solid var(--caramel-500);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.story-quote__icon {
  width: 40px;
  height: 40px;
  margin-bottom: var(--space-3);
}

.story-quote p {
  font-family: var(--font-display);
  font-size: var(--text-lg);
  line-height: 1.9;
  color: var(--color-primary-strong);
}

.story-quote footer {
  margin-top: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-faint);
}

/* ---------- CTA ---------- */
.story-cta__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
  padding: var(--space-6);
  border-radius: var(--radius-xl);
  background: var(--brand-900);
  color: var(--cream-100);
}

.story-cta__inner h2 {
  font-size: var(--text-2xl);
  color: var(--caramel-300);
}

.story-cta__inner p {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: rgb(243 236 224 / 72%);
}

.story-cta__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.story-cta__actions .btn-outline {
  border-color: rgb(243 236 224 / 35%);
  color: var(--cream-100);
}

.story-cta__actions .btn-outline:hover {
  border-color: var(--caramel-300);
  background: rgb(232 201 160 / 12%);
}

@media (min-width: 768px) {
  .story-split {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-7);
  }

  .timeline {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .timeline {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>

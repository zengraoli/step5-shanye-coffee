<script setup lang="ts">
// 会员登录（骨架占位，后续任务实现）
</script>

<template>
  <view class="page">
    <view class="page__card">
      <text class="page__title">会员登录</text>
      <text class="page__desc">手机号登录即将上线，演示验证码固定为 123456。</text>
    </view>
    <TabBar />
  </view>
</template>

<script lang="ts">
import TabBar from '@/components/TabBar.vue'
export default { components: { TabBar } }
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: $space-4 $space-3 200rpx;
}

.page__card {
  padding: $space-5 $space-4;
  border-radius: $radius-lg;
  background: $color-surface;
  border: 1rpx solid $color-line;
  text-align: center;
}

.page__title {
  display: block;
  font-family: $font-display;
  font-size: 40rpx;
  font-weight: 600;
  color: $color-primary-strong;
}

.page__desc {
  display: block;
  margin-top: $space-2;
  font-size: 26rpx;
  color: $color-text-soft;
}
</style>

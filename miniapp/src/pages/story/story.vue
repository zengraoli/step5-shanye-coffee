<template>
  <view class="story">
    <view class="story__hero">
      <view class="story__mark">
        <view class="story__mark-cup" />
      </view>
      <text class="story__title">从山野来，到你杯中</text>
      <text class="story__subtitle">山野咖啡 · SHANYE COFFEE</text>
    </view>

    <view class="story__card">
      <text class="story__card-title">我们的豆子</text>
      <text class="story__card-text">
        云南保山与普洱高海拔产区，人工采摘全红果，日晒与厌氧发酵分批处理。
        中浅烘焙保留花果香，入口是干净的酸质与回甘。
      </text>
    </view>

    <view class="story__card">
      <text class="story__card-title">从产地到吧台</text>
      <text class="story__card-text">
        每一批生豆在烘焙后静置 7 天养豆，吧台按周校准粉量与萃取参数；
        牛奶只用冷链鲜牛乳与燕麦、生椰等植物基，不添加植脂末。
      </text>
    </view>

    <view class="story__card">
      <text class="story__card-title">喝一杯，慢慢来</text>
      <text class="story__card-text">
        我们相信咖啡是日常里的小停顿。到店自提或堂食，都可以坐下来，
        看会儿窗外的树与来往的人。
      </text>
    </view>

    <view class="story__footer">
      <text class="story__footer-text">营业时间与门店信息可在首页切换门店查看</text>
      <view class="story__action" @click="goHome">
        <text class="story__action-text">去点一杯</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
const goHome = () => {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style scoped lang="scss">
.story {
  min-height: 100vh;
  padding: $space-5 $space-4 $space-6;
  background: $color-bg;
}

.story__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-5 0 $space-6;
}

.story__mark {
  display: grid;
  place-items: center;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $color-primary;
}

.story__mark-cup {
  width: 40rpx;
  height: 40rpx;
  border-radius: 6rpx 6rpx 18rpx 18rpx;
  background: $cream-50;
}

.story__title {
  margin-top: $space-4;
  font-size: 40rpx;
  font-weight: 600;
  color: $color-text;
}

.story__subtitle {
  margin-top: $space-2;
  font-size: 22rpx;
  letter-spacing: 4rpx;
  color: $color-text-faint;
}

.story__card {
  margin-bottom: $space-4;
  padding: $space-4;
  border-radius: $radius-lg;
  background: $color-surface;
  border: 1rpx solid $color-line;
}

.story__card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $color-text;
}

.story__card-text {
  display: block;
  margin-top: $space-2;
  font-size: 24rpx;
  line-height: 1.8;
  color: $color-text-soft;
}

.story__footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: $space-4;
}

.story__footer-text {
  font-size: 22rpx;
  color: $color-text-faint;
}

.story__action {
  margin-top: $space-3;
  padding: $space-2 $space-5;
  border-radius: $radius-full;
  background: $color-accent;
}

.story__action-text {
  font-size: 28rpx;
  font-weight: 500;
  color: $cream-50;
}
</style>

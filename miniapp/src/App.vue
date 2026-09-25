<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  // 小程序启动：登录态与购物车在各自 composable 中惰性初始化
})
</script>

<style lang="scss">
/* 全局样式：每个页面公共 css */
page {
  background: $color-bg;
  color: $color-text;
  font-family: $font-body;
  font-size: 28rpx;
  line-height: 1.6;
}
</style>

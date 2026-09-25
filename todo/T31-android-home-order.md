# T31 首页与点单

阶段：S6 android
状态：待完成
设计稿：`docs/design/android/AD2-home.png`、`docs/design/android/AD3-order.png`

## 要做什么
实现首页（门店选择与营业状态、活动横幅、自提 / 堂食入口、当季推荐）和点单页（分类 Tab、商品列表、规格底部弹窗、售罄状态、购物车条）。价格与购物车金额要体现“第二杯半价”活动。

## 完成标准
- 页面布局、颜色、字号、间距、图标、文案与设计稿一致
- 数据来自 server 接口，不写死在页面里
- `./gradlew assembleDebug` 通过，相关测试全部通过

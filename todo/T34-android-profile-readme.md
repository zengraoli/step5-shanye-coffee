# T34 我的与说明文档

阶段：S6 android
状态：待完成
设计稿：`docs/design/android/AD6-profile.png`

## 要做什么
实现“我的”页（会员卡、积分与等级进度、优惠券 / 订单 / 积分统计、菜单入口）；为金额格式化与价格展示写单元测试；为 6 个页面编写 Roborazzi 截图测试（Robolectric + Compose，用演示数据渲染），运行 `gradlew.bat recordRoborazziDebug` 把截图输出到 `android/screenshots/` 并提交；`android/README.md` 写明构建、安装、`adb reverse`、deep link 与截图测试的用法。

## 完成标准
- 页面布局、颜色、字号、间距、图标、文案与设计稿一致
- 数据来自 server 接口，不写死在页面里
- 单元测试通过
- `android/screenshots/` 中有 6 个页面的截图
- `./gradlew assembleDebug` 通过，相关测试全部通过

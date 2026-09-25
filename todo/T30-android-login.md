# T30 登录

阶段：S6 android
状态：待完成
设计稿：`docs/design/android/AD1-login.png`

## 要做什么
实现手机号 + 验证码登录页，与设计稿一致；验证码固定 123456；登录后回到原页面。

## 完成标准
- 页面布局、颜色、字号、间距、图标、文案与设计稿一致
- 数据来自 server 接口，不写死在页面里
- `./gradlew assembleDebug` 通过，相关测试全部通过

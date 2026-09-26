# T29 Android 项目骨架

阶段：S6 android
状态：已完成（v0.34，2026-09-26）

## 要做什么
在仓库根目录新建 `android/` 原生项目。技术栈：Kotlin 2.x + Jetpack Compose（Material 3）+ Navigation Compose + Retrofit/OkHttp + kotlinx.serialization + DataStore；Gradle Kotlin DSL 与版本目录；minSdk 26，targetSdk 35；单 Activity。按设计稿写 Material 3 主题（品牌色、字体层级、圆角），底部导航四个 Tab（首页 / 点单 / 订单 / 我的）；网络层解析统一响应格式，金额以“分”接收、界面格式化为 ¥xx.xx；登录态用 DataStore 保存，接口返回未登录时统一跳转登录页。接口基地址写在 BuildConfig 中，默认 `http://127.0.0.1:3000`，真机调试时通过 `adb reverse tcp:3000 tcp:3000` 访问本机 server；为 127.0.0.1 与 10.0.2.2 配置明文 HTTP 白名单（network security config）。支持 deep link `shanye://<页面>`（login、home、order、checkout、orders、profile），方便测试时直接打开对应页面。

## 完成标准
- `./gradlew assembleDebug` 通过（Windows 下为 `gradlew.bat assembleDebug`）
- deep link 可打开对应页面
- `./gradlew assembleDebug` 通过，相关测试全部通过

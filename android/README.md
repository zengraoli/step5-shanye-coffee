# 山野咖啡 · Android 客户端

原生 Android 点单客户端：Kotlin + Jetpack Compose（Material 3）+ Navigation Compose + Retrofit/OkHttp + kotlinx.serialization + DataStore。单 Activity，底部四个 Tab（首页 / 点单 / 订单 / 我的），设计稿见 `docs/design/android/`。

- minSdk 26（Android 8.0），targetSdk / compileSdk 35
- 需要 JDK 17+ 与 Android SDK（platform `android-35`、build-tools `35.0.0`）

## 构建

```bash
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

产物：`app/build/outputs/apk/debug/app-debug.apk`。

## 安装与调试

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 接口基地址默认 http://127.0.0.1:3000（BuildConfig.API_BASE_URL）
# 真机调试时把本机 server 映射到真机：
adb reverse tcp:3000 tcp:3000

# 自定义接口地址
./gradlew assembleDebug -PAPI_BASE_URL=http://192.168.1.10:3000
```

`127.0.0.1`、`10.0.2.2`（模拟器）与 `localhost` 已在 `app/src/main/res/xml/network_security_config.xml` 中配置明文 HTTP 白名单，开发期可直接请求 http 接口。

## Deep link

支持 `shanye://<页面>` 直接打开对应页面：

| 链接 | 页面 |
|-|-|
| `shanye://login` | 会员登录 |
| `shanye://home` | 首页 |
| `shanye://order` | 点单（可带 `?productId=1` 直接打开该商品规格） |
| `shanye://checkout` | 确认订单 |
| `shanye://orders` | 我的订单 |
| `shanye://profile` | 我的 |
| `shanye://coupons` | 我的优惠券 / 领券中心 |
| `shanye://order-detail/123` | 订单详情（`123` 为订单 id） |

深链在导航建图后统一消费（冷启动与 App 已运行都支持）；订单详情使用路径参数，
因此 `shanye://order-detail/123` 与命令示例中的 `shanye://order-detail/123` 一致可用。

```bash
adb shell am start -a android.intent.action.VIEW -d "shanye://order"
adb shell am start -a android.intent.action.VIEW -d "shanye://order-detail/123"
```

## 测试

```bash
./gradlew testDebugUnitTest          # 单元测试（金额/时间格式化、购物车、ViewModel、深链、底部 Tab）
./gradlew recordRoborazziDebug       # 重新录制页面截图到 android/screenshots/
./gradlew verifyRoborazziDebug       # 截图回归校验
```

### 与真实 server 联调

`app/src/test/.../integration/AndroidFlowIntegrationTest.kt` 用真实接口走
“登录 → 领券 → 报价（用券 / 不用券）→ 下单 → 支付 → 订单详情 → 积分刷新 → 重复支付拦截”，
因此需要一个正在运行的 server（默认 `http://127.0.0.1:3000`，模拟器用 `10.0.2.2`）：

```bash
# Windows 宿主机
./gradlew testDebugUnitTest --tests "com.shanye.coffee.integration.*"

# Android 模拟器访问宿主机
./gradlew testDebugUnitTest --tests "com.shanye.coffee.integration.*" -PAPI_BASE_URL=http://10.0.2.2:3000
```

联调用例会真实写入数据库（每次运行用新的手机号），请在测试库上运行。

截图测试使用 Robolectric + Compose 与演示数据渲染六个页面（登录 / 首页 / 点单 / 确认订单 / 订单详情 / 我的），产出在 `android/screenshots/` 并随仓库提交。

## 导航与登录态

- 底部四个 Tab 可点击切换（`首页 / 点单 / 订单 / 我的`），Tab 间切换保留各 Tab 状态、不堆返回栈。
- 登录 / 确认订单 / 订单详情等页面不显示底部导航；登录页适配键盘弹出（`imePadding`）。
- token 失效（`code === 10002`）时统一清理会话并跳登录页，购物车与页面状态不丢失、不闪退。
- 登录成功自动返回来源页（如从确认订单页跳登录，回来会重新报价）。

## 已知问题

- 尚未提供深色主题（设计稿为浅色米白底）。
- 网络层未做证书固定（Certificate Pinning）。
- 第二杯半价按“同一商品第 2、4… 件半价”在客户端预估展示，最终金额以服务端报价为准。
- 若本机通过代理访问外网，需为 Gradle 配置代理（`~/.gradle/gradle.properties` 设置 `systemProp.http(s).proxyHost/Port`），Robolectric 下载依赖同理。
- 门店“距你 X km”未实现（服务端不提供定位距离），首页展示营业时间替代。

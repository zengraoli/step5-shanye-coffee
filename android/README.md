# 山野咖啡 · Android 客户端

原生 Android 点单客户端：Kotlin 2.0 + Jetpack Compose（Material 3）+ Navigation Compose + Retrofit/OkHttp + kotlinx.serialization + DataStore。单 Activity，底部四个 Tab（首页 / 点单 / 订单 / 我的），设计稿见 `docs/design/android/`。

## 构建

```bash
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

产物：`app/build/outputs/apk/debug/app-debug.apk`。

- minSdk 26（Android 8.0），targetSdk / compileSdk 35
- 需要 JDK 17+ 与 Android SDK（platform android-35、build-tools 35.0.0）

## 安装与调试

```bash
# 安装到已连接设备
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 接口基地址默认 http://127.0.0.1:3000（BuildConfig.API_BASE_URL）
# 真机调试时把本机 server 映射到真机：
adb reverse tcp:3000 tcp:3000

# 自定义接口地址
./gradlew assembleDebug -PAPI_BASE_URL=http://192.168.1.10:3000
```

`127.0.0.1`、`10.0.2.2`（模拟器）与 `localhost` 已在 `res/xml/network_security_config.xml` 中配置明文 HTTP 白名单，开发期可直接请求 http 接口。

## Deep link

支持 `shanye://<页面>` 直接打开对应页面：

| 链接 | 页面 |
|-|-|
| `shanye://login` | 会员登录 |
| `shanye://home` | 首页 |
| `shanye://order` | 点单 |
| `shanye://checkout` | 确认订单 |
| `shanye://orders` | 我的订单 |
| `shanye://profile` | 我的 |
| `shanye://order-detail/{orderId}` | 订单详情 |

```bash
adb shell am start -a android.intent.action.VIEW -d "shanye://order"
```

## 测试

```bash
./gradlew testDebugUnitTest    # 单元测试（金额/时间格式化、deep link）
```

## 已知问题

- 尚未提供深色主题（设计稿为浅色米白底）。
- 网络层未做证书固定（Certificate Pinning）。
- 若本机通过代理访问外网，需为 Gradle 配置代理（`~/.gradle/gradle.properties` 中设置 `systemProp.http(s).proxyHost/Port`），Robolectric 下载依赖同理。

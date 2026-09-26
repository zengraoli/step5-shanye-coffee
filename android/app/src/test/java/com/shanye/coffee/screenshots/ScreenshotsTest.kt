package com.shanye.coffee.screenshots

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.rememberNavController
import com.github.takahirom.roborazzi.captureRoboImage
import com.shanye.coffee.ui.checkout.CheckoutScreenContent
import com.shanye.coffee.ui.home.HomeScreenContent
import com.shanye.coffee.ui.login.LoginScreenContent
import com.shanye.coffee.ui.navigation.ShanyeBottomBar
import com.shanye.coffee.ui.order.OrderScreenContent
import com.shanye.coffee.ui.orderdetail.OrderDetailScreenContent
import com.shanye.coffee.ui.orders.OrdersScreenContent
import com.shanye.coffee.ui.profile.ProfileScreenContent
import com.shanye.coffee.ui.theme.ShanyeCoffeePreviewTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * 六个页面的 Roborazzi 截图测试（演示数据渲染，含底部导航）。
 * 运行：gradlew.bat recordRoborazziDebug，截图输出到 android/screenshots/。
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xhdpi")
class ScreenshotsTest {

    @get:Rule
    val composeRule = createComposeRule()

    /**
     * 统一包裹：主题 + 固定手机尺寸 + 底部导航，使截图与真机一致。
     * 使用固定高度的 Column（而非 Scaffold），保证内容区的 weight 在 Robolectric 下生效。
     */
    private fun setScreen(content: @androidx.compose.runtime.Composable () -> Unit) {
        composeRule.setContent {
            ShanyeCoffeePreviewTheme {
                val navController = rememberNavController()
                Column(modifier = Modifier.size(SCREEN_WIDTH, SCREEN_HEIGHT)) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                    ) {
                        content()
                    }
                    ShanyeBottomBar(navController = navController)
                }
            }
        }
    }

    private companion object {
        // 与 @Config qualifiers 的手机尺寸一致（411x891dp）
        val SCREEN_WIDTH = 411.dp
        val SCREEN_HEIGHT = 891.dp
    }

    @Test
    fun login() {
        setScreen {
            LoginScreenContent(
                state = demoLoginState(),
                onPhoneChange = {},
                onCodeChange = {},
                onToggleAgreed = {},
                onSendCode = {},
                onSubmit = {},
            )
        }
        composeRule.onRoot().captureRoboImage()
    }

    @Test
    fun home() {
        setScreen {
            HomeScreenContent(
                state = demoHomeState(),
                onStoreClick = {},
                onStorePickerDismiss = {},
                onStoreSelect = {},
                onGoOrder = {},
                onProductClick = {},
            )
        }
        composeRule.onRoot().captureRoboImage()
    }

    @Test
    fun order() {
        setScreen {
            OrderScreenContent(
                state = demoOrderState(),
                onSelectCategory = {},
                onSelectOrderType = {},
                onProductClick = {},
                onSpecOptionSelect = { _, _ -> },
                onSpecDismiss = {},
                onSpecConfirm = {},
                onCartQuantityChange = { _, _ -> },
                onToggleCart = {},
                onClearCart = {},
                onGoCheckout = {},
            )
        }
        composeRule.onRoot().captureRoboImage()
    }

    @Test
    fun checkout() {
        setScreen {
            CheckoutScreenContent(
                state = demoCheckoutState(),
                onSelectOrderType = {},
                onSelectCoupon = {},
                onClearCoupon = {},
                onSubmit = {},
                onBack = {},
                onGoLogin = {},
            )
        }
        composeRule.onRoot().captureRoboImage()
    }

    @Test
    fun orderDetail() {
        setScreen {
            OrderDetailScreenContent(
                state = demoOrderDetailState(),
                onBack = {},
                onRefresh = {},
                onPay = {},
                onCancel = {},
                onConfirm = {},
                onGoLogin = {},
            )
        }
        composeRule.onRoot().captureRoboImage()
    }

    @Test
    fun orders() {
        setScreen {
            OrdersScreenContent(
                state = demoOrdersState(),
                onSelectStatus = {},
                onRefresh = {},
                onOrderClick = {},
                onGoLogin = {},
            )
        }
        composeRule.onRoot().captureRoboImage()
    }

    @Test
    fun profile() {
        setScreen {
            ProfileScreenContent(
                state = demoProfileState(),
                onGoOrders = {},
                onGoCoupons = {},
                onRefresh = {},
                onGoLogin = {},
            )
        }
        composeRule.onRoot().captureRoboImage()
    }
}

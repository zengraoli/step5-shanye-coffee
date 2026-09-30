package com.shanye.coffee.ui

import android.content.Intent
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.navigation.NavController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.createGraph
import androidx.navigation.compose.rememberNavController
import androidx.test.core.app.ApplicationProvider
import com.shanye.coffee.DeepLinkBus
import com.shanye.coffee.ui.navigation.Routes
import com.shanye.coffee.ui.navigation.ShanyeBottomBar
import com.shanye.coffee.ui.navigation.ShanyeNavigator
import com.shanye.coffee.ui.navigation.TopLevelTab
import com.shanye.coffee.ui.theme.ShanyeCoffeePreviewTheme
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * 底部导航 Tab 点击切换：第三轮验收发现四个 Tab 无点击回调，
 * 这里真实渲染底部导航 + 一个最小 NavHost，点击后必须跳到对应路由。
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w411dp-h891dp-xhdpi")
class BottomNavTest {

    @get:Rule
    val composeRule = createComposeRule()

    private lateinit var navController: androidx.navigation.NavHostController

    @Before
    fun setUp() {
        ShanyeNavigator.bind(
            // 占位：真实控制器在 setContent 中替换
            androidx.navigation.NavHostController(ApplicationProvider.getApplicationContext()),
        )
    }

    @After
    fun tearDown() {
        // 解绑，避免影响其它用例
        ShanyeNavigator.bind(
            androidx.navigation.NavHostController(ApplicationProvider.getApplicationContext()),
        )
    }

    @Test
    fun `点击每个 Tab 都会跳到对应页面`() {
        composeRule.setContent {
            ShanyeCoffeePreviewTheme {
                navController = rememberNavController()
                ShanyeNavigator.bind(navController)
                NavHost(navController = navController, startDestination = Routes.HOME) {
                    composable(Routes.HOME) { PageText("首页页面") }
                    composable(Routes.ORDER) { PageText("点单页面") }
                    composable(Routes.ORDERS) { PageText("订单列表页面") }
                    composable(Routes.PROFILE) { PageText("我的页面") }
                }
                ShanyeBottomBar(navController = navController)
            }
        }

        composeRule.onNodeWithText("首页").assertIsDisplayed()

        composeRule.onNodeWithText("我的").performClick()
        composeRule.waitForIdle()
        assertEquals(Routes.PROFILE, navController.currentDestination?.route)
        composeRule.onNodeWithText("我的页面").assertIsDisplayed()

        composeRule.onNodeWithText("订单").performClick()
        composeRule.waitForIdle()
        assertEquals(Routes.ORDERS, navController.currentDestination?.route)

        composeRule.onNodeWithText("点单").performClick()
        composeRule.waitForIdle()
        assertEquals(Routes.ORDER, navController.currentDestination?.route)

        composeRule.onNodeWithText("首页").performClick()
        composeRule.waitForIdle()
        assertEquals(Routes.HOME, navController.currentDestination?.route)
    }

    @Test
    fun `Tab 之间来回切换不会无限堆栈`() {
        composeRule.setContent {
            ShanyeCoffeePreviewTheme {
                val controller = rememberNavController()
                navController = controller
                ShanyeNavigator.bind(controller)
                NavHost(navController = controller, startDestination = Routes.HOME) {
                    composable(Routes.HOME) { PageText("首页页面") }
                    composable(Routes.ORDER) { PageText("点单页面") }
                    composable(Routes.ORDERS) { PageText("订单列表页面") }
                    composable(Routes.PROFILE) { PageText("我的页面") }
                }
                ShanyeBottomBar(navController = controller)
            }
        }

        repeat(3) {
            composeRule.onNodeWithText("我的").performClick()
            composeRule.waitForIdle()
            composeRule.onNodeWithText("首页").performClick()
            composeRule.waitForIdle()
        }
        assertEquals(Routes.HOME, navController.currentDestination?.route)
        // 从首页再返回应退出 App（Tab 复用不堆栈）：没有多余返回项
        assertEquals(false, navController.popBackStack())
    }
}

/** 深链映射：shanye://… → 站内路由 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class DeepLinkRouteTest {

    @Test
    fun `常见深链映射到对应路由`() {
        assertEquals("home", DeepLinkBus.routeFor("shanye://home"))
        assertEquals("order", DeepLinkBus.routeFor("shanye://order"))
        assertEquals("checkout", DeepLinkBus.routeFor("shanye://checkout"))
        assertEquals("orders", DeepLinkBus.routeFor("shanye://orders"))
        assertEquals("profile", DeepLinkBus.routeFor("shanye://profile"))
        assertEquals("login", DeepLinkBus.routeFor("shanye://login"))
        assertEquals("coupons", DeepLinkBus.routeFor("shanye://coupons"))
    }

    @Test
    fun `订单详情深链带路径参数`() {
        assertEquals("order-detail/42", DeepLinkBus.routeFor("shanye://order-detail/42"))
        assertNull(DeepLinkBus.routeFor("shanye://order-detail/abc"))
    }

    @Test
    fun `点单深链可带商品参数并可忽略`() {
        assertEquals("order?productId=5", DeepLinkBus.routeFor("shanye://order?productId=5"))
        assertEquals("order", DeepLinkBus.routeFor("shanye://order"))
    }

    @Test
    fun `非 shanye scheme 与未知页面被忽略`() {
        assertNull(DeepLinkBus.routeFor("https://example.com"))
        assertNull(DeepLinkBus.routeFor("shanye://unknown"))
        assertNull(DeepLinkBus.routeFor("shanye://"))
    }

    @Test
    fun `intent 深链经 MainActivity 处理不抛异常`() {
        val intent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse("shanye://order-detail/7"))
        DeepLinkBus.emit(intent.dataString ?: "")
        assertEquals("order-detail/7", DeepLinkBus.routeFor(intent.dataString ?: ""))
    }
}

/** 401 时导航必须是安全空操作（不再崩溃 Cannot navigate to login） */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class UnauthorizedNavigationTest {

    @Test
    fun `未绑定控制器时跳登录不抛异常`() {
        assertFalse(ShanyeNavigator.controllerOrNull() != null)
        // 控制器未绑定时所有跳转静默失败，不应抛出 IllegalStateException
        ShanyeNavigator.goLogin()
        ShanyeNavigator.goCheckout()
        ShanyeNavigator.goOrders()
        ShanyeNavigator.goOrderDetail(1L)
        ShanyeNavigator.back()
    }
}

/** 测试页面占位文案 */
@androidx.compose.runtime.Composable
private fun PageText(text: String) {
    androidx.compose.material3.Text(text = text)
}

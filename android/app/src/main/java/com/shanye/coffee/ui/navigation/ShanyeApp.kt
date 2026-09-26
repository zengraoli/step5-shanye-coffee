package com.shanye.coffee.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import kotlinx.coroutines.flow.first
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.OrderSession
import com.shanye.coffee.data.remote.dto.MemberProfileDto
import com.shanye.coffee.ui.LocalAppContainer
import com.shanye.coffee.ui.checkout.CheckoutScreen
import com.shanye.coffee.ui.home.HomeScreen
import com.shanye.coffee.ui.login.LoginScreen
import com.shanye.coffee.ui.order.OrderScreen
import com.shanye.coffee.ui.orderdetail.OrderDetailScreen
import com.shanye.coffee.ui.order.OrderScreen
import com.shanye.coffee.ui.orders.OrdersScreen
import com.shanye.coffee.ui.profile.ProfileScreen

/** 应用主导航：单 Activity + Navigation Compose，底部四个 Tab */
@Composable
fun ShanyeApp() {
    val navController = rememberNavController()
    val container = LocalAppContainer.current

    // 启动时恢复本地保存的登录态
    LaunchedEffect(Unit) {
        container.sessionStore.profileJsonFlow.first()?.let { json ->
            runCatching {
                kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
                    .decodeFromString<com.shanye.coffee.data.remote.dto.MemberProfileDto>(json)
            }.onSuccess { com.shanye.coffee.data.MemberSession.update(it) }
        }
    }

    Scaffold(
        bottomBar = { ShanyeBottomBar(navController) },
        containerColor = androidx.compose.material3.MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            NavHost(navController = navController, startDestination = Routes.HOME) {
                composable(
                    route = Routes.HOME,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://home" }),
                ) {
                    HomeScreen(
                        onGoOrder = { type ->
                            OrderSession.setOrderType(type)
                            navController.navigate(Routes.ORDER) { launchSingleTop = true }
                        },
                        onProductClick = {
                            navController.navigate(Routes.ORDER) { launchSingleTop = true }
                        },
                    )
                }

                composable(
                    route = Routes.ORDER,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://order" }),
                ) {
                    OrderScreen(
                        onGoCheckout = {
                            navController.navigate(Routes.CHECKOUT)
                        },
                    )
                }

                composable(
                    route = Routes.ORDERS,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://orders" }),
                ) { OrdersScreen() }

                composable(
                    route = Routes.PROFILE,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://profile" }),
                ) { ProfileScreen() }

                composable(
                    route = Routes.LOGIN,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://login" }),
                ) {
                    LoginScreen(
                        onLoggedIn = {
                            // 登录后回到原页面：有返回栈则返回，否则回首页
                            if (navController.previousBackStackEntry != null) {
                                navController.popBackStack()
                            } else {
                                navController.navigate(Routes.HOME) {
                                    popUpTo(Routes.HOME) { inclusive = true }
                                    launchSingleTop = true
                                }
                            }
                        },
                    )
                }

                composable(
                    route = Routes.CHECKOUT,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://checkout" }),
                ) {
                    CheckoutScreen(
                        onPaid = { orderId ->
                            navController.navigate(Routes.orderDetail(orderId))
                        },
                        onBack = { navController.popBackStack() },
                        onGoLogin = { navController.navigate(Routes.LOGIN) },
                    )
                }

                composable(
                    route = "${Routes.ORDER_DETAIL}?${Routes.ARG_ORDER_ID}={${Routes.ARG_ORDER_ID}}",
                    arguments = listOf(
                        navArgument(Routes.ARG_ORDER_ID) { type = NavType.LongType },
                    ),
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://order-detail/{orderId}" }),
                ) { entry ->
                    val orderId = entry.arguments?.getLong(Routes.ARG_ORDER_ID) ?: 0L
                    OrderDetailScreen(
                        orderId = orderId,
                        onBack = { navController.popBackStack() },
                    )
                }
            }
        }
    }
}

/** 导航辅助（供各页面跳转使用） */
object ShanyeNavigator {
    lateinit var controller: NavHostController

    fun bind(controller: NavHostController) {
        this.controller = controller
    }

    fun goLogin() {
        controller.navigate(Routes.LOGIN)
    }

    fun goCheckout() {
        controller.navigate(Routes.CHECKOUT)
    }

    fun goOrders() {
        controller.navigate(Routes.ORDERS)
    }

    fun goOrderDetail(orderId: Long) {
        controller.navigate(Routes.orderDetail(orderId))
    }

    fun back() {
        controller.popBackStack()
    }
}

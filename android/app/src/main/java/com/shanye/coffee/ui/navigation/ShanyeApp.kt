package com.shanye.coffee.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.shanye.coffee.DeepLinkBus
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.OrderSession
import com.shanye.coffee.data.SessionBus
import com.shanye.coffee.ui.LocalAppContainer
import com.shanye.coffee.ui.checkout.CheckoutScreen
import com.shanye.coffee.ui.coupons.CouponsScreen
import com.shanye.coffee.ui.coupons.CouponsScreen
import com.shanye.coffee.ui.home.HomeScreen
import com.shanye.coffee.ui.login.LoginScreen
import com.shanye.coffee.ui.order.OrderScreen
import com.shanye.coffee.ui.orderdetail.OrderDetailScreen
import com.shanye.coffee.ui.orders.OrdersScreen
import com.shanye.coffee.ui.profile.ProfileScreen

/** 应用主导航：单 Activity + Navigation Compose，底部四个 Tab */
@Composable
fun ShanyeApp() {
    val navController = rememberNavController()
    val container = LocalAppContainer.current

    // 导航辅助绑定到带 graph 的控制器（401 深链都走它，不会崩）
    LaunchedEffect(navController) {
        ShanyeNavigator.bind(navController)
    }

    // 深链（冷启动 + onNewIntent）统一在这里消费
    LaunchedEffect(navController) {
        DeepLinkBus.uris.collect { uri ->
            val route = DeepLinkBus.routeFor(uri) ?: return@collect
            runCatching {
                navController.navigate(route) { launchSingleTop = true }
            }
        }
    }

    // 启动时恢复本地保存的登录态（冷启动 deep link 依赖这里的时序）
    LaunchedEffect(Unit) {
        container.sessionStore.restore()?.let { profile ->
            MemberSession.update(profile)
        }
        MemberSession.markRestored()
    }

    // 登录态失效：统一跳登录页（此时 graph 一定已建好）
    LaunchedEffect(Unit) {
        SessionBus.unauthorized.collect {
            runCatching {
                navController.navigate(Routes.LOGIN) {
                    popUpTo(Routes.HOME) { inclusive = false }
                    launchSingleTop = true
                }
            }
        }
    }

    // 底部导航只在四个 Tab 页面显示；登录 / 结算 / 详情等页面隐藏
    val backStackEntry by navController.currentBackStackEntryAsState()
    val route = backStackEntry?.destination?.route
    val showBottomBar = TopLevelTab.entries.any { it.route == route }

    Scaffold(
        bottomBar = { if (showBottomBar) ShanyeBottomBar(navController) },
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
                        onProductClick = { productId ->
                            navController.navigate("${Routes.ORDER}?productId=$productId") {
                                launchSingleTop = true
                            }
                        },
                    )
                }

                composable(
                    route = "${Routes.ORDER}?productId={productId}",
                    arguments = listOf(
                        androidx.navigation.navArgument("productId") {
                            type = NavType.LongType
                            defaultValue = 0L
                        },
                    ),
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://order?productId={productId}" }),
                ) { entry ->
                    val focusProductId = entry.arguments?.getLong("productId") ?: 0L
                    OrderScreen(
                        focusProductId = focusProductId,
                        onGoCheckout = {
                            navController.navigate(Routes.CHECKOUT) { launchSingleTop = true }
                        },
                    )
                }

                composable(
                    route = Routes.ORDERS,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://orders" }),
                ) {
                    OrdersScreen(
                        onOrderClick = { orderId ->
                            navController.navigate(Routes.orderDetail(orderId))
                        },
                        onGoLogin = {
                            navController.navigate(Routes.LOGIN) { launchSingleTop = true }
                        },
                    )
                }

                composable(
                    route = Routes.PROFILE,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://profile" }),
                ) {
                    ProfileScreen(
                        onGoOrders = {
                            navController.navigate(Routes.ORDERS) { launchSingleTop = true }
                        },
                        onGoCoupons = {
                            navController.navigate(Routes.COUPONS) { launchSingleTop = true }
                        },
                        onGoLogin = {
                            navController.navigate(Routes.LOGIN) { launchSingleTop = true }
                        },
                        onLogout = {
                            navController.navigate(Routes.HOME) {
                                popUpTo(Routes.HOME) { inclusive = true }
                                launchSingleTop = true
                            }
                        },
                    )
                }

                composable(
                    route = Routes.COUPONS,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://coupons" }),
                ) {
                    CouponsScreen(
                        onGoLogin = {
                            navController.navigate(Routes.LOGIN) { launchSingleTop = true }
                        },
                    )
                }

                composable(
                    route = Routes.LOGIN,
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://login" }),
                ) {
                    LoginScreen(
                        onLoggedIn = {
                            // 登录后回到原页面：有返回栈则返回，否则回首页 Tab
                            val returned = navController.popBackStack()
                            if (!returned) {
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
                            // 支付后进入详情，并把已支付的结算页从返回栈移除
                            navController.navigate(Routes.orderDetail(orderId)) {
                                popUpTo(Routes.CHECKOUT) { inclusive = true }
                                launchSingleTop = true
                            }
                        },
                        onBack = { navController.popBackStack() },
                        onGoLogin = {
                            navController.navigate(Routes.LOGIN) { launchSingleTop = true }
                        },
                    )
                }

                composable(
                    route = Routes.ORDER_DETAIL_PATTERN,
                    arguments = listOf(
                        navArgument(Routes.ARG_ORDER_ID) { type = NavType.LongType },
                    ),
                    deepLinks = listOf(navDeepLink { uriPattern = "shanye://order-detail/{${Routes.ARG_ORDER_ID}}" }),
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

/** 兼容旧代码：导航辅助 */
object ShanyeNavigatorHolder

package com.shanye.coffee.ui.navigation

import androidx.navigation.NavHostController

/**
 * 导航辅助（供各页面跳转使用）。
 * 控制器在 ShanyeApp 建图后绑定；未绑定时所有跳转都是安全空操作，
 * 不会出现 “Cannot navigate … graph has not been set” 崩溃。
 */
object ShanyeNavigator {
    @Volatile
    private var bound: NavHostController? = null

    fun bind(controller: NavHostController) {
        bound = controller
    }

    fun controllerOrNull(): NavHostController? = bound

    private fun navigate(block: NavHostController.() -> Unit) {
        bound?.let { controller ->
            runCatching { controller.block() }
        }
    }

    fun goLogin() {
        navigate {
            navigate(Routes.LOGIN) {
                popUpTo(Routes.HOME) { inclusive = false }
                launchSingleTop = true
            }
        }
    }

    fun goCheckout() {
        navigate { navigate(Routes.CHECKOUT) { launchSingleTop = true } }
    }

    fun goOrders() {
        navigate {
            navigate(Routes.ORDERS) {
                popUpTo(Routes.HOME) { inclusive = false }
                launchSingleTop = true
            }
        }
    }

    fun goOrderDetail(orderId: Long) {
        navigate { navigate(Routes.orderDetail(orderId)) { launchSingleTop = true } }
    }

    fun back() {
        bound?.let { controller ->
            if (!controller.popBackStack()) {
                runCatching {
                    controller.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            }
        }
    }
}

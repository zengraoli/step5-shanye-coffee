package com.shanye.coffee.ui.navigation

/** 路由定义；deep link 形如 shanye://<route> */
object Routes {
    const val LOGIN = "login"
    const val HOME = "home"
    const val ORDER = "order"
    const val CHECKOUT = "checkout"
    const val ORDERS = "orders"
    const val ORDER_DETAIL = "order-detail"
    const val PROFILE = "profile"

    const val ARG_ORDER_ID = "orderId"

    fun orderDetail(orderId: Long): String = "$ORDER_DETAIL?$ARG_ORDER_ID=$orderId"
}

/** 底部导航四个 Tab */
enum class TopLevelTab(
    val route: String,
    val label: String,
    val deepLink: String,
) {
    HOME(Routes.HOME, "首页", "shanye://home"),
    ORDER(Routes.ORDER, "点单", "shanye://order"),
    ORDERS(Routes.ORDERS, "订单", "shanye://orders"),
    PROFILE(Routes.PROFILE, "我的", "shanye://profile"),
}

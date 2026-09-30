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
    /** 会员优惠券（领券中心 / 我的优惠券） */
    const val COUPONS = "coupons"

    const val ARG_ORDER_ID = "orderId"

    /** 订单详情使用路径参数，深链 shanye://order-detail/123 才能命中 */
    fun orderDetail(orderId: Long): String = "$ORDER_DETAIL/$orderId"

    /** 订单详情的路由模板 */
    const val ORDER_DETAIL_PATTERN = "$ORDER_DETAIL/{$ARG_ORDER_ID}"
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

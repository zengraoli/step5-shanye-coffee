package com.shanye.coffee.ui.orderdetail

import androidx.compose.runtime.Composable
import com.shanye.coffee.ui.common.PlaceholderScreen

@Composable
fun OrderDetailScreen(orderId: Long) {
    PlaceholderScreen(title = "订单详情", description = "订单 #$orderId 详情页即将上线")
}

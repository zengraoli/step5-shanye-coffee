package com.shanye.coffee.ui.orders

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.ViewModel
import com.shanye.coffee.data.remote.dto.OrderDto
import com.shanye.coffee.ui.LocalAppContainer
import com.shanye.coffee.ui.theme.BrandGreen
import com.shanye.coffee.ui.theme.CreamBackground
import com.shanye.coffee.ui.theme.Terracotta
import com.shanye.coffee.ui.theme.TerracottaContainer
import com.shanye.coffee.ui.theme.TextOnDark
import com.shanye.coffee.ui.theme.TextPrimary
import com.shanye.coffee.ui.theme.TextSecondary
import com.shanye.coffee.util.MoneyFormat
import com.shanye.coffee.util.TimeFormat

private val STATUS_FILTERS = listOf(
    "" to "全部",
    "pending_pay" to "待支付",
    "paid" to "已支付",
    "making" to "制作中",
    "pickable" to "待取餐",
    "completed" to "已完成",
    "cancelled" to "已取消",
)

/**
 * 我的订单列表：状态下拉筛选 + 下拉刷新（后台推进状态后刷新可见最新状态）。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrdersScreen(onOrderClick: (Long) -> Unit, onGoLogin: () -> Unit = {}) {
    val container = LocalAppContainer.current
    val viewModel: OrdersViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            override fun <T : ViewModel> create(
                modelClass: Class<T>,
                extras: androidx.lifecycle.viewmodel.CreationExtras,
            ): T = OrdersViewModel(container.orderRepository) as T
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()

    OrdersScreenContent(
        state = state,
        onSelectStatus = viewModel::selectStatus,
        onRefresh = viewModel::refresh,
        onOrderClick = onOrderClick,
        onGoLogin = onGoLogin,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OrdersScreenContent(
    state: OrdersUiState,
    onSelectStatus: (String) -> Unit,
    onRefresh: () -> Unit,
    onOrderClick: (Long) -> Unit,
    onGoLogin: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CreamBackground),
    ) {
        Text(
            text = "我的订单",
            style = MaterialTheme.typography.headlineLarge,
            color = TextPrimary,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
        )

        // 状态筛选
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            STATUS_FILTERS.forEach { (value, label) ->
                val active = state.status == value
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(percent = 50))
                        .background(if (active) BrandGreen else MaterialTheme.colorScheme.surface)
                        .clickable { onSelectStatus(value) }
                        .padding(horizontal = 14.dp, vertical = 6.dp),
                ) {
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelMedium,
                        color = if (active) TextOnDark else TextSecondary,
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        when {
            state.loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandGreen)
            }
            state.error != null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(text = state.error, color = TextSecondary)
            }
            else -> PullToRefreshBox(
                isRefreshing = state.refreshing,
                onRefresh = onRefresh,
                modifier = Modifier.fillMaxSize(),
            ) {
                if (state.orders.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = "还没有订单，去点一杯吧",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(state.orders, key = { it.id }) { order ->
                            OrderCard(order = order, onClick = { onOrderClick(order.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderCard(order: OrderDto, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(onClick = onClick)
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = order.orderNo,
                style = MaterialTheme.typography.labelLarge,
                color = TextSecondary,
                modifier = Modifier.weight(1f),
            )
            StatusBadge(status = order.status, statusText = order.statusText)
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = order.items.joinToString("、") { "${it.productName} ×${it.quantity}" },
                    style = MaterialTheme.typography.titleSmall,
                    color = TextPrimary,
                    maxLines = 2,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${order.storeName} · ${TimeFormat.short(order.createdAt)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = MoneyFormat.yuan(order.payFen.toLong()),
                    style = MaterialTheme.typography.titleMedium,
                    color = Terracotta,
                    fontWeight = FontWeight.Bold,
                )
                if (order.pickupCode != null) {
                    Text(
                        text = "取餐码 ${order.pickupCode}",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusBadge(status: String, statusText: String) {
    val background = when (status) {
        "cancelled" -> MaterialTheme.colorScheme.surfaceVariant
        "completed" -> BrandGreen.copy(alpha = 0.12f)
        else -> TerracottaContainer
    }
    val color = when (status) {
        "cancelled" -> TextSecondary
        "completed" -> BrandGreen
        else -> Terracotta
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(percent = 50))
            .background(background)
            .padding(horizontal = 10.dp, vertical = 2.dp),
    ) {
        Text(text = statusText, style = MaterialTheme.typography.labelSmall, color = color)
    }
}

package com.shanye.coffee.ui.orderdetail

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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

/** 进度条节点（不含待支付） */
private val PROGRESS_STEPS = listOf(
    "paid" to "已支付",
    "making" to "制作中",
    "pickable" to "待取餐",
    "completed" to "已完成",
)

/**
 * 订单详情页（设计稿 AD5）：取餐码、订单进度、订单信息。
 */
@Composable
fun OrderDetailScreen(orderId: Long, onBack: () -> Unit, onGoLogin: () -> Unit = {}) {
    val container = LocalAppContainer.current
    val viewModel: OrderDetailViewModel = viewModel(
        key = "order-detail-$orderId",
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            override fun <T : ViewModel> create(
                modelClass: Class<T>,
                extras: androidx.lifecycle.viewmodel.CreationExtras,
            ): T = OrderDetailViewModel(container.orderRepository, orderId) as T
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()

    OrderDetailScreenContent(
        state = state,
        onBack = onBack,
        onRefresh = viewModel::load,
        onPay = { viewModel.pay() },
        onCancel = viewModel::cancel,
        onConfirm = viewModel::confirm,
        onGoLogin = onGoLogin,
    )
}

@Composable
internal fun OrderDetailScreenContent(
    state: OrderDetailUiState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onPay: () -> Unit,
    onCancel: () -> Unit,
    onConfirm: () -> Unit,
    onGoLogin: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CreamBackground),
    ) {
        // 顶栏
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(percent = 50))
                    .clickable(onClick = onBack),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "返回",
                    tint = TextPrimary,
                )
            }
            Text(
                text = "订单详情",
                style = MaterialTheme.typography.headlineSmall,
                color = TextPrimary,
            )
        }

        when {
            !state.loggedIn -> LoginPrompt(onGoLogin)
            state.loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandGreen)
            }
            state.order == null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = state.error ?: "订单不存在", color = TextSecondary)
                    Spacer(modifier = Modifier.height(12.dp))
                    ActionButton(text = "重试", onClick = onRefresh)
                }
            }
            else -> OrderDetailBody(state = state, onPay = onPay, onCancel = onCancel, onConfirm = onConfirm)
        }
    }
}

@Composable
internal fun OrderDetailBody(
    state: OrderDetailUiState,
    onPay: () -> Unit,
    onCancel: () -> Unit,
    onConfirm: () -> Unit,
) {
    val order = state.order ?: return
    val progressIndex = PROGRESS_STEPS.indexOfFirst { it.first == order.status }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
    ) {
        // 取餐码卡片
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(BrandGreen)
                .padding(vertical = 28.dp, horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "取餐码",
                style = MaterialTheme.typography.labelLarge,
                color = TextOnDark.copy(alpha = 0.8f),
            )
            Spacer(modifier = Modifier.height(8.dp))
            if (order.pickupCode != null) {
                Text(
                    text = order.pickupCode,
                    fontSize = 56.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextOnDark,
                    letterSpacing = 8.sp,
                )
            } else {
                Text(
                    text = order.statusText,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextOnDark,
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = pickupHint(order),
                style = MaterialTheme.typography.bodySmall,
                color = TextOnDark.copy(alpha = 0.75f),
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 订单进度
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp),
        ) {
            Text(text = "订单进度", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
            Spacer(modifier = Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                PROGRESS_STEPS.forEachIndexed { index, (_, label) ->
                    val done = progressIndex >= 0 && index < progressIndex
                    val current = index == progressIndex
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(14.dp)
                                .clip(RoundedCornerShape(percent = 50))
                                .background(
                                    when {
                                        current -> Terracotta
                                        done -> BrandGreen
                                        else -> MaterialTheme.colorScheme.outlineVariant
                                    },
                                ),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = label,
                            style = MaterialTheme.typography.labelMedium,
                            color = if (current) TextPrimary else TextSecondary,
                            fontWeight = if (current) FontWeight.SemiBold else FontWeight.Normal,
                        )
                    }
                }
            }
            if (order.status == "cancelled") {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "订单已取消",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.error,
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 订单信息
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp),
        ) {
            InfoRow(label = "订单号", value = order.orderNo)
            InfoRow(label = "门店", value = order.storeName)
            InfoRow(label = "下单时间", value = TimeFormat.dateTime(order.createdAt))
            InfoRow(label = "取餐方式", value = order.orderTypeText)
            if (order.promoDiscountFen > 0) {
                InfoRow(
                    label = "活动优惠",
                    value = "-${MoneyFormat.yuan(order.promoDiscountFen.toLong())}",
                    valueColor = Terracotta,
                )
            }
            if (order.discountFen > 0) {
                InfoRow(
                    label = "优惠券",
                    value = "-${MoneyFormat.yuan(order.discountFen.toLong())}${order.coupon?.let { "（${it.name}）" } ?: ""}",
                    valueColor = Terracotta,
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "实付",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = MoneyFormat.yuan(order.payFen.toLong()),
                    style = MaterialTheme.typography.titleLarge,
                    color = Terracotta,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 提示条
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.small)
                .background(TerracottaContainer)
                .padding(14.dp),
        ) {
            Text(
                text = when (order.status) {
                    "pending_pay" -> "订单待支付，支付后开始制作"
                    "paid" -> "已支付，门店即将开始制作"
                    "making" -> "做好后会通知你，凭取餐码到柜台领取"
                    "pickable" -> "餐品已做好，凭取餐码到柜台领取"
                    "completed" -> "订单已完成，感谢品尝"
                    else -> "订单已取消"
                },
                style = MaterialTheme.typography.bodyMedium,
                color = Terracotta,
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 操作区
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            when (order.status) {
                "pending_pay" -> {
                    ActionButton(text = "取消订单", outlined = true, modifier = Modifier.weight(1f), onClick = onCancel)
                    ActionButton(text = "模拟支付", modifier = Modifier.weight(1f), onClick = onPay)
                }
                "pickable" -> ActionButton(text = "确认取餐", modifier = Modifier.weight(1f), onClick = onConfirm)
                else -> Spacer(modifier = Modifier.height(0.dp))
            }
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

private fun pickupHint(order: OrderDto): String = when (order.status) {
    "pending_pay" -> "支付后生成取餐码"
    "paid" -> "已支付 · 备餐中"
    "making" -> "制作中 · 请稍候"
    "pickable" -> "待取餐 · 请到柜台领取"
    "completed" -> "已完成"
    else -> "已取消"
}

@Composable
internal fun InfoRow(label: String, value: String, valueColor: Color = TextPrimary) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 7.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
            modifier = Modifier.weight(1f),
        )
        Text(text = value, style = MaterialTheme.typography.bodyMedium, color = valueColor)
    }
}

@Composable
internal fun ActionButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    outlined: Boolean = false,
) {
    Box(
        modifier = modifier
            .height(46.dp)
            .clip(RoundedCornerShape(percent = 50))
            .background(
                if (outlined) Color.Transparent else BrandGreen,
            )
            .then(
                if (outlined) {
                    Modifier.border(1.5.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(percent = 50))
                } else {
                    Modifier
                },
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.titleSmall,
            color = if (outlined) TextPrimary else TextOnDark,
        )
    }
}

@Composable
internal fun LoginPrompt(onGoLogin: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "登录后查看订单",
            style = MaterialTheme.typography.titleLarge,
            color = TextPrimary,
        )
        Spacer(modifier = Modifier.height(20.dp))
        ActionButton(text = "去登录", onClick = onGoLogin)
    }
}

package com.shanye.coffee.ui.checkout

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
import androidx.compose.material.icons.filled.ChevronRight
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.ViewModel
import com.shanye.coffee.data.remote.dto.OrderItemDto
import com.shanye.coffee.data.remote.dto.QuoteCouponDto
import com.shanye.coffee.ui.LocalAppContainer
import com.shanye.coffee.ui.components.ProductCupArt
import com.shanye.coffee.ui.components.categoryArtColors
import com.shanye.coffee.ui.theme.BrandGreen
import com.shanye.coffee.ui.theme.CreamBackground
import com.shanye.coffee.ui.theme.Terracotta
import com.shanye.coffee.ui.theme.TerracottaDark
import com.shanye.coffee.ui.theme.TextOnDark
import com.shanye.coffee.ui.theme.TextPrimary
import com.shanye.coffee.ui.theme.TextSecondary
import com.shanye.coffee.util.MoneyFormat

/**
 * 确认订单页（设计稿 AD4）：自提/堂食、商品明细、优惠券、金额明细、模拟支付。
 */
@Composable
fun CheckoutScreen(onPaid: (Long) -> Unit, onBack: () -> Unit, onGoLogin: () -> Unit) {
    val container = LocalAppContainer.current
    val viewModel: CheckoutViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            override fun <T : ViewModel> create(
                modelClass: Class<T>,
                extras: androidx.lifecycle.viewmodel.CreationExtras,
            ): T = CheckoutViewModel(container.orderRepository) as T
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()

    CheckoutScreenContent(
        state = state,
        onSelectOrderType = viewModel::setOrderType,
        onSelectCoupon = viewModel::selectCoupon,
        onClearCoupon = viewModel::clearCoupon,
        onSubmit = { viewModel.submit(onPaid) },
        onBack = onBack,
        onGoLogin = onGoLogin,
    )
}

@Composable
private fun CheckoutScreenContent(
    state: CheckoutUiState,
    onSelectOrderType: (String) -> Unit,
    onSelectCoupon: (Long) -> Unit,
    onClearCoupon: () -> Unit,
    onSubmit: () -> Unit,
    onBack: () -> Unit,
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
                text = "确认订单",
                style = MaterialTheme.typography.headlineSmall,
                color = TextPrimary,
            )
        }

        when {
            !state.loggedIn -> LoginPrompt(onGoLogin = onGoLogin)
            state.loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandGreen)
            }
            state.quote == null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(text = state.error ?: "购物车是空的", color = TextSecondary)
            }
            else -> CheckoutBody(
                state = state,
                onSelectOrderType = onSelectOrderType,
                onSelectCoupon = onSelectCoupon,
                onClearCoupon = onClearCoupon,
                onSubmit = onSubmit,
            )
        }
    }
}

@Composable
private fun CheckoutBody(
    state: CheckoutUiState,
    onSelectOrderType: (String) -> Unit,
    onSelectCoupon: (Long) -> Unit,
    onClearCoupon: () -> Unit,
    onSubmit: () -> Unit,
) {
    val quote = state.quote ?: return

    Column(modifier = Modifier.fillMaxSize()) {
      Column(
        modifier = Modifier
            .weight(1f)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
      ) {
        // 门店与取餐方式
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = quote.storeName,
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = state.orderType.let { if (it == "takeout") "自提 · 到店取餐" else "堂食 · 店内享用" },
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                    )
                }
                OrderTypeToggle(orderType = state.orderType, onSelect = onSelectOrderType)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 商品明细
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp),
        ) {
            Text(text = "商品", style = MaterialTheme.typography.titleMedium, color = TextPrimary)
            Spacer(modifier = Modifier.height(8.dp))
            quote.items.forEach { item ->
                OrderItemRow(item = item)
                Spacer(modifier = Modifier.height(12.dp))
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 优惠券
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        if (quote.selectedCouponId != null) onClearCoupon()
                    }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TicketIcon()
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "优惠券",
                    style = MaterialTheme.typography.titleSmall,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = couponSummary(quote),
                    style = MaterialTheme.typography.labelLarge,
                    color = if (quote.selectedCouponId != null) TerracottaDark else TextSecondary,
                )
                Icon(
                    imageVector = Icons.Filled.ChevronRight,
                    contentDescription = null,
                    tint = TextSecondary,
                )
            }
            quote.coupons.filter { it.usable && it.discountFen > 0 }.forEach { coupon ->
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                CouponOptionRow(
                    coupon = coupon,
                    selected = quote.selectedCouponId == coupon.id,
                    isBest = quote.bestCouponId == coupon.id,
                    onSelect = { onSelectCoupon(coupon.id) },
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 金额明细
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .padding(16.dp),
        ) {
            AmountRow(label = "商品原价", value = MoneyFormat.yuan(quote.totalFen.toLong()))
            Spacer(modifier = Modifier.height(8.dp))
            AmountRow(
                label = "第二杯半价",
                value = "-${MoneyFormat.yuan(quote.promoDiscountFen.toLong())}",
                valueColor = Terracotta,
            )
            Spacer(modifier = Modifier.height(8.dp))
            AmountRow(
                label = "优惠券",
                value = "-${MoneyFormat.yuan(quote.discountFen.toLong())}",
                valueColor = Terracotta,
            )
            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            Spacer(modifier = Modifier.height(12.dp))
            Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "实付",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = MoneyFormat.yuan(quote.payFen.toLong()),
                    style = MaterialTheme.typography.headlineSmall,
                    color = TerracottaDark,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        Spacer(modifier = Modifier.height(100.dp))
      }
    }

    // 底部结算栏
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surface)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = MoneyFormat.yuan(quote.payFen.toLong()),
                style = MaterialTheme.typography.headlineSmall,
                color = TextPrimary,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = "已优惠 ${MoneyFormat.yuan((quote.promoDiscountFen + quote.discountFen).toLong())}",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
            )
        }
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(percent = 50))
                .background(if (state.submitting) BrandGreen.copy(alpha = 0.6f) else BrandGreen)
                .clickable(enabled = !state.submitting, onClick = onSubmit)
                .padding(horizontal = 32.dp, vertical = 13.dp),
        ) {
            if (state.submitting) {
                CircularProgressIndicator(color = TextOnDark, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
            } else {
                Text(
                    text = "模拟支付",
                    style = MaterialTheme.typography.titleSmall,
                    color = TextOnDark,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }

    if (state.error != null) {
        Text(
            text = state.error,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.error,
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun OrderTypeToggle(orderType: String, onSelect: (String) -> Unit) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(percent = 50))
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(4.dp),
    ) {
        listOf("takeout" to "自提", "dine_in" to "堂食").forEach { (value, label) ->
            val active = orderType == value
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(percent = 50))
                    .background(if (active) BrandGreen else Color.Transparent)
                    .clickable { onSelect(value) }
                    .padding(horizontal = 14.dp, vertical = 5.dp),
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (active) TextOnDark else TextSecondary,
                )
            }
        }
    }
}

@Composable
private fun OrderItemRow(item: OrderItemDto) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        val (bg, drink) = categoryArtColors("咖啡")
        Box(
            modifier = Modifier
                .size(52.dp)
                .clip(MaterialTheme.shapes.small)
                .background(bg),
            contentAlignment = Alignment.Center,
        ) {
            ProductCupArt(size = 32.dp, drinkColor = drink)
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = item.productName, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
            Text(
                text = "${item.specText} ×${item.quantity}",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
            )
        }
        Text(
            text = MoneyFormat.yuan(item.amount.toLong()),
            style = MaterialTheme.typography.titleSmall,
            color = TextPrimary,
        )
    }
}

@Composable
private fun CouponOptionRow(
    coupon: QuoteCouponDto,
    selected: Boolean,
    isBest: Boolean,
    onSelect: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(text = coupon.name, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
                if (isBest) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(percent = 50))
                            .background(Terracotta.copy(alpha = 0.14f))
                            .padding(horizontal = 8.dp, vertical = 1.dp),
                    ) {
                        Text(
                            text = "已选最优",
                            style = MaterialTheme.typography.labelSmall,
                            color = TerracottaDark,
                        )
                    }
                }
            }
            Text(
                text = "可减 ${MoneyFormat.yuan(coupon.discountFen.toLong())}",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
            )
        }
        Box(
            modifier = Modifier
                .size(20.dp)
                .clip(RoundedCornerShape(percent = 50))
                .background(if (selected) BrandGreen else Color.Transparent)
                .border(
                    width = if (selected) 0.dp else 2.dp,
                    color = if (selected) Color.Transparent else MaterialTheme.colorScheme.outline,
                    shape = RoundedCornerShape(percent = 50),
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (selected) {
                Text(text = "✓", color = TextOnDark, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
private fun AmountRow(label: String, value: String, valueColor: Color = TextPrimary) {
    Row(modifier = Modifier.fillMaxWidth()) {
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
private fun TicketIcon() {
    Box(
        modifier = Modifier
            .size(28.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(MaterialTheme.colorScheme.primaryContainer),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = "券",
            style = MaterialTheme.typography.labelMedium,
            color = BrandGreen,
        )
    }
}

@Composable
private fun LoginPrompt(onGoLogin: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "登录后即可下单",
            style = MaterialTheme.typography.titleLarge,
            color = TextPrimary,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "使用手机号登录，可享会员积分与优惠券",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
        )
        Spacer(modifier = Modifier.height(20.dp))
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(percent = 50))
                .background(BrandGreen)
                .clickable(onClick = onGoLogin)
                .padding(horizontal = 36.dp, vertical = 12.dp),
        ) {
            Text(
                text = "去登录",
                style = MaterialTheme.typography.titleSmall,
                color = TextOnDark,
            )
        }
    }
}

private fun couponSummary(quote: com.shanye.coffee.data.remote.dto.QuoteResultDto): String {
    if (quote.selectedCouponId == null) {
        return "未使用优惠券"
    }
    val coupon = quote.coupons.find { it.id == quote.selectedCouponId }
    if (coupon == null) {
        return "未使用优惠券"
    }
    val best = quote.bestCouponId == coupon.id
    return coupon.name + if (best) "（已选最优）" else ""
}

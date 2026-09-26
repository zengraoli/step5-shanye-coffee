package com.shanye.coffee.ui.order

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.shanye.coffee.data.CartLine
import com.shanye.coffee.data.remote.dto.ProductDto
import com.shanye.coffee.ui.components.ProductCupArt
import com.shanye.coffee.ui.components.categoryArtColors
import com.shanye.coffee.ui.theme.BrandGreen
import com.shanye.coffee.ui.theme.Terracotta
import com.shanye.coffee.ui.theme.TerracottaDark
import com.shanye.coffee.ui.theme.TextOnDark
import com.shanye.coffee.ui.theme.TextPrimary
import com.shanye.coffee.ui.theme.TextSecondary
import com.shanye.coffee.util.MoneyFormat

/** 规格底部弹窗 */
@Composable
fun SpecSheet(
    product: ProductDto,
    selection: Map<String, String>,
    promo: Boolean,
    onSelectOption: (String, String) -> Unit,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
) {
    val unitPrice = product.basePrice + product.specs.sumOf { group ->
        group.options.find { it.value == selection[group.key] }?.extra ?: 0
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.4f))
            .clickable(onClick = onDismiss),
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(MaterialTheme.colorScheme.surface)
                .clickable(enabled = false) {}
                .padding(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                val (bg, drink) = categoryArtColors(product.categoryName)
                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(MaterialTheme.shapes.small)
                        .background(bg),
                    contentAlignment = Alignment.Center,
                ) {
                    ProductCupArt(size = 44.dp, drinkColor = drink)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary,
                    )
                    if (promo) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "第二杯半价",
                            style = MaterialTheme.typography.labelMedium,
                            color = TerracottaDark,
                        )
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = MoneyFormat.yuan(unitPrice.toLong()),
                        style = MaterialTheme.typography.headlineSmall,
                        color = TerracottaDark,
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            product.specs.forEach { group ->
                Text(
                    text = group.label,
                    style = MaterialTheme.typography.titleSmall,
                    color = TextPrimary,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    group.options.forEach { option ->
                        val active = selection[group.key] == option.value
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(percent = 50))
                                .background(
                                    if (active) MaterialTheme.colorScheme.primaryContainer
                                    else MaterialTheme.colorScheme.surfaceVariant,
                                )
                                .clickable { onSelectOption(group.key, option.value) }
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = option.label,
                                style = MaterialTheme.typography.labelLarge,
                                color = if (active) BrandGreen else TextSecondary,
                            )
                            if (option.extra > 0) {
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "+${MoneyFormat.yuan(option.extra.toLong())}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (active) BrandGreen else TextSecondary,
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .clip(RoundedCornerShape(percent = 50))
                    .background(BrandGreen)
                    .clickable(onClick = onConfirm),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "加入购物车",
                    style = MaterialTheme.typography.titleSmall,
                    color = TextOnDark,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

/** 购物车展开面板 */
@Composable
fun CartPanel(
    lines: List<CartLine>,
    onQuantityChange: (Int, Int) -> Unit,
    onClear: () -> Unit,
    onDismiss: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.3f))
            .clickable(onClick = onDismiss),
    ) {
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 12.dp)
                .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                .background(MaterialTheme.colorScheme.surface)
                .clickable(enabled = false) {}
                .padding(16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "购物车",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = "清空",
                    style = MaterialTheme.typography.labelLarge,
                    color = TextSecondary,
                    modifier = Modifier.clickable(onClick = onClear),
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            lines.forEachIndexed { index, line ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = line.productName,
                            style = MaterialTheme.typography.titleSmall,
                            color = TextPrimary,
                        )
                        Text(
                            text = line.specText,
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary,
                        )
                    }
                    Text(
                        text = MoneyFormat.yuan(line.unitPrice.toLong()),
                        style = MaterialTheme.typography.titleSmall,
                        color = TextPrimary,
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Stepper(
                        quantity = line.quantity,
                        onChange = { onQuantityChange(index, it) },
                    )
                }
            }
        }
    }
}

@Composable
private fun Stepper(quantity: Int, onChange: (Int) -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(26.dp)
                .clip(RoundedCornerShape(percent = 50))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .clickable { onChange(quantity - 1) },
            contentAlignment = Alignment.Center,
        ) {
            Text(text = "−", color = TextPrimary, style = MaterialTheme.typography.labelLarge)
        }
        Text(
            text = "$quantity",
            style = MaterialTheme.typography.titleSmall,
            color = TextPrimary,
            modifier = Modifier.padding(horizontal = 10.dp),
        )
        Box(
            modifier = Modifier
                .size(26.dp)
                .clip(RoundedCornerShape(percent = 50))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .clickable { onChange(quantity + 1) },
            contentAlignment = Alignment.Center,
        ) {
            Text(text = "+", color = TextPrimary, style = MaterialTheme.typography.labelLarge)
        }
    }
}

/** 底部购物车条 */
@Composable
fun CartBar(
    count: Int,
    totalFen: Int,
    promoDiscountFen: Int,
    onClick: () -> Unit,
    onCheckout: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 12.dp)
            .padding(bottom = 76.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(percent = 50))
                .background(BrandGreen)
                .padding(start = 20.dp, top = 10.dp, bottom = 10.dp, end = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable(onClick = onClick),
            ) {
                Text(
                    text = MoneyFormat.yuan(totalFen.toLong()),
                    style = MaterialTheme.typography.titleLarge,
                    color = TextOnDark,
                    fontWeight = FontWeight.Bold,
                )
                if (promoDiscountFen > 0) {
                    Text(
                        text = "已享第二杯半价 -${MoneyFormat.yuan(promoDiscountFen.toLong())}",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnDark.copy(alpha = 0.75f),
                    )
                } else if (count > 0) {
                    Text(
                        text = "已选 ${count} 件",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnDark.copy(alpha = 0.75f),
                    )
                } else {
                    Text(
                        text = "购物车是空的",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextOnDark.copy(alpha = 0.6f),
                    )
                }
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(percent = 50))
                    .background(if (count > 0) Terracotta else Terracotta.copy(alpha = 0.4f))
                    .clickable(enabled = count > 0, onClick = onCheckout)
                    .padding(horizontal = 30.dp, vertical = 13.dp),
            ) {
                Text(
                    text = "去结算",
                    style = MaterialTheme.typography.titleSmall,
                    color = TextOnDark,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

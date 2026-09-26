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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.ViewModel
import com.shanye.coffee.data.CartLine
import com.shanye.coffee.data.remote.dto.ProductDto
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
 * 点单页（设计稿 AD3）：分类 Tab、商品列表、规格底部弹窗、售罄状态、购物车条。
 */
@Composable
fun OrderScreen(onGoCheckout: () -> Unit) {
    val container = LocalAppContainer.current
    val viewModel: OrderViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            override fun <T : ViewModel> create(
                modelClass: Class<T>,
                extras: androidx.lifecycle.viewmodel.CreationExtras,
            ): T = OrderViewModel(container.catalogRepository) as T
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()

    OrderScreenContent(
        state = state,
        onSelectCategory = viewModel::selectCategory,
        onSelectOrderType = viewModel::setOrderType,
        onProductClick = viewModel::openSpec,
        onSpecOptionSelect = viewModel::selectSpecOption,
        onSpecDismiss = viewModel::closeSpec,
        onSpecConfirm = viewModel::confirmSpec,
        onCartQuantityChange = viewModel::setCartQuantity,
        onToggleCart = viewModel::toggleCartExpanded,
        onClearCart = viewModel::clearCart,
        onGoCheckout = onGoCheckout,
    )
}

@Composable
internal fun OrderScreenContent(
    state: OrderUiState,
    onSelectCategory: (Long) -> Unit,
    onSelectOrderType: (String) -> Unit,
    onProductClick: (ProductDto) -> Unit,
    onSpecOptionSelect: (String, String) -> Unit,
    onSpecDismiss: () -> Unit,
    onSpecConfirm: () -> Unit,
    onCartQuantityChange: (Int, Int) -> Unit,
    onToggleCart: () -> Unit,
    onClearCart: () -> Unit,
    onGoCheckout: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CreamBackground),
    ) {
        // 顶部：标题 + 自提/堂食
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "点单",
                style = MaterialTheme.typography.headlineLarge,
                color = TextPrimary,
                modifier = Modifier.weight(1f),
            )
            OrderTypeToggle(orderType = state.orderType, onSelect = onSelectOrderType)
        }

        // 分类 Tab
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            state.categories.forEach { category ->
                val active = category.id == state.activeCategoryId
                Column(
                    modifier = Modifier
                        .clickable { onSelectCategory(category.id) }
                        .padding(vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = category.name,
                        style = MaterialTheme.typography.titleSmall,
                        color = if (active) TextPrimary else TextSecondary,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Box(
                        modifier = Modifier
                            .width(20.dp)
                            .height(3.dp)
                            .clip(RoundedCornerShape(percent = 50))
                            .background(if (active) Terracotta else Color.Transparent),
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        if (state.loading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = BrandGreen)
            }
        } else if (state.error != null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(text = state.error, color = TextSecondary)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 140.dp),
            ) {
                items(state.visibleProducts, key = { it.id }) { product ->
                    ProductRow(
                        product = product,
                        promo = state.promoProductIds.contains(product.id),
                        onClick = { onProductClick(product) },
                    )
                }
            }
        }
    }

    // 规格弹窗
    state.specProduct?.let { product ->
        SpecSheet(
            product = product,
            selection = state.specSelection,
            promo = state.promoProductIds.contains(product.id),
            onSelectOption = onSpecOptionSelect,
            onDismiss = onSpecDismiss,
            onConfirm = onSpecConfirm,
        )
    }

    // 购物车展开面板
    if (state.cartExpanded && state.cartLines.isNotEmpty()) {
        CartPanel(
            lines = state.cartLines,
            onQuantityChange = onCartQuantityChange,
            onClear = onClearCart,
            onDismiss = onToggleCart,
        )
    }

    // 底部购物车条
    CartBar(
        count = state.cartCount,
        totalFen = state.cartPayableFen,
        promoDiscountFen = state.promoDiscountFen,
        onClick = onToggleCart,
        onCheckout = onGoCheckout,
    )
}

@Composable
internal fun OrderTypeToggle(orderType: String, onSelect: (String) -> Unit) {
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
                    .padding(horizontal = 16.dp, vertical = 6.dp),
            ) {
                Text(
                    text = label,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (active) TextOnDark else TextSecondary,
                )
            }
        }
    }
}

@Composable
internal fun ProductRow(product: ProductDto, promo: Boolean, onClick: () -> Unit) {
    val (bg, drink) = categoryArtColors(product.categoryName)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .background(MaterialTheme.colorScheme.surface)
            .clickable(enabled = !product.soldOut, onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(84.dp)
                .clip(MaterialTheme.shapes.small)
                .background(bg),
            contentAlignment = Alignment.Center,
        ) {
            ProductCupArt(size = 52.dp, drinkColor = drink)
        }
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleSmall,
                    color = TextPrimary,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                if (promo) {
                    Spacer(modifier = Modifier.width(6.dp))
                    TagPill(text = "第二杯半价", background = Terracotta.copy(alpha = 0.14f), color = TerracottaDark)
                }
                if (product.subtitle.contains("新品")) {
                    Spacer(modifier = Modifier.width(6.dp))
                    TagPill(text = "新品", background = MaterialTheme.colorScheme.primaryContainer, color = BrandGreen)
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = product.description,
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = MoneyFormat.yuan(product.basePrice.toLong()),
                style = MaterialTheme.typography.titleMedium,
                color = TerracottaDark,
                fontWeight = FontWeight.Bold,
            )
        }
        Spacer(modifier = Modifier.width(8.dp))
        if (product.soldOut) {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(percent = 50))
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(horizontal = 14.dp, vertical = 7.dp),
            ) {
                Text(
                    text = "已售罄",
                    style = MaterialTheme.typography.labelMedium,
                    color = TextSecondary,
                )
            }
        } else {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(percent = 50))
                    .background(BrandGreen)
                    .clickable(onClick = onClick)
                    .padding(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Text(
                    text = "选规格",
                    style = MaterialTheme.typography.labelLarge,
                    color = TextOnDark,
                )
            }
        }
    }
}

@Composable
internal fun TagPill(text: String, background: Color, color: Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(percent = 50))
            .background(background)
            .padding(horizontal = 8.dp, vertical = 2.dp),
    ) {
        Text(text = text, style = MaterialTheme.typography.labelSmall, color = color)
    }
}

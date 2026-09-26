package com.shanye.coffee.ui.home

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shanye.coffee.data.remote.dto.ProductDto
import com.shanye.coffee.data.remote.dto.StoreDto
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
import com.shanye.coffee.util.TimeFormat

/**
 * 首页（设计稿 AD2）：门店选择与营业状态、活动横幅、自提/堂食入口、当季推荐。
 */
@Composable
fun HomeScreen(
    onGoOrder: (orderType: String) -> Unit,
    onProductClick: (ProductDto) -> Unit,
) {
    val container = LocalAppContainer.current
    val viewModel: HomeViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            override fun <T : androidx.lifecycle.ViewModel> create(
                modelClass: Class<T>,
                extras: androidx.lifecycle.viewmodel.CreationExtras,
            ): T = HomeViewModel(container.catalogRepository) as T
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()

    HomeScreenContent(
        state = state,
        onStoreClick = viewModel::openStorePicker,
        onStorePickerDismiss = viewModel::closeStorePicker,
        onStoreSelect = viewModel::selectStore,
        onGoOrder = onGoOrder,
        onProductClick = onProductClick,
    )
}

@Composable
private fun HomeScreenContent(
    state: HomeUiState,
    onStoreClick: () -> Unit,
    onStorePickerDismiss: () -> Unit,
    onStoreSelect: (StoreDto) -> Unit,
    onGoOrder: (String) -> Unit,
    onProductClick: (ProductDto) -> Unit,
) {
    if (state.loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = BrandGreen)
        }
        return
    }
    if (state.error != null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(text = state.error, color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
        }
        return
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CreamBackground)
            .padding(horizontal = 16.dp),
    ) {
        Spacer(modifier = Modifier.height(12.dp))

        // 门店选择
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onStoreClick),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Filled.LocationOn,
                contentDescription = "门店",
                tint = BrandGreen,
                modifier = Modifier.size(22.dp),
            )
            Spacer(modifier = Modifier.width(6.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = state.currentStore?.name ?: "选择门店",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = state.currentStore?.let { "${it.statusText} · ${it.openTime}-${it.closeTime}" } ?: "点击选择门店",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                )
            }
            Icon(
                imageVector = Icons.Filled.KeyboardArrowDown,
                contentDescription = "切换门店",
                tint = TextSecondary,
            )
            Spacer(modifier = Modifier.width(8.dp))
            Icon(
                imageVector = Icons.Filled.Search,
                contentDescription = "搜索",
                tint = TextPrimary,
                modifier = Modifier.size(22.dp),
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 活动横幅
        state.promo?.let { promo ->
            PromoBanner(
                name = promo.name,
                range = "${TimeFormat.monthDay(promo.startAt)} - ${TimeFormat.monthDay(promo.endAt)}",
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        // 自提 / 堂食
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
            OrderTypeCard(
                title = "自提",
                desc = "到店取餐，免排队",
                modifier = Modifier.weight(1f),
                onClick = { onGoOrder("takeout") },
            )
            OrderTypeCard(
                title = "堂食",
                desc = "店内享用",
                modifier = Modifier.weight(1f),
                onClick = { onGoOrder("dine_in") },
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 当季推荐
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "当季推荐",
                style = MaterialTheme.typography.headlineMedium,
                color = TextPrimary,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = "全部菜单",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
                modifier = Modifier.clickable { onGoOrder("takeout") },
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(state.featured, key = { it.id }) { product ->
                FeaturedProductCard(product = product, onClick = { onProductClick(product) })
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }

    if (state.storePickerOpen) {
        StorePickerSheet(
            stores = state.stores,
            currentStoreId = state.currentStore?.id,
            onDismiss = onStorePickerDismiss,
            onSelect = onStoreSelect,
        )
    }
}

@Composable
private fun PromoBanner(name: String, range: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .background(Terracotta)
            .padding(20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "秋日限定",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextOnDark.copy(alpha = 0.85f),
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = name,
                    style = MaterialTheme.typography.headlineSmall,
                    color = TextOnDark,
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = range,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextOnDark.copy(alpha = 0.75f),
                )
            }
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color.White.copy(alpha = 0.18f)),
                contentAlignment = Alignment.Center,
            ) {
                ProductCupArt(
                    size = 48.dp,
                    cupColor = TextOnDark,
                    outlineColor = TextOnDark,
                    drinkColor = Color(0xFFF3DCCB),
                    bandColor = Color(0xFFF3DCCB),
                )
            }
        }
    }
}

@Composable
private fun OrderTypeCard(title: String, desc: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(
        modifier = modifier
            .clip(MaterialTheme.shapes.medium)
            .background(Color.White)
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Text(text = title, style = MaterialTheme.typography.titleLarge, color = TextPrimary)
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = desc, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
    }
}

@Composable
private fun FeaturedProductCard(product: ProductDto, onClick: () -> Unit) {
    val (bg, drink) = categoryArtColors(product.categoryName)
    Column(
        modifier = Modifier
            .width(150.dp)
            .clip(MaterialTheme.shapes.medium)
            .background(Color.White)
            .clickable(onClick = onClick),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(110.dp)
                .background(bg),
            contentAlignment = Alignment.Center,
        ) {
            ProductCupArt(size = 64.dp, drinkColor = drink)
        }
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = product.name,
                style = MaterialTheme.typography.titleSmall,
                color = TextPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = MoneyFormat.yuan(product.basePrice.toLong()),
                    style = MaterialTheme.typography.titleMedium,
                    color = TerracottaDark,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(RoundedCornerShape(percent = 50))
                        .background(BrandGreen)
                        .clickable(onClick = onClick),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(text = "+", color = TextOnDark, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    }
}

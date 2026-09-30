package com.shanye.coffee.ui.profile

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.ViewModel
import com.shanye.coffee.ui.LocalAppContainer
import com.shanye.coffee.ui.theme.BrandGreen
import com.shanye.coffee.ui.theme.CreamBackground
import com.shanye.coffee.ui.theme.Tan
import com.shanye.coffee.ui.theme.Terracotta
import com.shanye.coffee.ui.theme.TextOnDark
import com.shanye.coffee.ui.theme.TextPrimary
import com.shanye.coffee.ui.theme.TextSecondary

/**
 * 我的（设计稿 AD6）：会员卡、积分与等级进度、统计、菜单入口。
 */
@Composable
fun ProfileScreen(
    onGoOrders: () -> Unit,
    onGoCoupons: () -> Unit,
    onGoLogin: () -> Unit = {},
    onLogout: () -> Unit = {},
    onOpenBenefits: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
) {
    val container = LocalAppContainer.current
    val viewModel: ProfileViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            override fun <T : ViewModel> create(
                modelClass: Class<T>,
                extras: androidx.lifecycle.viewmodel.CreationExtras,
            ): T = ProfileViewModel(container.memberRepository, container.orderRepository) as T
        },
    )
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showBenefits by rememberSaveable { mutableStateOf(false) }
    var showSettings by rememberSaveable { mutableStateOf(false) }

    // 会员权益
    if (showBenefits) {
        val profile = state.profile
        AlertDialog(
            onDismissRequest = { showBenefits = false },
            title = { Text(text = "会员权益") },
            text = {
                Column {
                    Text(text = "当前等级：${profile?.levelText ?: "-"}")
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(text = "· 消费 1 元积 1 分，积分可抵换购与升级")
                    Text(text = "· 银卡 0 分 / 金卡 500 分 / 黑卡 2000 分")
                    Text(text = "· 会员专享券在“领券中心”领取，可与第二杯半价同享")
                    if (profile?.nextLevelText != null) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "再积 ${profile.pointsToNextLevel} 分升级为${profile.nextLevelText}",
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showBenefits = false }) { Text(text = "知道了") }
            },
        )
    }

    // 设置
    if (showSettings) {
        val apiBase = remember {
            runCatching {
                com.shanye.coffee.BuildConfig.API_BASE_URL
            }.getOrDefault("http://127.0.0.1:3000")
        }
        AlertDialog(
            onDismissRequest = { showSettings = false },
            title = { Text(text = "设置") },
            text = {
                Column {
                    Text(text = "接口地址：$apiBase")
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "如需切换后端，请重新构建并指定 API_BASE_URL。",
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = { showSettings = false }) { Text(text = "关闭") }
            },
        )
    }

    ProfileScreenContent(
        state = state,
        onGoOrders = onGoOrders,
        onGoCoupons = onGoCoupons,
        onRefresh = viewModel::refresh,
        onGoLogin = onGoLogin,
        onOpenBenefits = { showBenefits = true },
        onOpenSettings = { showSettings = true },
        onLogout = { viewModel.logout(); onLogout() },
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ProfileScreenContent(
    state: ProfileUiState,
    onGoOrders: () -> Unit,
    onGoCoupons: () -> Unit,
    onRefresh: () -> Unit,
    onGoLogin: () -> Unit,
    onOpenBenefits: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    onLogout: () -> Unit = {},
) {
    if (state.loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = BrandGreen)
        }
        return
    }
    if (!state.loggedIn) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "登录后查看会员中心",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary,
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
        return
    }
    // 已登录但资料还没到：区分“加载失败（可重试）”与“加载中”
    if (state.profile == null) {
        Box(
            modifier = Modifier.fillMaxSize().padding(32.dp),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = state.error ?: "正在加载会员信息…",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                )
                if (state.error != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(percent = 50))
                            .background(BrandGreen)
                            .clickable(onClick = onRefresh)
                            .padding(horizontal = 28.dp, vertical = 10.dp),
                    ) {
                        Text(text = "重试", style = MaterialTheme.typography.titleSmall, color = TextOnDark)
                    }
                }
            }
        }
        return
    }

    val profile = state.profile
    val progress = if (profile.nextLevel == null) {
        1f
    } else {
        val total = profile.points + profile.pointsToNextLevel
        if (total <= 0) 0f else profile.points.toFloat() / total.toFloat()
    }

    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize(),
    ) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CreamBackground)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
    ) {
        Spacer(modifier = Modifier.height(12.dp))

        // 会员卡
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.large)
                .background(
                    Brush.linearGradient(
                        listOf(BrandGreen, Color(0xFF22301F)),
                    ),
                )
                .padding(20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(percent = 50))
                        .background(Tan),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = profile.nickname.take(1),
                        style = MaterialTheme.typography.headlineSmall,
                        color = BrandGreen,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = profile.maskedPhone,
                        style = MaterialTheme.typography.titleLarge,
                        color = TextOnDark,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(percent = 50))
                            .background(Tan.copy(alpha = 0.9f))
                            .padding(horizontal = 10.dp, vertical = 2.dp),
                    ) {
                        Text(
                            text = "${profile.levelText}会员",
                            style = MaterialTheme.typography.labelSmall,
                            color = BrandGreen,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "积分 ${profile.points}",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextOnDark,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = if (profile.nextLevel != null) "再积 ${profile.pointsToNextLevel} 分升级${profile.nextLevelText}" else "最高等级",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextOnDark.copy(alpha = 0.7f),
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(percent = 50))
                    .background(TextOnDark.copy(alpha = 0.18f)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .height(8.dp)
                        .clip(RoundedCornerShape(percent = 50))
                        .background(Brush.horizontalGradient(listOf(Tan, Terracotta))),
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 统计
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface)
                .padding(vertical = 18.dp),
        ) {
            StatCell(value = "${state.couponCount}", label = "优惠券", modifier = Modifier.weight(1f))
            StatCell(value = "${state.orderCount}", label = "订单", modifier = Modifier.weight(1f))
            StatCell(value = "${state.totalEarned}", label = "积分", modifier = Modifier.weight(1f))
        }

        Spacer(modifier = Modifier.height(12.dp))

        // 菜单
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(MaterialTheme.shapes.medium)
                .background(MaterialTheme.colorScheme.surface),
        ) {
            MenuRow(icon = "order", title = "我的订单", onClick = onGoOrders)
            MenuRow(icon = "coupon", title = "我的优惠券", onClick = onGoCoupons)
            MenuRow(icon = "star", title = "会员权益", onClick = onOpenBenefits)
            MenuRow(icon = "setting", title = "设置", onClick = onOpenSettings)
            MenuRow(icon = "logout", title = "退出登录", onClick = onLogout)
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (state.error != null) {
            Text(
                text = state.error,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.clickable(onClick = onRefresh),
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
    }
}

@Composable
private fun StatCell(value: String, label: String, modifier: Modifier = Modifier) {
    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = label, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
    }
}

@Composable
private fun MenuRow(icon: String, title: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 15.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            when (icon) {
                "order" -> Text(text = "单", style = MaterialTheme.typography.labelMedium, color = BrandGreen)
                "coupon" -> Text(text = "券", style = MaterialTheme.typography.labelMedium, color = BrandGreen)
                "logout" -> Icon(
                    imageVector = Icons.AutoMirrored.Filled.Logout,
                    contentDescription = null,
                    tint = BrandGreen,
                    modifier = Modifier.size(18.dp),
                )
                "star" -> Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = BrandGreen,
                    modifier = Modifier.size(18.dp),
                )
                else -> Icon(
                    imageVector = Icons.Filled.Settings,
                    contentDescription = null,
                    tint = BrandGreen,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            color = TextPrimary,
            modifier = Modifier.weight(1f),
        )
        Icon(
            imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
            contentDescription = null,
            tint = TextSecondary,
        )
    }
}

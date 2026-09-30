package com.shanye.coffee.ui.coupons

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
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import androidx.lifecycle.viewModelScope
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.shanye.coffee.data.CatalogRepository
import com.shanye.coffee.data.MemberRepository
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.dto.CouponTemplateDto
import com.shanye.coffee.data.remote.dto.MemberCouponDto
import com.shanye.coffee.ui.LocalAppContainer
import com.shanye.coffee.ui.theme.BrandGreen
import com.shanye.coffee.ui.theme.CreamBackground
import com.shanye.coffee.ui.theme.Terracotta
import com.shanye.coffee.ui.theme.TerracottaContainer
import com.shanye.coffee.ui.theme.TextPrimary
import com.shanye.coffee.ui.theme.TextSecondary
import com.shanye.coffee.util.MoneyFormat
import com.shanye.coffee.util.TimeFormat

/** 会员券页面状态 */
data class CouponsUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val refreshing: Boolean = false,
    val loggedIn: Boolean = true,
    val mine: List<MemberCouponDto> = emptyList(),
    val claimable: List<CouponTemplateDto> = emptyList(),
    val claimingId: Long? = null,
    val tip: String? = null,
)

/** 我的优惠券 + 领券中心 */
class CouponsViewModel(
    private val memberRepository: MemberRepository,
    private val catalogRepository: CatalogRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CouponsUiState())
    val state: StateFlow<CouponsUiState> = _state.asStateFlow()

    init {
        // 登录态驱动：未登录显示登录引导；登录 / 退出都实时刷新
        viewModelScope.launch {
            var loaded = false
            MemberSession.profile.collect { profile ->
                if (profile != null) {
                    _state.update { it.copy(loggedIn = true) }
                    load()
                    loaded = true
                } else if (MemberSession.restored.value) {
                    _state.update {
                        it.copy(
                            loggedIn = false,
                            loading = false,
                            refreshing = false,
                            mine = emptyList(),
                            claimable = emptyList(),
                        )
                    }
                }
            }
            if (!loaded && MemberSession.restored.value) {
                _state.update { it.copy(loggedIn = false, loading = false) }
            }
        }
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            refreshData()
            _state.update { it.copy(loading = false) }
        }
    }

    fun refresh() {
        _state.update { it.copy(refreshing = true, error = null) }
        viewModelScope.launch {
            refreshData()
            _state.update { it.copy(refreshing = false) }
        }
    }

    /** 拉取我的券（服务端已按模板停用返回“已失效 / usable”）与可领取模板 */
    private suspend fun refreshData() {
        val mineResult = memberRepository.coupons()
        val templateResult = catalogRepository.couponTemplates()
        val mine = (mineResult as? ApiResult.Ok)?.data ?: emptyList()
        val claimable = (templateResult as? ApiResult.Ok)?.data ?: emptyList()
        _state.update {
            it.copy(
                mine = mine,
                claimable = claimable.filter { template -> template.status == "active" && template.remaining > 0 },
                error = (mineResult as? ApiResult.Err)?.error?.message
                    ?: (templateResult as? ApiResult.Err)?.error?.message,
            )
        }
    }

    /** 领券 */
    fun claim(templateId: Long) {
        if (_state.value.claimingId != null || !MemberSession.isLoggedIn) {
            return
        }
        _state.update { it.copy(claimingId = templateId, tip = null) }
        viewModelScope.launch {
            when (val result = memberRepository.claimCoupon(templateId)) {
                is ApiResult.Ok -> {
                    _state.update {
                        it.copy(
                            claimingId = null,
                            tip = "领取成功，已放入“我的优惠券”",
                        )
                    }
                    refreshData()
                }
                is ApiResult.Err -> _state.update {
                    it.copy(claimingId = null, tip = result.error.message)
                }
            }
        }
    }
}

/** 会员券的规则文案（按领取时快照的优惠条件） */
internal val MemberCouponDto.ruleText: String
    get() = when (type) {
        "full_reduction" -> "满 ${MoneyFormat.yuan(thresholdFen.toLong())} 减 ${MoneyFormat.yuan(reduceFen.toLong())}"
        else -> {
            val max = if (maxReduceFen > 0) "，最高减 ${MoneyFormat.yuan(maxReduceFen.toLong())}" else ""
            "${discountPercent / 10.0}折（满 ${MoneyFormat.yuan(thresholdFen.toLong())} 可用$max）"
        }
    }

/** 券模板的规则文案 */
internal val CouponTemplateDto.ruleText: String
    get() = when (type) {
        "full_reduction" -> "满 ${MoneyFormat.yuan(thresholdFen.toLong())} 减 ${MoneyFormat.yuan(reduceFen.toLong())}"
        else -> {
            val max = if (maxReduceFen > 0) "，最高减 ${MoneyFormat.yuan(maxReduceFen.toLong())}" else ""
            "${discountPercent / 10.0}折（满 ${MoneyFormat.yuan(thresholdFen.toLong())} 可用$max）"
        }
    }

/** 我的优惠券与领券中心（会员登录后可用） */
@Composable
fun CouponsScreen(onGoLogin: () -> Unit) {
    val container = LocalAppContainer.current
    val viewModel: CouponsViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            override fun <T : ViewModel> create(
                modelClass: Class<T>,
                extras: androidx.lifecycle.viewmodel.CreationExtras,
            ): T = CouponsViewModel(container.memberRepository, container.catalogRepository) as T
        },
    )
    CouponsScreenContent(
        state = viewModel.state.collectAsStateWithLifecycle().value,
        onRefresh = viewModel::refresh,
        onClaim = viewModel::claim,
        onGoLogin = onGoLogin,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun CouponsScreenContent(
    state: CouponsUiState,
    onRefresh: () -> Unit,
    onClaim: (Long) -> Unit,
    onGoLogin: () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().background(CreamBackground)) {
        Text(
            text = "我的优惠券",
            style = MaterialTheme.typography.headlineSmall,
            color = TextPrimary,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 8.dp),
        )
        Box(modifier = Modifier.fillMaxSize()) {
            when {
                !state.loggedIn -> LoginPrompt(onGoLogin)
                state.loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = BrandGreen)
                }
                else -> PullToRefreshBox(
                    isRefreshing = state.refreshing,
                    onRefresh = onRefresh,
                    modifier = Modifier.fillMaxSize(),
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(state.mine, key = { it.id }) { coupon ->
                            MyCouponCard(coupon)
                        }
                        if (state.mine.isEmpty()) {
                            item {
                                Text(
                                    text = "还没有优惠券，去下面领一张吧",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextSecondary,
                                )
                            }
                        }
                        item {
                            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                            Text(
                                text = "领券中心",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary,
                            )
                        }
                        items(state.claimable, key = { it.id }) { template ->
                            ClaimableCouponCard(
                                template = template,
                                claimed = state.mine.any { it.couponId == template.id },
                                claiming = state.claimingId == template.id,
                                onClaim = { onClaim(template.id) },
                            )
                        }
                        if (state.claimable.isEmpty()) {
                            item {
                                Text(
                                    text = "暂时没有可领取的优惠券",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextSecondary,
                                )
                            }
                        }
                    }
                }
            }
            state.tip?.let { tip ->
                Text(
                    text = tip,
                    style = MaterialTheme.typography.bodySmall,
                    color = TextPrimary,
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(TerracottaContainer)
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun LoginPrompt(onGoLogin: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            text = "登录后查看与领取优惠券",
            style = MaterialTheme.typography.titleMedium,
            color = TextPrimary,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Button(
            onClick = onGoLogin,
            shape = RoundedCornerShape(percent = 50),
            colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                containerColor = BrandGreen,
                contentColor = Color.White,
            ),
        ) {
            Text(text = "去登录")
        }
    }
}

@Composable
private fun MyCouponCard(coupon: MemberCouponDto) {
    val usable = coupon.usable && coupon.status == "unused"
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .background(if (usable) TerracottaContainer else MaterialTheme.colorScheme.surface)
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = coupon.name,
                style = MaterialTheme.typography.titleSmall,
                color = TextPrimary,
                modifier = Modifier.weight(1f),
            )
            Text(
                text = coupon.statusText,
                style = MaterialTheme.typography.labelMedium,
                color = if (usable) Terracotta else TextSecondary,
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = coupon.ruleText, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
    }
}

@Composable
private fun ClaimableCouponCard(
    template: CouponTemplateDto,
    claimed: Boolean,
    claiming: Boolean,
    onClaim: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(MaterialTheme.shapes.medium)
            .background(MaterialTheme.colorScheme.surface)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = template.name, style = MaterialTheme.typography.titleSmall, color = TextPrimary)
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${template.ruleText} · 剩余 ${template.remaining} 张",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
            )
        }
        Spacer(modifier = Modifier.size(8.dp))
        when {
            claimed -> Text(text = "已领取", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
            template.remaining <= 0 -> Text(text = "已领完", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
            claiming -> CircularProgressIndicator(modifier = Modifier.size(20.dp), color = BrandGreen)
            else -> Button(
                onClick = onClaim,
                shape = RoundedCornerShape(percent = 50),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = Terracotta,
                    contentColor = Color.White,
                ),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
            ) {
                Text(text = "领取")
            }
        }
    }
}

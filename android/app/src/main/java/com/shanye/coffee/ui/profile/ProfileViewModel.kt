package com.shanye.coffee.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shanye.coffee.data.MemberRepository
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.OrderRepository
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.dto.MemberCouponDto
import com.shanye.coffee.data.remote.dto.MemberProfileDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProfileUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val profile: MemberProfileDto? = null,
    val couponCount: Int = 0,
    val orderCount: Int = 0,
    val totalEarned: Int = 0,
    val loggedIn: Boolean = true,
)

class ProfileViewModel(
    private val memberRepository: MemberRepository,
    private val orderRepository: OrderRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    init {
        if (MemberSession.isLoggedIn) {
            load()
        } else {
            _state.update { it.copy(loading = false, loggedIn = false) }
        }
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val profileResult = memberRepository.me()
            val pointsResult = memberRepository.pointsSummary()
            val couponsResult = memberRepository.coupons()
            val ordersResult = orderRepository.list(pageSize = 100)
            if (profileResult is ApiResult.Ok) {
                val profile = profileResult.data
                MemberSession.update(profile)
                _state.update {
                    it.copy(
                        loading = false,
                        error = null,
                        profile = profile,
                        totalEarned = (pointsResult as? ApiResult.Ok)?.data?.totalEarned ?: profile.points,
                        couponCount = (couponsResult as? ApiResult.Ok)
                            ?.data?.count { coupon -> coupon.status == "unused" } ?: 0,
                        orderCount = (ordersResult as? ApiResult.Ok)?.data?.total ?: 0,
                    )
                }
            } else {
                _state.update {
                    it.copy(
                        loading = false,
                        error = (profileResult as? ApiResult.Err)?.error?.message ?: "加载失败，请稍后重试",
                    )
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            memberRepository.logout()
        }
    }
}

/** 供截图测试使用的演示数据 */
internal fun demoProfileState(): ProfileUiState = ProfileUiState(
    loading = false,
    profile = MemberProfileDto(
        id = 1,
        phone = "13812341234",
        maskedPhone = "138****1234",
        nickname = "咖啡友1234",
        points = 1286,
        level = "gold",
        levelText = "金卡",
        nextLevel = "black",
        nextLevelText = "黑卡",
        pointsToNextLevel = 714,
        createdAt = "2026-09-20T02:00:00.000Z",
    ),
    couponCount = 3,
    orderCount = 12,
    totalEarned = 1286,
)

/** 供截图测试使用的演示优惠券列表 */
internal fun demoCoupons(): List<MemberCouponDto> = listOf(
    MemberCouponDto(
        id = 5,
        couponId = 1,
        name = "新客满 50 减 10",
        type = "full_reduction",
        typeText = "满减券",
        thresholdFen = 5000,
        reduceFen = 1000,
        discountPercent = 100,
        maxReduceFen = 0,
        validFrom = "2026-09-26T02:00:00.000Z",
        validTo = "2026-10-26T02:00:00.000Z",
        status = "unused",
        statusText = "未使用",
        obtainedAt = "2026-09-26T02:00:00.000Z",
    ),
    MemberCouponDto(
        id = 4,
        couponId = 2,
        name = "全场 8.5 折",
        type = "discount",
        typeText = "折扣券",
        thresholdFen = 3000,
        reduceFen = 0,
        discountPercent = 85,
        maxReduceFen = 2000,
        validFrom = "2026-09-20T02:00:00.000Z",
        validTo = "2026-10-05T02:00:00.000Z",
        status = "used",
        statusText = "已使用",
        obtainedAt = "2026-09-20T02:00:00.000Z",
        usedAt = "2026-09-25T16:00:00.000Z",
    ),
)

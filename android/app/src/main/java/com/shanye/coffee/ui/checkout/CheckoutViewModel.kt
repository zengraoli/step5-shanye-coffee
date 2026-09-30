package com.shanye.coffee.ui.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shanye.coffee.data.CartStore
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.OrderRepository
import com.shanye.coffee.data.OrderSession
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.dto.CreateOrderRequestDto
import com.shanye.coffee.data.remote.dto.QuoteItemInputDto
import com.shanye.coffee.data.remote.dto.QuoteRequestDto
import com.shanye.coffee.data.remote.dto.QuoteResultDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CheckoutUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val quote: QuoteResultDto? = null,
    val orderType: String = OrderSession.ORDER_TYPE_TAKEOUT,
    val submitting: Boolean = false,
    val loggedIn: Boolean = true,
    /** 用户是否手动干预过优惠券（选了某张或选择不用券） */
    val couponTouched: Boolean = false,
    /** 是否明确选择“不使用优惠券” */
    val couponDisabled: Boolean = false,
) {
    val isEmpty: Boolean get() = quote == null && !loading
}

class CheckoutViewModel(private val orderRepository: OrderRepository) : ViewModel() {

    private val _state = MutableStateFlow(CheckoutUiState())
    val state: StateFlow<CheckoutUiState> = _state.asStateFlow()

    init {
        // 取餐方式：以 OrderSession 为准（首页选了堂食，点单 / 结算同步）
        viewModelScope.launch {
            OrderSession.orderType.collect { type ->
                if (_state.value.orderType != type) {
                    _state.update { it.copy(orderType = type) }
                    if (_state.value.quote != null) {
                        quote(currentCouponSelection())
                    }
                }
            }
        }
        // 登录态：登录成功后从登录页返回本页会自动重新报价；
        // 本地会话尚未恢复完成前保持 loading，避免闪一下“未登录”
        viewModelScope.launch {
            var requested = false
            MemberSession.profile.collect { profile ->
                if (profile != null) {
                    _state.update { it.copy(loggedIn = true, loading = true) }
                    quote(currentCouponSelection())
                    requested = true
                } else if (MemberSession.restored.value) {
                    _state.update { it.copy(loggedIn = false, loading = false, quote = null, error = null) }
                }
            }
            // 会话已恢复却仍未登录：才算真正的未登录（只提示一次）
            if (!requested && MemberSession.restored.value) {
                _state.update { it.copy(loggedIn = false, loading = false, quote = null) }
            }
        }
    }

    /** 当前用户在优惠券上的选择（没动过则让服务端推荐最优券） */
    private fun currentCouponSelection(): Long? = when {
        _state.value.couponDisabled -> null
        _state.value.couponTouched -> _state.value.quote?.selectedCouponId
        else -> null
    }

    /** 是否传“不使用优惠券” */
    private fun withoutCoupon(): Boolean = _state.value.couponDisabled

    /**
     * 重新报价。memberCouponId 为 null 且未选择“不使用优惠券”时由服务端推荐最优券。
     */
    fun quote(memberCouponId: Long?) {
        val store = OrderSession.store.value
        val lines = CartStore.lines.value
        if (store == null || lines.isEmpty()) {
            _state.update { it.copy(loading = false, error = "购物车是空的" ) }
            return
        }
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val request = QuoteRequestDto(
                storeId = store.id,
                orderType = OrderSession.orderType.value,
                items = lines.map { line ->
                    QuoteItemInputDto(
                        productId = line.productId,
                        spec = line.spec,
                        quantity = line.quantity,
                    )
                },
                memberCouponId = memberCouponId,
                withoutCoupon = if (withoutCoupon()) true else null,
            )
            when (val result = orderRepository.quote(request)) {
                is ApiResult.Ok -> _state.update {
                    val quote = result.data
                    // 用户选择“不使用优惠券”时，本地必须保持未选状态（服务端不会回推最优券）
                    val effective = if (_state.value.couponDisabled) {
                        quote.copy(
                            selectedCouponId = null,
                            discountFen = 0,
                            payFen = quote.totalFen - quote.promoDiscountFen,
                        )
                    } else {
                        quote
                    }
                    it.copy(loading = false, error = null, quote = effective)
                }
                is ApiResult.Err -> _state.update {
                    it.copy(loading = false, error = result.error.message)
                }
            }
        }
    }

    /** 不使用优惠券：请求时带 withoutCoupon，服务端不会回推最优券 */
    fun clearCoupon() {
        _state.update { it.copy(couponTouched = true, couponDisabled = true) }
        quote(memberCouponId = null)
    }

    /** 选择指定优惠券 */
    fun selectCoupon(id: Long) {
        _state.update { it.copy(couponTouched = true, couponDisabled = false) }
        quote(memberCouponId = id)
    }

    fun setOrderType(type: String) {
        if (OrderSession.orderType.value == type) {
            return
        }
        OrderSession.setOrderType(type)
        _state.update { it.copy(orderType = type) }
        if (_state.value.quote != null) {
            quote(currentCouponSelection())
        }
    }

    /** 模拟支付：创建订单并支付，成功返回订单 id */
    fun submit(onPaid: (Long) -> Unit) {
        val state = _state.value
        val quote = state.quote
        val store = OrderSession.store.value
        if (quote == null || store == null || state.submitting) {
            return
        }
        _state.update { it.copy(submitting = true, error = null) }
        viewModelScope.launch {
            val request = CreateOrderRequestDto(
                storeId = store.id,
                orderType = OrderSession.orderType.value,
                items = CartStore.lines.value.map { line ->
                    QuoteItemInputDto(
                        productId = line.productId,
                        spec = line.spec,
                        quantity = line.quantity,
                    )
                },
                memberCouponId = quote.selectedCouponId,
                remark = null,
            )
            when (val created = orderRepository.create(request)) {
                is ApiResult.Ok -> {
                    when (val paid = orderRepository.pay(created.data.id)) {
                        is ApiResult.Ok -> {
                            CartStore.clear()
                            _state.update { it.copy(submitting = false) }
                            onPaid(paid.data.id)
                        }
                        is ApiResult.Err -> _state.update {
                            it.copy(submitting = false, error = "下单成功但支付失败：${paid.error.message}，请到订单列表重试")
                        }
                    }
                }
                is ApiResult.Err -> _state.update {
                    it.copy(submitting = false, error = created.error.message)
                }
            }
        }
    }
}

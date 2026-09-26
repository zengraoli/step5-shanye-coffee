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
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CheckoutUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val quote: QuoteResultDto? = null,
    val orderType: String = OrderSession.ORDER_TYPE_TAKEOUT,
    val submitting: Boolean = false,
    val loggedIn: Boolean = true,
) {
    val isEmpty: Boolean get() = quote == null && !loading
}

class CheckoutViewModel(private val orderRepository: OrderRepository) : ViewModel() {

    private val _state = MutableStateFlow(CheckoutUiState())
    val state: StateFlow<CheckoutUiState> = _state.asStateFlow()

    init {
        if (MemberSession.isLoggedIn) {
            quote(memberCouponId = null)
        } else {
            _state.update { it.copy(loading = false, loggedIn = false) }
        }
    }

    /** 重新报价；memberCouponId 为 null 时由服务端推荐最优券 */
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
            )
            when (val result = orderRepository.quote(request)) {
                is ApiResult.Ok -> _state.update {
                    it.copy(loading = false, error = null, quote = result.data)
                }
                is ApiResult.Err -> _state.update {
                    it.copy(loading = false, error = result.error.message)
                }
            }
        }
    }

    /** 不使用优惠券 */
    fun clearCoupon() {
        quote(memberCouponId = null)
        _state.update { it.copy(quote = it.quote?.copy(selectedCouponId = null, discountFen = 0, payFen = it.quote.totalFen - it.quote.promoDiscountFen)) }
    }

    /** 选择指定优惠券 */
    fun selectCoupon(id: Long) {
        quote(memberCouponId = id)
    }

    fun setOrderType(type: String) {
        if (OrderSession.orderType.value == type) {
            return
        }
        OrderSession.setOrderType(type)
        _state.update { it.copy(orderType = type) }
        quote(_state.value.quote?.selectedCouponId)
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

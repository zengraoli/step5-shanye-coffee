package com.shanye.coffee.ui.orderdetail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.OrderRepository
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.dto.OrderDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class OrderDetailUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val order: OrderDto? = null,
    val acting: Boolean = false,
    val loggedIn: Boolean = true,
)

class OrderDetailViewModel(
    private val orderRepository: OrderRepository,
    private val orderId: Long,
) : ViewModel() {

    private val _state = MutableStateFlow(OrderDetailUiState())
    val state: StateFlow<OrderDetailUiState> = _state.asStateFlow()

    init {
        if (MemberSession.isLoggedIn) {
            load()
        } else {
            _state.update { it.copy(loading = false, loggedIn = false) }
        }
    }

    /** 加载（下拉刷新 / 页面恢复时调用，可看到后台推进后的最新状态） */
    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            when (val result = orderRepository.detail(orderId)) {
                is ApiResult.Ok -> _state.update {
                    it.copy(loading = false, error = null, order = result.data)
                }
                is ApiResult.Err -> _state.update {
                    it.copy(loading = false, error = result.error.message)
                }
            }
        }
    }

    fun pay(onPaid: () -> Unit = {}) {
        act { it.pay(orderId) }
        onPaid()
    }

    fun cancel() {
        act { it.cancel(orderId) }
    }

    fun confirm() {
        act { it.confirm(orderId) }
    }

    private fun act(block: suspend (com.shanye.coffee.data.OrderRepository) -> ApiResult<OrderDto>) {
        if (_state.value.acting) {
            return
        }
        _state.update { it.copy(acting = true) }
        viewModelScope.launch {
            when (val result = block(orderRepository)) {
                is ApiResult.Ok -> _state.update {
                    it.copy(acting = false, order = result.data)
                }
                is ApiResult.Err -> _state.update {
                    it.copy(acting = false, error = result.error.message)
                }
            }
        }
    }
}

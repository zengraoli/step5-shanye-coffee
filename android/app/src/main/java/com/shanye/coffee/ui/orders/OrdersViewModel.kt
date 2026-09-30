package com.shanye.coffee.ui.orders

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

data class OrdersUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val error: String? = null,
    val orders: List<OrderDto> = emptyList(),
    val status: String = "",
    val loggedIn: Boolean = true,
)

class OrdersViewModel(private val orderRepository: OrderRepository) : ViewModel() {

    private val _state = MutableStateFlow(OrdersUiState())
    val state: StateFlow<OrdersUiState> = _state.asStateFlow()

    init {
        // 登录态驱动：冷启动等本地会话恢复后再加载；登录 / 退出都实时刷新
        viewModelScope.launch {
            var loaded = false
            MemberSession.profile.collect { profile ->
                if (profile != null) {
                    _state.update { it.copy(loggedIn = true) }
                    load()
                    loaded = true
                } else if (MemberSession.restored.value) {
                    _state.update { it.copy(loggedIn = false, loading = false, refreshing = false, orders = emptyList()) }
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
            when (val result = orderRepository.list(status = _state.value.status.ifEmpty { null }, pageSize = 50)) {
                is ApiResult.Ok -> _state.update {
                    it.copy(loading = false, refreshing = false, error = null, orders = result.data.list)
                }
                is ApiResult.Err -> _state.update {
                    it.copy(loading = false, refreshing = false, error = result.error.message)
                }
            }
        }
    }

    /** 下拉刷新 */
    fun refresh() {
        _state.update { it.copy(refreshing = true) }
        load()
    }

    fun selectStatus(status: String) {
        _state.update { it.copy(status = status) }
        load()
    }
}

private fun String.ifEmpty(transform: () -> String?): String? = if (isEmpty()) transform() else this

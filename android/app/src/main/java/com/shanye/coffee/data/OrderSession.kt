package com.shanye.coffee.data

import com.shanye.coffee.data.remote.dto.StoreDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** 下单会话：当前门店与取餐方式（首页 / 点单 / 结算共用） */
object OrderSession {

    private val _store = MutableStateFlow<StoreDto?>(null)
    val store: StateFlow<StoreDto?> = _store.asStateFlow()

    private val _orderType = MutableStateFlow(ORDER_TYPE_TAKEOUT)
    val orderType: StateFlow<String> = _orderType.asStateFlow()

    fun selectStore(store: StoreDto) {
        _store.value = store
    }

    fun setOrderType(type: String) {
        if (type == ORDER_TYPE_TAKEOUT || type == ORDER_TYPE_DINE_IN) {
            _orderType.value = type
        }
    }

    const val ORDER_TYPE_TAKEOUT = "takeout"
    const val ORDER_TYPE_DINE_IN = "dine_in"
}

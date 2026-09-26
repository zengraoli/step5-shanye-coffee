package com.shanye.coffee.data

import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.dto.CreateOrderRequestDto
import com.shanye.coffee.data.remote.dto.OrderDto
import com.shanye.coffee.data.remote.dto.OrderListDto
import com.shanye.coffee.data.remote.dto.QuoteRequestDto
import com.shanye.coffee.data.remote.dto.QuoteResultDto
import com.shanye.coffee.data.remote.toApiResult

/** 订单：报价、下单、支付、取消、确认取餐 */
open class OrderRepository(
    private val api: ApiService,
    sessionStore: SessionStore?,
) : BaseRepository(sessionStore) {

    open suspend fun quote(body: QuoteRequestDto): ApiResult<QuoteResultDto> =
        call { api.quote(body).toApiResult() }

    open suspend fun create(body: CreateOrderRequestDto): ApiResult<OrderDto> =
        call { api.createOrder(body).toApiResult() }

    open suspend fun list(status: String? = null, page: Int = 1, pageSize: Int = 20): ApiResult<OrderListDto> =
        call { api.orders(status, page, pageSize).toApiResult() }

    open suspend fun detail(id: Long): ApiResult<OrderDto> = call { api.order(id).toApiResult() }

    open suspend fun pay(id: Long): ApiResult<OrderDto> = call { api.payOrder(id).toApiResult() }

    open suspend fun cancel(id: Long): ApiResult<OrderDto> = call { api.cancelOrder(id).toApiResult() }

    open suspend fun confirm(id: Long): ApiResult<OrderDto> = call { api.confirmOrder(id).toApiResult() }
}

package com.shanye.coffee.data.remote

import com.shanye.coffee.data.remote.dto.ApiEnvelope
import com.shanye.coffee.data.remote.dto.CategoryDto
import com.shanye.coffee.data.remote.dto.CreateOrderRequestDto
import com.shanye.coffee.data.remote.dto.MemberCouponDto
import com.shanye.coffee.data.remote.dto.MemberLoginRequestDto
import com.shanye.coffee.data.remote.dto.MemberLoginDataDto
import com.shanye.coffee.data.remote.dto.MemberProfileDto
import com.shanye.coffee.data.remote.dto.OrderDto
import com.shanye.coffee.data.remote.dto.OrderListDto
import com.shanye.coffee.data.remote.dto.ProductListDto
import com.shanye.coffee.data.remote.dto.PromoStateDto
import com.shanye.coffee.data.remote.dto.PointsSummaryDto
import com.shanye.coffee.data.remote.dto.QuoteRequestDto
import com.shanye.coffee.data.remote.dto.QuoteResultDto
import com.shanye.coffee.data.remote.dto.SmsCodeDataDto
import com.shanye.coffee.data.remote.dto.SmsCodeRequestDto
import com.shanye.coffee.data.remote.dto.StoreDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** 与 server 对齐的接口集合 */
interface ApiService {

    // ---------- 会员 ----------

    @POST("api/v1/auth/sms-code")
    suspend fun sendSmsCode(@Body body: SmsCodeRequestDto): Response<ApiEnvelope<SmsCodeDataDto>>

    @POST("api/v1/auth/login")
    suspend fun memberLogin(@Body body: MemberLoginRequestDto): Response<ApiEnvelope<MemberLoginDataDto>>

    @GET("api/v1/members/me")
    suspend fun memberMe(): Response<ApiEnvelope<MemberProfileDto>>

    @GET("api/v1/members/me/points")
    suspend fun pointsSummary(): Response<ApiEnvelope<PointsSummaryDto>>

    @GET("api/v1/members/me/coupons")
    suspend fun memberCoupons(@Query("status") status: String? = null): Response<ApiEnvelope<List<MemberCouponDto>>>

    @POST("api/v1/coupons/{id}/claim")
    suspend fun claimCoupon(@Path("id") id: Long): Response<ApiEnvelope<MemberCouponDto>>

    // ---------- 门店 / 商品 ----------

    @GET("api/v1/stores")
    suspend fun stores(): Response<ApiEnvelope<List<StoreDto>>>

    @GET("api/v1/categories")
    suspend fun categories(): Response<ApiEnvelope<List<CategoryDto>>>

    @GET("api/v1/products")
    suspend fun products(
        @Query("category_id") categoryId: Long? = null,
        @Query("keyword") keyword: String? = null,
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 60,
    ): Response<ApiEnvelope<ProductListDto>>

    // ---------- 活动 ----------

    @GET("api/v1/promo")
    suspend fun promo(): Response<ApiEnvelope<PromoStateDto>>

    // ---------- 订单 ----------

    @POST("api/v1/orders/quote")
    suspend fun quote(@Body body: QuoteRequestDto): Response<ApiEnvelope<QuoteResultDto>>

    @POST("api/v1/orders")
    suspend fun createOrder(@Body body: CreateOrderRequestDto): Response<ApiEnvelope<OrderDto>>

    @GET("api/v1/orders")
    suspend fun orders(
        @Query("status") status: String? = null,
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20,
    ): Response<ApiEnvelope<OrderListDto>>

    @GET("api/v1/orders/{id}")
    suspend fun order(@Path("id") id: Long): Response<ApiEnvelope<OrderDto>>

    @POST("api/v1/orders/{id}/pay")
    suspend fun payOrder(@Path("id") id: Long): Response<ApiEnvelope<OrderDto>>

    @POST("api/v1/orders/{id}/cancel")
    suspend fun cancelOrder(@Path("id") id: Long): Response<ApiEnvelope<OrderDto>>

    @POST("api/v1/orders/{id}/confirm")
    suspend fun confirmOrder(@Path("id") id: Long): Response<ApiEnvelope<OrderDto>>
}

package com.shanye.coffee.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** 统一响应包裹：{ code, data, message } */
@Serializable
data class ApiEnvelope<T>(
    val code: Int,
    val data: T? = null,
    val message: String = "ok",
)

// ---------- 会员与登录 ----------

@Serializable
data class MemberProfileDto(
    val id: Long,
    val phone: String,
    val maskedPhone: String,
    val nickname: String,
    val points: Int,
    val level: String,
    val levelText: String,
    val nextLevel: String? = null,
    val nextLevelText: String? = null,
    val pointsToNextLevel: Int = 0,
    val createdAt: String,
)

@Serializable
data class MemberLoginDataDto(
    val token: String,
    val member: MemberProfileDto,
)

@Serializable
data class MemberLoginRequestDto(
    val phone: String,
    val code: String,
)

@Serializable
data class SmsCodeRequestDto(
    val phone: String,
)

@Serializable
data class SmsCodeDataDto(
    val phone: String,
    val code: String,
    val message: String,
)

// ---------- 门店 / 分类 / 商品 ----------

@Serializable
data class StoreDto(
    val id: Long,
    val name: String,
    val address: String,
    val phone: String,
    val openTime: String,
    val closeTime: String,
    val status: String,
    val statusText: String,
)

@Serializable
data class CategoryDto(
    val id: Long,
    val name: String,
    val sort: Int,
    val productCount: Int = 0,
)

@Serializable
data class SpecOptionDto(
    val value: String,
    val label: String,
    val extra: Int = 0,
)

@Serializable
data class SpecGroupDto(
    val key: String,
    val label: String,
    val options: List<SpecOptionDto> = emptyList(),
)

@Serializable
data class ProductDto(
    val id: Long,
    val categoryId: Long,
    val categoryName: String,
    val name: String,
    val subtitle: String = "",
    val description: String = "",
    val image: String = "",
    val basePrice: Int,
    @SerialName("onSale") val onSale: Boolean,
    val soldOut: Boolean,
    val sort: Int = 0,
    val specs: List<SpecGroupDto> = emptyList(),
)

@Serializable
data class ProductListDto(
    val list: List<ProductDto> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pageSize: Int = 20,
)

// ---------- 活动（第二杯半价） ----------

@Serializable
data class PromoActivityDto(
    val id: Long,
    val name: String,
    val type: String,
    val status: String,
    val startAt: String,
    val endAt: String,
    val productIds: List<Long> = emptyList(),
)

@Serializable
data class PromoStateDto(
    val active: Boolean,
    val activity: PromoActivityDto? = null,
)

// ---------- 优惠券 ----------

@Serializable
data class MemberCouponDto(
    val id: Long,
    val couponId: Long,
    val name: String,
    val type: String,
    val typeText: String,
    val thresholdFen: Int,
    val reduceFen: Int,
    val discountPercent: Int,
    val maxReduceFen: Int,
    val validFrom: String,
    val validTo: String,
    val status: String,
    val statusText: String,
    val obtainedAt: String,
    val usedAt: String? = null,
)

@Serializable
data class PointsLogDto(
    val id: Long,
    val change: Int,
    val reason: String,
    val orderId: Long? = null,
    val createdAt: String,
)

@Serializable
data class PointsSummaryDto(
    val profile: MemberProfileDto,
    val totalEarned: Int,
    val logs: List<PointsLogDto> = emptyList(),
)

// ---------- 订单 ----------

@Serializable
data class QuoteItemInputDto(
    val productId: Long,
    val spec: Map<String, String>,
    val quantity: Int,
)

@Serializable
data class QuoteRequestDto(
    val storeId: Long,
    val orderType: String,
    val items: List<QuoteItemInputDto>,
    val memberCouponId: Long? = null,
    val withoutCoupon: Boolean? = null,
)

@Serializable
data class OrderItemDto(
    val productId: Long,
    val productName: String,
    val specText: String,
    val unitPrice: Int,
    val quantity: Int,
    val amount: Int,
)

@Serializable
data class QuoteCouponDto(
    val id: Long,
    val name: String,
    val type: String,
    val typeText: String,
    val thresholdFen: Int,
    val reduceFen: Int,
    val discountPercent: Int,
    val maxReduceFen: Int,
    val validTo: String,
    val usable: Boolean,
    val discountFen: Int,
)

@Serializable
data class QuotePromoDto(
    val id: Long,
    val name: String,
    val type: String,
    val discountFen: Int,
    val productIds: List<Long> = emptyList(),
)

@Serializable
data class QuoteResultDto(
    val storeId: Long,
    val storeName: String,
    val orderType: String,
    val items: List<OrderItemDto> = emptyList(),
    val totalFen: Int,
    val promoDiscountFen: Int = 0,
    val discountFen: Int = 0,
    val payFen: Int,
    val promo: QuotePromoDto? = null,
    val coupons: List<QuoteCouponDto> = emptyList(),
    val bestCouponId: Long? = null,
    val selectedCouponId: Long? = null,
)

@Serializable
data class CreateOrderRequestDto(
    val storeId: Long,
    val orderType: String,
    val items: List<QuoteItemInputDto>,
    val memberCouponId: Long? = null,
    val remark: String? = null,
)

@Serializable
data class OrderCouponDto(
    val id: Long,
    val name: String,
    val discountFen: Int,
)

@Serializable
data class OrderTimelineDto(
    val status: String,
    val statusText: String,
    val time: String? = null,
)

@Serializable
data class OrderDto(
    val id: Long,
    val orderNo: String,
    val storeId: Long,
    val storeName: String,
    val orderType: String,
    val orderTypeText: String,
    val status: String,
    val statusText: String,
    val items: List<OrderItemDto> = emptyList(),
    val totalFen: Int,
    val discountFen: Int,
    val promoDiscountFen: Int = 0,
    val payFen: Int,
    val coupon: OrderCouponDto? = null,
    val pickupCode: String? = null,
    val remark: String = "",
    val createdAt: String,
    val paidAt: String? = null,
    val timeline: List<OrderTimelineDto> = emptyList(),
)

@Serializable
data class OrderListDto(
    val list: List<OrderDto> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val pageSize: Int = 20,
)

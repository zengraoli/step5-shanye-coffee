package com.shanye.coffee.screenshots

import com.shanye.coffee.data.CartLine
import com.shanye.coffee.data.remote.dto.CategoryDto
import com.shanye.coffee.data.remote.dto.MemberProfileDto
import com.shanye.coffee.data.remote.dto.OrderDto
import com.shanye.coffee.data.remote.dto.OrderItemDto
import com.shanye.coffee.data.remote.dto.ProductDto
import com.shanye.coffee.data.remote.dto.PromoActivityDto
import com.shanye.coffee.data.remote.dto.QuoteCouponDto
import com.shanye.coffee.data.remote.dto.QuoteResultDto
import com.shanye.coffee.data.remote.dto.SpecGroupDto
import com.shanye.coffee.data.remote.dto.SpecOptionDto
import com.shanye.coffee.data.remote.dto.StoreDto
import com.shanye.coffee.ui.checkout.CheckoutUiState
import com.shanye.coffee.ui.home.HomeUiState
import com.shanye.coffee.ui.login.LoginUiState
import com.shanye.coffee.ui.order.OrderUiState
import com.shanye.coffee.ui.orderdetail.OrderDetailUiState
import com.shanye.coffee.ui.orders.OrdersUiState

/** 截图测试用演示数据（不依赖 server） */

val demoStores = listOf(
    StoreDto(1, "山野咖啡 · 西溪印象城店", "杭州市西湖区文一西路 1000 号", "0571-88001234", "07:30", "21:00", "open", "营业中"),
    StoreDto(2, "山野咖啡 · 三里屯店", "北京市朝阳区工人体育场北路 8 号院", "010-64168899", "09:00", "22:30", "open", "营业中"),
    StoreDto(3, "山野咖啡 · 五道口店", "北京市海淀区成府路 28 号购物中心 1 层", "010-62341200", "08:30", "21:30", "rest", "休息中"),
)

private val specGroups = listOf(
    SpecGroupDto(
        key = "cup",
        label = "杯型",
        options = listOf(
            SpecOptionDto("medium", "中杯", 0),
            SpecOptionDto("large", "大杯", 300),
        ),
    ),
    SpecGroupDto(
        key = "temp",
        label = "温度",
        options = listOf(SpecOptionDto("ice", "冰", 0), SpecOptionDto("hot", "热", 0)),
    ),
    SpecGroupDto(
        key = "sugar",
        label = "糖度",
        options = listOf(
            SpecOptionDto("none", "无糖", 0),
            SpecOptionDto("less", "少糖", 0),
            SpecOptionDto("standard", "标准糖", 0),
        ),
    ),
)

val demoCategories = listOf(
    CategoryDto(1, "咖啡", 1, 6),
    CategoryDto(2, "茶饮", 2, 6),
    CategoryDto(3, "轻食", 3, 6),
    CategoryDto(4, "周边", 4, 6),
)

val demoProducts = listOf(
    ProductDto(1, 1, "咖啡", "桂花拿铁", "第二杯半价", "桂花乌龙浓缩与鲜奶，秋日限定", "", 2800, true, false, 1, specGroups),
    ProductDto(2, 1, "咖啡", "焦糖栗子拿铁", "新品", "秋栗泥 · 焦糖 · 鲜牛奶", "", 3000, true, false, 2, specGroups),
    ProductDto(3, 1, "咖啡", "山野生椰", "", "海南生椰乳 · 云南小粒", "", 2600, true, false, 3, specGroups),
    ProductDto(4, 1, "咖啡", "冷萃 · 高山日晒", "售罄", "云南保山 · 12 小时冷萃", "", 2400, true, true, 4, specGroups),
    ProductDto(7, 2, "茶饮", "白桃乌龙气泡", "新品", "白桃果肉 · 乌龙茶汤", "", 2600, true, false, 1, specGroups),
    ProductDto(13, 3, "轻食", "火腿芝士可颂", "", "现烤 · 3 层 32 折", "", 2200, true, false, 1, specGroups),
)

val demoPromo = PromoActivityDto(
    id = 1,
    name = "桂花拿铁 第二杯半价",
    type = "second_half",
    status = "active",
    startAt = "2026-09-19T00:00:00.000Z",
    endAt = "2026-09-30T23:59:59.000Z",
    productIds = listOf(1, 2),
)

val demoCartLines = listOf(
    CartLine(1, "桂花拿铁", "咖啡", mapOf("cup" to "large", "temp" to "ice", "sugar" to "less"), "大杯 / 冰 / 少糖", 3100, 2),
    CartLine(13, "火腿芝士可颂", "轻食", mapOf("cup" to "medium", "temp" to "hot", "sugar" to "none"), "现烤 ×1", 2200, 1),
)

val demoProfile = MemberProfileDto(
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
)

fun demoLoginState() = LoginUiState(phone = "13812341234", code = "", agreed = true)

fun demoHomeState() = HomeUiState(
    loading = false,
    stores = demoStores,
    currentStore = demoStores[0],
    promo = demoPromo,
    featured = demoProducts.take(4),
)

fun demoOrderState() = OrderUiState(
    loading = false,
    categories = demoCategories,
    products = demoProducts,
    activeCategoryId = 1,
    orderType = "takeout",
    promoProductIds = setOf(1L, 2L),
    cartLines = demoCartLines,
    cartCount = 3,
    cartTotalFen = 8400,
    cartPayableFen = 6950,
    promoDiscountFen = 1450,
)

fun demoCheckoutState() = CheckoutUiState(
    loading = false,
    quote = QuoteResultDto(
        storeId = 1,
        storeName = "山野咖啡 · 西溪印象城店",
        orderType = "takeout",
        items = listOf(
            OrderItemDto(1, "桂花拿铁", "大杯 · 冰 · 少糖", 3100, 2, 6200),
            OrderItemDto(13, "火腿芝士可颂", "现烤", 2200, 1, 2200),
        ),
        totalFen = 8400,
        promoDiscountFen = 1450,
        discountFen = 1000,
        payFen = 5950,
        promo = null,
        coupons = listOf(
            QuoteCouponDto(5, "新客满 50 减 10", "full_reduction", "满减券", 5000, 1000, 100, 0, "2026-10-26T02:00:00.000Z", true, 1000),
        ),
        bestCouponId = 5,
        selectedCouponId = 5,
    ),
    orderType = "takeout",
)

fun demoOrderDetailState() = OrderDetailUiState(
    loading = false,
    order = OrderDto(
        id = 99,
        orderNo = "SY20260926000099",
        storeId = 1,
        storeName = "山野咖啡 · 西溪印象城店",
        orderType = "takeout",
        orderTypeText = "自提",
        status = "making",
        statusText = "制作中",
        items = listOf(
            OrderItemDto(1, "桂花拿铁", "大杯 · 冰 · 少糖", 3100, 2, 6200),
        ),
        totalFen = 6200,
        discountFen = 1000,
        promoDiscountFen = 1450,
        payFen = 3750,
        coupon = com.shanye.coffee.data.remote.dto.OrderCouponDto(5, "新客满 50 减 10", 1000),
        pickupCode = "8604",
        remark = "少冰",
        createdAt = "2026-09-26T06:32:00.000Z",
        paidAt = "2026-09-26T06:33:00.000Z",
    ),
)

fun demoOrdersState() = com.shanye.coffee.ui.orders.OrdersUiState(
    loading = false,
    orders = listOf(
        OrderDto(
            id = 99,
            orderNo = "SY20260926000099",
            storeId = 1,
            storeName = "山野咖啡 · 西溪印象城店",
            orderType = "takeout",
            orderTypeText = "自提",
            status = "making",
            statusText = "制作中",
            items = listOf(OrderItemDto(1, "桂花拿铁", "大杯 · 冰 · 少糖", 3100, 2, 6200)),
            totalFen = 6200,
            discountFen = 1000,
            promoDiscountFen = 1450,
            payFen = 3750,
            pickupCode = "8604",
            createdAt = "2026-09-26T06:32:00.000Z",
        ),
        OrderDto(
            id = 98,
            orderNo = "SY20260925000098",
            storeId = 2,
            storeName = "山野咖啡 · 三里屯店",
            orderType = "dine_in",
            orderTypeText = "堂食",
            status = "completed",
            statusText = "已完成",
            items = listOf(OrderItemDto(3, "山野生椰", "中杯 · 冰 · 少糖", 2600, 1, 2600)),
            totalFen = 2600,
            discountFen = 0,
            promoDiscountFen = 0,
            payFen = 2600,
            pickupCode = "1234",
            createdAt = "2026-09-25T08:05:00.000Z",
        ),
    ),
    status = "",
)

fun demoProfileState() = com.shanye.coffee.ui.profile.ProfileUiState(
    loading = false,
    profile = demoProfile,
    couponCount = 3,
    orderCount = 12,
    totalEarned = 1286,
)

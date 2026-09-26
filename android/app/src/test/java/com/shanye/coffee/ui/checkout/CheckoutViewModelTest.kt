package com.shanye.coffee.ui.checkout

import androidx.test.core.app.ApplicationProvider
import com.shanye.coffee.data.CartLine
import com.shanye.coffee.data.CartStore
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.OrderRepository
import com.shanye.coffee.data.OrderSession
import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiException
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.dto.CreateOrderRequestDto
import com.shanye.coffee.data.remote.dto.MemberProfileDto
import com.shanye.coffee.data.remote.dto.OrderDto
import com.shanye.coffee.data.remote.dto.OrderItemDto
import com.shanye.coffee.data.remote.dto.QuoteCouponDto
import com.shanye.coffee.data.remote.dto.QuoteRequestDto
import com.shanye.coffee.data.remote.dto.QuoteResultDto
import com.shanye.coffee.data.remote.dto.StoreDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.lang.reflect.Proxy

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CheckoutViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    private val apiStub: ApiService = Proxy.newProxyInstance(
        ApiService::class.java.classLoader,
        arrayOf(ApiService::class.java),
    ) { _, _, _ -> throw UnsupportedOperationException("测试中不应调用真实接口") } as ApiService


    private companion object {
        private val store = StoreDto(
            id = 1,
            name = "山野咖啡 · 望京店",
            address = "地址",
            phone = "010",
            openTime = "08:00",
            closeTime = "22:00",
            status = "open",
            statusText = "营业中",
        )

        private val quoteData = QuoteResultDto(
        storeId = 1,
        storeName = store.name,
        orderType = "takeout",
        items = listOf(
            OrderItemDto(
                productId = 1,
                productName = "山野拿铁",
                specText = "大杯 / 冰 / 少糖",
                unitPrice = 3500,
                quantity = 2,
                amount = 7000,
            ),
        ),
        totalFen = 7000,
        promoDiscountFen = 1750,
        discountFen = 1000,
        payFen = 4250,
        promo = null,
        coupons = listOf(
            QuoteCouponDto(
                id = 5,
                name = "新客满 50 减 10",
                type = "full_reduction",
                typeText = "满减券",
                thresholdFen = 5000,
                reduceFen = 1000,
                discountPercent = 100,
                maxReduceFen = 0,
                validTo = "2026-10-26T02:00:00.000Z",
                usable = true,
                discountFen = 1000,
            ),
        ),
        bestCouponId = 5,
        selectedCouponId = 5,
    )

        private val orderDto = OrderDto(
        id = 99,
        orderNo = "SY20260926000099",
        storeId = 1,
        storeName = store.name,
        orderType = "takeout",
        orderTypeText = "自提",
        status = "paid",
        statusText = "已支付",
        items = emptyList(),
        totalFen = 7000,
        discountFen = 1000,
        promoDiscountFen = 1750,
        payFen = 4250,
        pickupCode = "1234",
        createdAt = "2026-09-26T02:00:00.000Z",
    )

    private class FakeOrderRepository(
        api: ApiService,
        sessionStore: SessionStore,
    ) : OrderRepository(api, sessionStore) {
        var lastQuoteRequest: QuoteRequestDto? = null
        var lastCreateRequest: CreateOrderRequestDto? = null
        var payCalls = 0
        var quoteResult: ApiResult<QuoteResultDto> = ApiResult.Ok(quoteData)
        var createResult: ApiResult<OrderDto> = ApiResult.Ok(orderDto)

        override suspend fun quote(body: QuoteRequestDto): ApiResult<QuoteResultDto> {
            lastQuoteRequest = body
            return quoteResult
        }

        override suspend fun create(body: CreateOrderRequestDto): ApiResult<OrderDto> {
            lastCreateRequest = body
            return createResult
        }

        override suspend fun pay(id: Long): ApiResult<OrderDto> {
            payCalls += 1
            return ApiResult.Ok(orderDto)
        }
    }

    }

    private fun fakeRepo() = FakeOrderRepository(
        apiStub,
        SessionStore(ApplicationProvider.getApplicationContext()),
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        MemberSession.update(
            MemberProfileDto(
                id = 1,
                phone = "13812345678",
                maskedPhone = "138****5678",
                nickname = "咖啡友5678",
                points = 0,
                level = "silver",
                levelText = "银卡",
                createdAt = "2026-09-26T02:00:00.000Z",
            ),
        )
        OrderSession.selectStore(store)
        OrderSession.setOrderType(OrderSession.ORDER_TYPE_TAKEOUT)
        CartStore.clear()
        CartStore.setPromoProducts(listOf(1L))
        CartStore.add(
            CartLine(
                productId = 1,
                productName = "山野拿铁",
                categoryName = "咖啡",
                spec = mapOf("cup" to "large", "temp" to "ice", "sugar" to "less"),
                specText = "大杯 / 冰 / 少糖",
                unitPrice = 3500,
                quantity = 2,
            ),
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        MemberSession.update(null)
        CartStore.clear()
        CartStore.setPromoProducts(emptyList())
    }

    @Test
    fun `初始化按购物车内容报价`() = runTest(dispatcher) {
        val repo = fakeRepo()
        val vm = CheckoutViewModel(repo)
        advanceUntilIdle()
        val request = repo.lastQuoteRequest
        assertNotNull(request)
        assertEquals(1, request?.items?.size)
        assertEquals(2, request?.items?.first()?.quantity)
        assertEquals("takeout", request?.orderType)
        assertTrue(vm.state.value.quote != null)
        assertEquals(4250, vm.state.value.quote?.payFen)
    }

    @Test
    fun `选择优惠券重新报价`() = runTest(dispatcher) {
        val repo = fakeRepo()
        val vm = CheckoutViewModel(repo)
        advanceUntilIdle()
        vm.selectCoupon(7)
        advanceUntilIdle()
        assertEquals(7L, repo.lastQuoteRequest?.memberCouponId)
    }

    @Test
    fun `模拟支付：先下单再支付并清空购物车`() = runTest(dispatcher) {
        val repo = fakeRepo()
        val vm = CheckoutViewModel(repo)
        advanceUntilIdle()
        var paidOrderId: Long? = null
        vm.submit { paidOrderId = it }
        advanceUntilIdle()
        assertEquals(99L, paidOrderId)
        assertEquals(1, repo.payCalls)
        assertEquals(5L, repo.lastCreateRequest?.memberCouponId)
        assertEquals(0, CartStore.totalCount)
        assertFalse(vm.state.value.submitting)
    }

    @Test
    fun `下单失败展示服务端中文原因`() = runTest(dispatcher) {
        val repo = fakeRepo()
        repo.createResult = ApiResult.Err(ApiException(20002, "门店休息中，暂无法下单"))
        val vm = CheckoutViewModel(repo)
        advanceUntilIdle()
        var paidOrderId: Long? = null
        vm.submit { paidOrderId = it }
        advanceUntilIdle()
        assertEquals(null, paidOrderId)
        assertEquals("门店休息中，暂无法下单", vm.state.value.error)
    }

    @Test
    fun `切换堂食后重新报价`() = runTest(dispatcher) {
        val repo = fakeRepo()
        val vm = CheckoutViewModel(repo)
        advanceUntilIdle()
        vm.setOrderType("dine_in")
        advanceUntilIdle()
        assertEquals("dine_in", repo.lastQuoteRequest?.orderType)
    }
}

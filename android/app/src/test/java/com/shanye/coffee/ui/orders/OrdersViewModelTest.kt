package com.shanye.coffee.ui.orders

import androidx.test.core.app.ApplicationProvider
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.OrderRepository
import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiException
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.dto.MemberProfileDto
import com.shanye.coffee.data.remote.dto.OrderDto
import com.shanye.coffee.data.remote.dto.OrderItemDto
import com.shanye.coffee.data.remote.dto.OrderListDto
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
class OrdersViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    private companion object {
    private fun order(id: Long, status: String) = OrderDto(
            id = id,
            orderNo = "SY2026092600000$id",
            storeId = 1,
            storeName = "山野咖啡 · 望京店",
            orderType = "takeout",
            orderTypeText = "自提",
            status = status,
            statusText = status,
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
            discountFen = 0,
            promoDiscountFen = 0,
            payFen = 7000,
            pickupCode = if (status == "pending_pay") null else "1234",
            createdAt = "2026-09-26T02:00:00.000Z",
        )    }



    private val apiStub: ApiService = Proxy.newProxyInstance(
        ApiService::class.java.classLoader,
        arrayOf(ApiService::class.java),
    ) { _, _, _ -> throw UnsupportedOperationException("测试中不应调用真实接口") } as ApiService

    private class FakeOrderRepository(
        api: ApiService,
        sessionStore: SessionStore,
    ) : OrderRepository(api, sessionStore) {
        var lastStatus: String? = null
        var listResult: ApiResult<OrderListDto> = ApiResult.Ok(
            OrderListDto(list = listOf(order(1, "paid"), order(2, "pending_pay")), total = 2),
        )

        override suspend fun list(status: String?, page: Int, pageSize: Int): ApiResult<OrderListDto> {
            lastStatus = status
            return listResult
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
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        MemberSession.update(null)
    }

    @Test
    fun `初始化加载订单列表`() = runTest(dispatcher) {
        val vm = OrdersViewModel(fakeRepo())
        advanceUntilIdle()
        assertEquals(2, vm.state.value.orders.size)
        assertFalse(vm.state.value.loading)
    }

    @Test
    fun `按状态筛选重新请求`() = runTest(dispatcher) {
        val repo = fakeRepo()
        val vm = OrdersViewModel(repo)
        advanceUntilIdle()
        vm.selectStatus("paid")
        advanceUntilIdle()
        assertEquals("paid", repo.lastStatus)
        assertEquals("paid", vm.state.value.status)
    }

    @Test
    fun `下拉刷新进入刷新态并重新加载`() = runTest(dispatcher) {
        val vm = OrdersViewModel(fakeRepo())
        advanceUntilIdle()
        vm.refresh()
        assertTrue(vm.state.value.refreshing)
        advanceUntilIdle()
        assertFalse(vm.state.value.refreshing)
        assertEquals(2, vm.state.value.orders.size)
    }

    @Test
    fun `加载失败展示中文原因`() = runTest(dispatcher) {
        val repo = fakeRepo()
        repo.listResult = ApiResult.Err(ApiException(10002, "未登录或登录已过期"))
        val vm = OrdersViewModel(repo)
        advanceUntilIdle()
        assertEquals("未登录或登录已过期", vm.state.value.error)
    }
}

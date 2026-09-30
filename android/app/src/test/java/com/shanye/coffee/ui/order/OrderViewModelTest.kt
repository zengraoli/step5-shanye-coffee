package com.shanye.coffee.ui.order

import androidx.test.core.app.ApplicationProvider
import com.shanye.coffee.data.CartStore
import com.shanye.coffee.data.CatalogRepository
import com.shanye.coffee.data.OrderSession
import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.dto.CategoryDto
import com.shanye.coffee.data.remote.dto.OrderDto
import com.shanye.coffee.data.remote.dto.ProductDto
import com.shanye.coffee.data.remote.dto.ProductListDto
import com.shanye.coffee.data.remote.dto.PromoActivityDto
import com.shanye.coffee.data.remote.dto.PromoStateDto
import com.shanye.coffee.data.remote.dto.SpecGroupDto
import com.shanye.coffee.data.remote.dto.SpecOptionDto
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
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.lang.reflect.Proxy

/**
 * 点单页：第三轮验收补充。
 * 覆盖：堂食 / 自提与首页同步、无规格商品直接加购、首页带入商品自动开规格、购物车优惠口径。
 */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class OrderViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    private val specs = listOf(
        SpecGroupDto(
            key = "cup",
            label = "杯型",
            options = listOf(
                SpecOptionDto("medium", "中杯", 0),
                SpecOptionDto("large", "大杯", 300),
            ),
        ),
    )

    private val drink = ProductDto(
        id = 1L,
        categoryId = 1L,
        categoryName = "咖啡",
        name = "山野拿铁",
        subtitle = "招牌",
        basePrice = 3200,
        onSale = true,
        soldOut = false,
        sort = 1,
        specs = specs,
    )

    private val food = ProductDto(
        id = 13L,
        categoryId = 3L,
        categoryName = "轻食",
        name = "海盐芝士可颂",
        subtitle = "现烤",
        basePrice = 2200,
        onSale = true,
        soldOut = false,
        sort = 1,
        specs = emptyList(),
    )

    private val apiStub: ApiService = Proxy.newProxyInstance(
        ApiService::class.java.classLoader,
        arrayOf(ApiService::class.java),
    ) { _, _, _ -> throw UnsupportedOperationException("测试中不应调用真实接口") } as ApiService

    private class FakeCatalogRepository(
        api: ApiService,
        sessionStore: SessionStore,
    ) : CatalogRepository(api, sessionStore) {
        var productsResult: ApiResult<ProductListDto> =
            ApiResult.Ok(ProductListDto(list = emptyList(), total = 0))

        override suspend fun products(
            categoryId: Long?,
            keyword: String?,
            page: Int,
            pageSize: Int,
            storeId: Long?,
        ): ApiResult<ProductListDto> = productsResult

        override suspend fun categories(): ApiResult<List<CategoryDto>> =
            ApiResult.Ok(
                listOf(
                    CategoryDto(1L, "咖啡", 1, 1),
                    CategoryDto(3L, "轻食", 2, 1),
                ),
            )

        override suspend fun stores(): ApiResult<List<StoreDto>> =
            ApiResult.Ok(
                listOf(
                    StoreDto(1L, "望京店", "地址", "010", "00:00", "23:59", "open", "营业中"),
                    StoreDto(2L, "三里屯店", "地址", "010", "00:00", "23:59", "rest", "休息中"),
                ),
            )

        override suspend fun promo(): ApiResult<PromoStateDto> =
            ApiResult.Ok(
                PromoStateDto(
                    active = true,
                    activity = PromoActivityDto(
                        id = 1L,
                        name = "第二杯半价",
                        type = "second_half",
                        status = "active",
                        startAt = "2026-09-01T00:00:00.000Z",
                        endAt = "2026-12-31T23:59:59.000Z",
                        productIds = listOf(1L),
                    ),
                ),
            )
    }

    private fun repository() = FakeCatalogRepository(
        apiStub,
        SessionStore(ApplicationProvider.getApplicationContext()),
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        CartStore.clear()
        CartStore.setPromoProducts(emptyList())
        OrderSession.setOrderType(OrderSession.ORDER_TYPE_TAKEOUT)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        CartStore.clear()
        CartStore.setPromoProducts(emptyList())
        OrderSession.setOrderType(OrderSession.ORDER_TYPE_TAKEOUT)
    }

    @Test
    fun `取餐方式与首页选择同步`() = runTest(dispatcher) {
        val repo = repository()
        repo.productsResult = ApiResult.Ok(ProductListDto(list = listOf(drink, food), total = 2))
        // 首页先选堂食，再进入点单页
        OrderSession.setOrderType(OrderSession.ORDER_TYPE_DINE_IN)
        val vm = OrderViewModel(repo)
        advanceUntilIdle()
        assertEquals(OrderSession.ORDER_TYPE_DINE_IN, vm.state.value.orderType)

        // 点单页切回自提，OrderSession 同步更新
        vm.setOrderType(OrderSession.ORDER_TYPE_TAKEOUT)
        advanceUntilIdle()
        assertEquals(OrderSession.ORDER_TYPE_TAKEOUT, vm.state.value.orderType)
        assertEquals(OrderSession.ORDER_TYPE_TAKEOUT, OrderSession.orderType.value)
    }

    @Test
    fun `无规格商品直接加入购物车且不弹规格层`() = runTest(dispatcher) {
        val repo = repository()
        repo.productsResult = ApiResult.Ok(ProductListDto(list = listOf(drink, food), total = 2))
        val vm = OrderViewModel(repo)
        advanceUntilIdle()

        vm.openSpec(food)
        advanceUntilIdle()

        // 轻食：不进规格层、直接入车
        assertNull(vm.state.value.specProduct)
        assertEquals(1, CartStore.totalCount)
        assertEquals("标准装", CartStore.lines.value.first().specText)
    }

    @Test
    fun `首页带入商品自动打开规格层`() = runTest(dispatcher) {
        val repo = repository()
        repo.productsResult = ApiResult.Ok(ProductListDto(list = listOf(drink, food), total = 2))
        val vm = OrderViewModel(repo, focusProductId = drink.id)
        advanceUntilIdle()

        assertNotNull(vm.state.value.specProduct)
        assertEquals(drink.id, vm.state.value.specProduct?.id)
        // 默认选中该商品的第一个规格
        assertEquals("medium", vm.state.value.specSelection["cup"])

        vm.confirmSpec()
        advanceUntilIdle()
        assertEquals(1, CartStore.totalCount)
        assertEquals(3200, CartStore.lines.value.first().unitPrice)
        assertNull(vm.state.value.specProduct)
    }

    @Test
    fun `大杯加价三元`() = runTest(dispatcher) {
        val repo = repository()
        repo.productsResult = ApiResult.Ok(ProductListDto(list = listOf(drink), total = 1))
        val vm = OrderViewModel(repo)
        advanceUntilIdle()
        vm.openSpec(drink)
        vm.selectSpecOption("cup", "large")
        vm.confirmSpec()
        advanceUntilIdle()
        val line = CartStore.lines.value.first()
        assertEquals(3500, line.unitPrice)
        assertEquals("大杯", line.specText)
    }

    @Test
    fun `活动商品角标与购物车优惠使用服务端活动配置`() = runTest(dispatcher) {
        val repo = repository()
        repo.productsResult = ApiResult.Ok(ProductListDto(list = listOf(drink), total = 1))
        val vm = OrderViewModel(repo)
        advanceUntilIdle()

        assertTrue(vm.state.value.promoProductIds.contains(drink.id))
        CartStore.setPromoProducts(vm.state.value.promoProductIds)
        CartStore.add(
            com.shanye.coffee.data.CartLine(
                productId = drink.id,
                productName = drink.name,
                categoryName = drink.categoryName,
                spec = mapOf("cup" to "medium"),
                specText = "中杯",
                unitPrice = 3200,
                quantity = 2,
            ),
        )
        advanceUntilIdle()
        assertEquals(1600, vm.state.value.promoDiscountFen)
        assertEquals(4800, vm.state.value.cartPayableFen)
        assertFalse(vm.state.value.products.isEmpty())
    }
}

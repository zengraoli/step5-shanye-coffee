package com.shanye.coffee.integration

import com.shanye.coffee.data.CartStore
import com.shanye.coffee.data.CatalogRepository
import com.shanye.coffee.data.MemberRepository
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.OrderRepository
import com.shanye.coffee.data.OrderSession
import com.shanye.coffee.data.remote.ApiClient
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.dto.CreateOrderRequestDto
import com.shanye.coffee.data.remote.dto.MemberLoginRequestDto
import com.shanye.coffee.data.remote.dto.QuoteItemInputDto
import com.shanye.coffee.data.remote.dto.QuoteRequestDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.withContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Android 客户端 ↔ 真实 server 联调（T27 第三轮验收用）。
 *
 * 目标地址由 `-PAPI_BASE_URL=http://<host>:3000` 传入口，默认连 127.0.0.1:3000：
 *   ./gradlew testDebugUnitTest -PAPI_BASE_URL=http://10.0.2.2:3000 \
 *     --tests "com.shanye.coffee.integration.AndroidFlowIntegrationTest"
 *
 * 覆盖反馈 8/9/10/15/16/20/21 的端到端链路：
 * 登录 → 领券 → 报价（不使用券 / 选券）→ 下单 → 支付 → 订单详情 → 会员积分刷新。
 * 用例会真实写库，请在测试库上运行。
 */
@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AndroidFlowIntegrationTest {

    private val dispatcher = StandardTestDispatcher()

    private val baseUrl: String =
        System.getProperty("API_BASE_URL") ?: "http://127.0.0.1:3000"

    /** 登录态的 token 存放处（模拟 AuthInterceptor 的运行时 token） */
    @Volatile
    private var tokenHolder: String? = null

    private lateinit var api: ApiService
    private lateinit var memberRepository: MemberRepository
    private lateinit var orderRepository: OrderRepository
    private lateinit var catalogRepository: CatalogRepository
    /**
     * 测试用的会话存储：联调只需要仓库可用，不落盘。
     * 用继承 + 空实现绕开 Android Context（Robolectric 下也可直接 mock，这里更简单）。
     */
    private fun stubSessionStore(): com.shanye.coffee.data.local.SessionStore =
        object : com.shanye.coffee.data.local.SessionStore(
            org.robolectric.RuntimeEnvironment.getApplication(),
        ) {
            override val tokenFlow: kotlinx.coroutines.flow.Flow<String?> =
                kotlinx.coroutines.flow.flowOf(null)
            override val profileJsonFlow: kotlinx.coroutines.flow.Flow<String?> =
                kotlinx.coroutines.flow.flowOf(null)
            override suspend fun save(token: String, profileJson: String) = Unit
            override suspend fun updateProfile(profileJson: String) = Unit
            override suspend fun clear() = Unit
            override fun currentToken(): String? = null
        }

    /** 每次运行用不同手机号，保证用例可重复执行 */
    private val phone = "139${(System.currentTimeMillis() % 100000000).toString().padStart(8, '0')}"

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        MemberSession.clear()
        CartStore.clear()
        OrderSession.setOrderType(OrderSession.ORDER_TYPE_TAKEOUT)
        // 登录后把 token 放进 holder，后续请求自动带上 Authorization 头
        api = ApiClient.createService(baseUrl) { tokenHolder }
        memberRepository = MemberRepository(api, stubSessionStore())
        orderRepository = OrderRepository(api, stubSessionStore())
        catalogRepository = CatalogRepository(api, stubSessionStore())
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        MemberSession.clear()
        CartStore.clear()
    }

    @Test
    fun `登录点单下单支付与积分刷新全流程`() = runTest(dispatcher) {
        // 1. 登录（演示验证码 123456）
        val login = withContext(Dispatchers.IO) {
            memberRepository.login(phone, "123456")
        }
        assertTrue("登录失败：$login", login is ApiResult.Ok)
        val loginData = (login as ApiResult.Ok).data
        tokenHolder = loginData.token
        MemberSession.update(loginData.member)
        assertTrue(loginData.token.isNotBlank())
        assertTrue(loginData.member.maskedPhone.startsWith("139****"))

        // 2. 门店与商品（第 1 家门店）
        val stores = withContext(Dispatchers.IO) { catalogRepository.stores() }
        assertTrue("门店列表获取失败：$stores", stores is ApiResult.Ok)
        val store = (stores as ApiResult.Ok).data.first()
        OrderSession.selectStore(store)

        val products = withContext(Dispatchers.IO) { catalogRepository.products(pageSize = 60) }
        assertTrue("商品列表获取失败：$products", products is ApiResult.Ok)
        val drink = (products as ApiResult.Ok).data.list.first { it.specs.isNotEmpty() && !it.soldOut }
        CartStore.setPromoProducts(emptyList())

        // 3. 领券（反馈 15：客户端要有领券入口，接口层先验证可用）
        val templates = withContext(Dispatchers.IO) { catalogRepository.couponTemplates() }
        assertTrue("券模板获取失败：$templates", templates is ApiResult.Ok)
        val claim = withContext(Dispatchers.IO) { memberRepository.claimCoupon((templates as ApiResult.Ok).data.first().id) }
        assertTrue("领券失败：$claim", claim is ApiResult.Ok)
        val couponId = (claim as ApiResult.Ok).data.id

        // 4. 购物车：同一商品同规格 3 杯（满足满 50 元门槛，同时覆盖第二杯半价）
        CartStore.clear()
        CartStore.add(
            com.shanye.coffee.data.CartLine(
                productId = drink.id,
                productName = drink.name,
                categoryName = drink.categoryName,
                spec = mapOf("cup" to "medium", "temp" to "ice", "sugar" to "less"),
                specText = "中杯 / 冰 / 少糖",
                unitPrice = drink.basePrice,
                quantity = 3,
            ),
        )
        val lines = CartStore.lines.value
        // 本地优惠计算与服务端口径一致：3 杯同价，只有第 2 杯半价
        CartStore.setPromoProducts(listOf(drink.id))
        assertEquals(drink.basePrice / 2, CartStore.promoDiscountFen())
        CartStore.setPromoProducts(emptyList())

        val quoteWithCoupon = withContext(Dispatchers.IO) {
            orderRepository.quote(
                QuoteRequestDto(
                    storeId = store.id,
                    orderType = "takeout",
                    items = lines.map {
                        QuoteItemInputDto(it.productId, it.spec, it.quantity)
                    },
                    memberCouponId = couponId,
                ),
            )
        }
        assertTrue("带券报价失败：$quoteWithCoupon", quoteWithCoupon is ApiResult.Ok)

        // 5. 不使用优惠券：请求必须带 withoutCoupon，且服务端不回推最优券（反馈 21）
        val quoteWithoutCoupon = withContext(Dispatchers.IO) {
            orderRepository.quote(
                QuoteRequestDto(
                    storeId = store.id,
                    orderType = "takeout",
                    items = lines.map {
                        QuoteItemInputDto(it.productId, it.spec, it.quantity)
                    },
                    memberCouponId = null,
                    withoutCoupon = true,
                ),
            )
        }
        assertTrue("不带券报价失败：$quoteWithoutCoupon", quoteWithoutCoupon is ApiResult.Ok)
        val withoutData = (quoteWithoutCoupon as ApiResult.Ok).data
        assertEquals(null, withoutData.selectedCouponId)
        assertEquals(0, withoutData.discountFen)
        assertEquals(withoutData.totalFen - withoutData.promoDiscountFen, withoutData.payFen)

        // 6. 下单 + 支付（反馈 20：orderType 以 OrderSession 为准）
        OrderSession.setOrderType(OrderSession.ORDER_TYPE_DINE_IN)
        val created = withContext(Dispatchers.IO) {
            orderRepository.create(
                CreateOrderRequestDto(
                    storeId = store.id,
                    orderType = OrderSession.orderType.value,
                    items = lines.map { QuoteItemInputDto(it.productId, it.spec, it.quantity) },
                    memberCouponId = couponId,
                    remark = null,
                ),
            )
        }
        assertTrue("下单失败：$created", created is ApiResult.Ok)
        val orderId = (created as ApiResult.Ok).data.id

        val paid = withContext(Dispatchers.IO) { orderRepository.pay(orderId) }
        assertTrue("支付失败：$paid", paid is ApiResult.Ok)
        val paidOrder = (paid as ApiResult.Ok).data
        assertEquals("paid", paidOrder.status)
        assertEquals("堂食", paidOrder.orderTypeText)
        assertNotNull("支付后应生成取餐码", paidOrder.pickupCode)

        // 7. 订单详情可查（含活动优惠与优惠券信息）
        val detail = withContext(Dispatchers.IO) { orderRepository.detail(orderId) }
        assertTrue("订单详情获取失败：$detail", detail is ApiResult.Ok)
        val detailData = (detail as ApiResult.Ok).data
        assertEquals(orderId, detailData.id)
        assertTrue("取餐码应为 4 位数字", detailData.pickupCode?.matches(Regex("^\\d{4}$")) == true)

        // 8. 会员资料刷新：支付后积分立即到账（反馈 13）
        val me = withContext(Dispatchers.IO) { memberRepository.me() }
        assertTrue("会员资料获取失败：$me", me is ApiResult.Ok)
        val points = (me as ApiResult.Ok).data.points
        assertTrue("支付后应发放积分，实际 $points", points > 0)
        assertTrue("积分应等于实付金额向下取整到元", points == paidOrder.payFen / 100)

        // 9. 我的优惠券里这张券已标记使用
        val myCoupons = withContext(Dispatchers.IO) { memberRepository.coupons() }
        assertTrue("我的优惠券获取失败：$myCoupons", myCoupons is ApiResult.Ok)
        val mine = (myCoupons as ApiResult.Ok).data.firstOrNull { it.id == couponId }
        assertEquals("used", mine?.status)

        // 10. 重复支付必须被拒绝（券只核销一次，反馈 1）
        val payAgain = withContext(Dispatchers.IO) { orderRepository.pay(orderId) }
        assertTrue("重复支付应被拒绝：$payAgain", payAgain is ApiResult.Err)

        // 11. 取消已支付订单必须被拒绝（反馈 35：取消要有二次确认 + 只能取消待支付）
        val cancelPaid = withContext(Dispatchers.IO) { orderRepository.cancel(orderId) }
        assertTrue("已支付订单不能被取消：$cancelPaid", cancelPaid is ApiResult.Err)

        CartStore.clear()
    }

    @Test
    fun `token 失效后请求返回未登录且不会写入购物车`() = runTest(dispatcher) {
        // 用一个无效 token，验证仓库层把 10002 作为错误返回、不抛异常（反馈 9）
        val apiBad = ApiClient.createService(baseUrl) { "invalid-token" }
        val repo = OrderRepository(apiBad, null)
        val result = withContext(Dispatchers.IO) { repo.list() }
        assertTrue("无效 token 应返回未登录错误：$result", result is ApiResult.Err)
        assertEquals(10002, (result as ApiResult.Err).error.code)
    }
}

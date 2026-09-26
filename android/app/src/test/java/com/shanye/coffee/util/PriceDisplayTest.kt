package com.shanye.coffee.util

import com.shanye.coffee.data.CartLine
import com.shanye.coffee.data.CartStore
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

/**
 * 价格展示测试：界面统一 ¥xx.xx；购物车与“第二杯半价”的金额展示。
 */
class PriceDisplayTest {

    @Before
    fun setUp() {
        CartStore.clear()
        CartStore.setPromoProducts(emptyList())
    }

    @After
    fun tearDown() {
        CartStore.clear()
        CartStore.setPromoProducts(emptyList())
    }

    private fun line(productId: Long, unitPrice: Int, quantity: Int) = CartLine(
        productId = productId,
        productName = "桂花拿铁",
        categoryName = "咖啡",
        spec = mapOf("cup" to "large", "temp" to "ice", "sugar" to "less"),
        specText = "大杯 / 冰 / 少糖",
        unitPrice = unitPrice,
        quantity = quantity,
    )

    @Test
    fun `商品价格展示为元`() {
        // 2800 分 = ¥28.00
        assertEquals("¥28.00", MoneyFormat.yuan(2800))
        // 大杯加价 300 分 = +¥3.00
        assertEquals("+¥3.00", "+" + MoneyFormat.yuan(300))
    }

    @Test
    fun `购物车条展示原价、活动优惠与应付`() {
        CartStore.setPromoProducts(listOf(1L))
        CartStore.add(line(1, 3100, 2))
        // 原价 6200，第二杯半价 1550，应付 4650
        val total = MoneyFormat.yuan(CartStore.totalFen.toLong())
        val promo = MoneyFormat.yuan(CartStore.promoDiscountFen().toLong())
        val payable = MoneyFormat.yuan(CartStore.payableFen.toLong())
        assertEquals("¥62.00", total)
        assertEquals("¥15.50", promo)
        assertEquals("¥46.50", payable)
        // 购物车条文案：已享第二杯半价 -¥15.50
        assertEquals("已享第二杯半价 -¥15.50", "已享第二杯半价 -" + promo)
    }

    @Test
    fun `结算页金额明细展示`() {
        // 原价 8400、活动 1450、券 1000、实付 5950（与设计稿一致）
        assertEquals("¥84.00", MoneyFormat.yuan(8400))
        assertEquals("-¥14.50", "-" + MoneyFormat.yuan(1450))
        assertEquals("-¥10.00", "-" + MoneyFormat.yuan(1000))
        assertEquals("¥59.50", MoneyFormat.yuan(5950))
        assertEquals("已优惠 ¥24.50", "已优惠 " + MoneyFormat.yuan(2450))
    }

    @Test
    fun `订单行小计展示`() {
        // 3100 × 2 = 6200
        assertEquals("¥62.00", MoneyFormat.yuan((3100L * 2).toLong()))
    }
}

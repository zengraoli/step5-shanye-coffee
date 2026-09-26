package com.shanye.coffee.data

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class CartStoreTest {

    private fun line(
        productId: Long,
        unitPrice: Int,
        quantity: Int,
        spec: Map<String, String> = mapOf("cup" to "large", "temp" to "ice", "sugar" to "less"),
    ) = CartLine(
        productId = productId,
        productName = "商品$productId",
        categoryName = "咖啡",
        spec = spec,
        specText = "大杯 / 冰 / 少糖",
        unitPrice = unitPrice,
        quantity = quantity,
    )

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

    @Test
    fun `同商品同规格合并数量`() {
        CartStore.add(line(1, 3500, 1))
        CartStore.add(line(1, 3500, 2))
        assertEquals(1, CartStore.lines.value.size)
        assertEquals(3, CartStore.totalCount)
        assertEquals(10500, CartStore.totalFen)
    }

    @Test
    fun `不同规格分行`() {
        CartStore.add(line(1, 3500, 1))
        CartStore.add(line(1, 3200, 1, mapOf("cup" to "medium", "temp" to "ice", "sugar" to "less")))
        assertEquals(2, CartStore.lines.value.size)
        assertEquals(6700, CartStore.totalFen)
    }

    @Test
    fun `第二杯半价：第 2 4 杯半价`() {
        CartStore.setPromoProducts(listOf(1L))
        CartStore.add(line(1, 3500, 2))
        // 原价 7000，第 2 杯半价 1750，应付 5250
        assertEquals(7000, CartStore.totalFen)
        assertEquals(1750, CartStore.promoDiscountFen())
        assertEquals(5250, CartStore.payableFen)

        CartStore.add(line(1, 3500, 2))
        // 共 4 杯：原价 14000，优惠 3500，应付 10500
        assertEquals(14000, CartStore.totalFen)
        assertEquals(3500, CartStore.promoDiscountFen())
        assertEquals(10500, CartStore.payableFen)
    }

    @Test
    fun `非活动商品不优惠`() {
        CartStore.setPromoProducts(listOf(1L))
        CartStore.add(line(2, 3500, 4))
        assertEquals(14000, CartStore.totalFen)
        assertEquals(0, CartStore.promoDiscountFen())
    }

    @Test
    fun `未配置活动不优惠`() {
        CartStore.setPromoProducts(emptyList())
        CartStore.add(line(1, 3500, 4))
        assertEquals(0, CartStore.promoDiscountFen())
    }

    @Test
    fun `半价按单价一半向下取整`() {
        CartStore.setPromoProducts(listOf(1L))
        // 3201 分的第 2 杯半价为 1600
        CartStore.add(line(1, 3201, 2))
        // 原价 6402，第 2 杯半价 1600
        assertEquals(1600, CartStore.promoDiscountFen())
    }

    @Test
    fun `同一商品多规格累计计数`() {
        CartStore.setPromoProducts(listOf(1L))
        CartStore.add(line(1, 3500, 1))
        CartStore.add(line(1, 3200, 1, mapOf("cup" to "medium", "temp" to "hot", "sugar" to "none")))
        // 第 2 件（中杯 3200）半价 1600
        assertEquals(1600, CartStore.promoDiscountFen())
    }

    @Test
    fun `修改数量与移除`() {
        CartStore.add(line(1, 3500, 1))
        CartStore.add(line(2, 1800, 1))
        CartStore.setQuantity(0, 5)
        assertEquals(5, CartStore.lines.value[0].quantity)
        CartStore.setQuantity(0, 0)
        assertEquals(1, CartStore.lines.value.size)
        assertEquals(1800, CartStore.totalFen)
    }
}

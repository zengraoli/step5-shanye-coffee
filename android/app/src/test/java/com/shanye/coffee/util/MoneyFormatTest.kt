package com.shanye.coffee.util

import org.junit.Assert.assertEquals
import org.junit.Test

class MoneyFormatTest {

    @Test
    fun `分格式化为元`() {
        assertEquals("¥0.00", MoneyFormat.yuan(0))
        assertEquals("¥0.05", MoneyFormat.yuan(5))
        assertEquals("¥32.00", MoneyFormat.yuan(3200))
        assertEquals("¥69.99", MoneyFormat.yuan(6999))
        assertEquals("¥1234.56", MoneyFormat.yuan(123456))
    }

    @Test
    fun `负数金额带符号`() {
        assertEquals("-¥15.50", MoneyFormat.yuan(-1550))
        assertEquals("-¥0.99", MoneyFormat.yuan(-99))
    }

    @Test
    fun `absYuan 忽略符号`() {
        assertEquals("¥15.50", MoneyFormat.absYuan(-1550))
    }
}

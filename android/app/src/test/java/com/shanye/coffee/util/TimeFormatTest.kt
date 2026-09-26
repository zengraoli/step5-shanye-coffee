package com.shanye.coffee.util

import org.junit.Assert.assertEquals
import org.junit.Test

class TimeFormatTest {

    @Test
    fun `UTC 转北京时间`() {
        assertEquals("2026-09-26 18:30", TimeFormat.dateTime("2026-09-26T10:30:00.000Z"))
        assertEquals("09-27 00:05", TimeFormat.short("2026-09-26T16:05:00.000Z"))
        assertEquals("2026-09-27", TimeFormat.date("2026-09-26T16:05:00.000Z"))
    }

    @Test
    fun `空值与非法值返回占位`() {
        assertEquals("-", TimeFormat.dateTime(null))
        assertEquals("-", TimeFormat.dateTime(""))
        assertEquals("-", TimeFormat.dateTime("not-a-date"))
    }
}

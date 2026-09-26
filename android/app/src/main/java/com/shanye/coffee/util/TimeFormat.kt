package com.shanye.coffee.util

import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException

/**
 * 时间格式化：接口为 UTC ISO8601，界面按北京时间（UTC+8）展示。
 */
object TimeFormat {

    private val BEIJING: ZoneOffset = ZoneOffset.ofHours(8)
    private val DATE_TIME: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm").withZone(BEIJING)
    private val DATE: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(BEIJING)

    /** UTC ISO8601 → 北京时间 yyyy-MM-dd HH:mm */
    fun dateTime(iso: String?): String = format(iso, DATE_TIME)

    /** UTC ISO8601 → 北京时间 yyyy-MM-dd */
    fun date(iso: String?): String = format(iso, DATE)

    /** UTC ISO8601 → 北京时间 MM-dd HH:mm（列表紧凑展示） */
    fun short(iso: String?): String = format(iso, DateTimeFormatter.ofPattern("MM-dd HH:mm").withZone(BEIJING))

    private fun format(iso: String?, formatter: DateTimeFormatter): String {
        if (iso.isNullOrBlank()) {
            return "-"
        }
        return try {
            formatter.format(Instant.parse(iso))
        } catch (_: DateTimeParseException) {
            "-"
        }
    }
}

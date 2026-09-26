package com.shanye.coffee.util

import kotlin.math.abs

/**
 * 金额格式化：接口传输为整数“分”，界面统一格式化为 ¥xx.xx。
 */
object MoneyFormat {

    /** 分 → ¥xx.xx（支持负数，用于优惠金额展示，如 -¥15.50） */
    fun yuan(fen: Long): String {
        val sign = if (fen < 0) "-" else ""
        val absValue = abs(fen)
        val yuan = absValue / 100
        val cents = absValue % 100
        return "$sign¥$yuan.${cents.toString().padStart(2, '0')}"
    }

    /** 分 → 不带符号的 ¥xx.xx */
    fun absYuan(fen: Long): String = yuan(abs(fen))
}

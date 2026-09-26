package com.shanye.coffee.data

import com.shanye.coffee.data.remote.dto.SpecGroupDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/** 购物车中的一行 */
data class CartLine(
    val productId: Long,
    val productName: String,
    val categoryName: String,
    val spec: Map<String, String>,
    val specText: String,
    val unitPrice: Int,
    val quantity: Int,
) {
    val amount: Int get() = unitPrice * quantity
}

/**
 * 购物车（进程内单例）。
 * 同一商品同一规格合并；“第二杯半价”按同一商品第 2、4… 件半价计算，与服务端规则一致。
 */
object CartStore {

    private val _lines = MutableStateFlow<List<CartLine>>(emptyList())
    val lines: StateFlow<List<CartLine>> = _lines.asStateFlow()

    private val _promoProductIds = MutableStateFlow<Set<Long>>(emptySet())

    /** 当前活动适用商品（用于角标与购物车优惠展示） */
    val promoProductIds: StateFlow<Set<Long>> = _promoProductIds.asStateFlow()

    fun setPromoProducts(ids: Collection<Long>) {
        _promoProductIds.value = ids.toSet()
    }

    fun add(line: CartLine) {
        _lines.update { current ->
            val index = current.indexOfFirst { it.productId == line.productId && it.spec == line.spec }
            if (index == -1) {
                current + line
            } else {
                current.mapIndexed { i, existing ->
                    if (i == index) {
                        existing.copy(quantity = minOf(99, existing.quantity + line.quantity))
                    } else {
                        existing
                    }
                }
            }
        }
    }

    fun setQuantity(index: Int, quantity: Int) {
        _lines.update { current ->
            if (index !in current.indices) {
                current
            } else if (quantity <= 0) {
                current.filterIndexed { i, _ -> i != index }
            } else {
                current.mapIndexed { i, line ->
                    if (i == index) line.copy(quantity = minOf(99, quantity)) else line
                }
            }
        }
    }

    fun clear() {
        _lines.value = emptyList()
    }

    val totalCount: Int
        get() = _lines.value.sumOf { it.quantity }

    val totalFen: Int
        get() = _lines.value.sumOf { it.amount }

    /** 应付金额：原价减去第二杯半价优惠（设计稿购物车条大数字） */
    val payableFen: Int
        get() = totalFen - promoDiscountFen()

    /**
     * 第二杯半价优惠金额（分）：同一适用商品的第 2、4… 件按半价计。
     * 与服务端 `secondHalfDiscountFen` 规则保持一致。
     */
    fun promoDiscountFen(): Int {
        val promoIds = _promoProductIds.value
        if (promoIds.isEmpty()) {
            return 0
        }
        var discount = 0
        val grouped = _lines.value.filter { it.productId in promoIds }.groupBy { it.productId }
        for (lines in grouped.values) {
            var seen = 0
            for (line in lines) {
                repeat(line.quantity) {
                    seen += 1
                    if (seen % 2 == 0) {
                        discount += line.unitPrice / 2
                    }
                }
            }
        }
        return discount
    }
}

/** 规格分组默认值（中杯 / 冰 / 少糖） */
fun defaultSpecSelection(groups: List<SpecGroupDto>): Map<String, String> =
    groups.associate { group -> group.key to (group.options.firstOrNull()?.value ?: "") }

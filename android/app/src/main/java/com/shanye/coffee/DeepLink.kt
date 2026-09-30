package com.shanye.coffee

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * 深链总线：MainActivity 收到 shanye://… 后抛给导航层处理。
 * 冷启动与 App 已运行（onNewIntent）都走这里，避免依赖 NavController 的时序。
 */
object DeepLinkBus {

    private val _uris = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val uris: SharedFlow<String> = _uris.asSharedFlow()

    fun emit(uri: String) {
        _uris.tryEmit(uri)
    }

    /** 把深链映射为站内路由（含参数）；无法识别返回 null */
    fun routeFor(uri: String): String? {
        if (!uri.startsWith("shanye://")) {
            return null
        }
        val body = uri.removePrefix("shanye://").substringBefore('?')
        val query = uri.substringAfter('?', "").takeIf { it.isNotEmpty() }
        return when {
            body.isBlank() || body == "/" -> null
            body.startsWith("order-detail/") -> {
                val id = body.removePrefix("order-detail/").toLongOrNull() ?: return null
                "order-detail/$id"
            }
            body == "order" -> {
                val productId = query?.split('&')
                    ?.map { it.split('=') }
                    ?.find { it.firstOrNull() == "productId" }
                    ?.getOrNull(1)
                    ?.toLongOrNull()
                if (productId != null) "order?productId=$productId" else "order"
            }
            body in setOf("login", "home", "checkout", "orders", "profile", "coupons") -> body
            else -> null
        }
    }
}

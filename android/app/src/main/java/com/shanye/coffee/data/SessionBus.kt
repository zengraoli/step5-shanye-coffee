package com.shanye.coffee.data

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * 全局会话事件总线：token 失效（未登录）时通知 UI 跳转登录页。
 */
object SessionBus {
    private val _unauthorized = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val unauthorized: SharedFlow<Unit> = _unauthorized.asSharedFlow()

    fun notifyUnauthorized() {
        _unauthorized.tryEmit(Unit)
    }
}

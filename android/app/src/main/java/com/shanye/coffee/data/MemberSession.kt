package com.shanye.coffee.data

import com.shanye.coffee.data.remote.dto.MemberProfileDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** 全局会员登录态（进程内单例） */
object MemberSession {

    private val _profile = MutableStateFlow<MemberProfileDto?>(null)
    val profile: StateFlow<MemberProfileDto?> = _profile.asStateFlow()

    /** 本地会话是否已恢复完成（冷启动 deep link 之前为 false） */
    private val _restored = MutableStateFlow(false)
    val restored: StateFlow<Boolean> = _restored.asStateFlow()

    val isLoggedIn: Boolean
        get() = _profile.value != null

    fun update(profile: MemberProfileDto?) {
        _profile.value = profile
    }

    fun markRestored() {
        _restored.value = true
    }

    fun clear() {
        _profile.value = null
    }
}

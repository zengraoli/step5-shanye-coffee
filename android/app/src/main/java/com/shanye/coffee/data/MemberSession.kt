package com.shanye.coffee.data

import com.shanye.coffee.data.remote.dto.MemberProfileDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** 全局会员登录态（进程内单例） */
object MemberSession {

    private val _profile = MutableStateFlow<MemberProfileDto?>(null)
    val profile: StateFlow<MemberProfileDto?> = _profile.asStateFlow()

    val isLoggedIn: Boolean
        get() = _profile.value != null

    fun update(profile: MemberProfileDto?) {
        _profile.value = profile
    }
}

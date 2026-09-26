package com.shanye.coffee.ui.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shanye.coffee.data.MemberRepository
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.remote.ApiResult
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val phone: String = "",
    val code: String = "",
    val agreed: Boolean = false,
    val sendingCode: Boolean = false,
    val submitting: Boolean = false,
    val error: String? = null,
    val codeTip: String? = null,
) {
    val phoneValid: Boolean get() = phone.length == 11
    val codeValid: Boolean get() = code.length == 6
    val canSubmit: Boolean get() = phoneValid && codeValid && agreed && !submitting
    val canSendCode: Boolean get() = phoneValid && !sendingCode
}

class LoginViewModel(private val memberRepository: MemberRepository) : ViewModel() {

    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun onPhoneChange(value: String) {
        _state.update { it.copy(phone = value.filter { char -> char.isDigit() }.take(11), error = null) }
    }

    fun onCodeChange(value: String) {
        _state.update { it.copy(code = value.filter { char -> char.isDigit() }.take(6), error = null) }
    }

    fun toggleAgreed() {
        _state.update { it.copy(agreed = !it.agreed, error = null) }
    }

    /** 获取验证码（演示环境服务端返回固定 123456） */
    fun sendCode() {
        val current = _state.value
        if (!current.canSendCode) {
            return
        }
        _state.update { it.copy(sendingCode = true, error = null, codeTip = null) }
        viewModelScope.launch {
            when (val result = memberRepository.sendSmsCode(current.phone)) {
                is ApiResult.Ok -> _state.update {
                    it.copy(
                        sendingCode = false,
                        codeTip = "验证码已发送（演示环境固定 ${result.data.code}）",
                    )
                }
                is ApiResult.Err -> _state.update {
                    it.copy(sendingCode = false, error = result.error.message)
                }
            }
        }
    }

    /** 登录；成功返回 true */
    fun login(onSuccess: () -> Unit) {
        val current = _state.value
        if (!current.canSubmit) {
            _state.update { it.copy(error = if (!current.agreed) "请先阅读并同意用户协议与隐私政策" else "请填写手机号和验证码") }
            return
        }
        _state.update { it.copy(submitting = true, error = null) }
        viewModelScope.launch {
            when (val result = memberRepository.login(current.phone, current.code)) {
                is ApiResult.Ok -> {
                    MemberSession.update(result.data.member)
                    _state.update { it.copy(submitting = false) }
                    onSuccess()
                }
                is ApiResult.Err -> _state.update {
                    it.copy(submitting = false, error = result.error.message)
                }
            }
        }
    }
}

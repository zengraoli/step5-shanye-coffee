package com.shanye.coffee.ui.login

import androidx.test.core.app.ApplicationProvider
import com.shanye.coffee.data.MemberRepository
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiException
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.dto.MemberLoginDataDto
import com.shanye.coffee.data.remote.dto.MemberProfileDto
import com.shanye.coffee.data.remote.dto.SmsCodeDataDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.lang.reflect.Proxy

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class LoginViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    private val profile = MemberProfileDto(
        id = 1,
        phone = "13812345678",
        maskedPhone = "138****5678",
        nickname = "咖啡友5678",
        points = 0,
        level = "silver",
        levelText = "银卡",
        createdAt = "2026-09-26T02:00:00.000Z",
    )

    private companion object {
        val PROFILE = MemberProfileDto(
            id = 1,
            phone = "13812345678",
            maskedPhone = "138****5678",
            nickname = "咖啡友5678",
            points = 0,
            level = "silver",
            levelText = "银卡",
            createdAt = "2026-09-26T02:00:00.000Z",
        )
    }

    /** ApiService 全部方法均不应被直接调用（仓库方法已在子类重写） */
    private val apiStub: ApiService = Proxy.newProxyInstance(
        ApiService::class.java.classLoader,
        arrayOf(ApiService::class.java),
    ) { _, _, _ -> throw UnsupportedOperationException("测试中不应调用真实接口") } as ApiService

    private class FakeMemberRepository(
        api: ApiService,
        store: SessionStore,
        private val loginResult: ApiResult<MemberLoginDataDto> = ApiResult.Ok(
            MemberLoginDataDto(token = "token-1", member = PROFILE),
        ),
    ) : MemberRepository(api, store) {
        var loginCalls = 0
        var smsCalls = 0

        override suspend fun sendSmsCode(phone: String): ApiResult<SmsCodeDataDto> {
            smsCalls += 1
            return ApiResult.Ok(SmsCodeDataDto(phone = phone, code = "123456", message = "ok"))
        }

        override suspend fun login(phone: String, code: String): ApiResult<MemberLoginDataDto> {
            loginCalls += 1
            return loginResult
        }
    }

    private fun fakeRepo(
        loginResult: ApiResult<MemberLoginDataDto> = ApiResult.Ok(
            MemberLoginDataDto(token = "token-1", member = PROFILE),
        ),
    ) = FakeMemberRepository(
        apiStub,
        SessionStore(ApplicationProvider.getApplicationContext()),
        loginResult,
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        MemberSession.update(null)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        MemberSession.update(null)
    }

    @Test
    fun `输入被限制为 11 位手机号与 6 位验证码`() {
        val vm = LoginViewModel(fakeRepo())
        vm.onPhoneChange("13812345678999")
        vm.onCodeChange("1234567899")
        assertEquals("13812345678", vm.state.value.phone)
        assertEquals("123456", vm.state.value.code)
    }

    @Test
    fun `未同意协议不能提交`() = runTest(dispatcher) {
        val repo = fakeRepo()
        val vm = LoginViewModel(repo)
        vm.onPhoneChange("13812345678")
        vm.onCodeChange("123456")
        var success = false
        vm.login { success = true }
        advanceUntilIdle()
        assertFalse(success)
        assertEquals("请先阅读并同意用户协议与隐私政策", vm.state.value.error)
        assertEquals(0, repo.loginCalls)
    }

    @Test
    fun `登录成功后写入全局登录态`() = runTest(dispatcher) {
        val repo = fakeRepo()
        val vm = LoginViewModel(repo)
        vm.onPhoneChange("13812345678")
        vm.onCodeChange("123456")
        vm.toggleAgreed()
        var success = false
        vm.login { success = true }
        advanceUntilIdle()
        assertTrue(success)
        assertEquals(1, repo.loginCalls)
        assertTrue(MemberSession.isLoggedIn)
        assertEquals("咖啡友5678", MemberSession.profile.value?.nickname)
    }

    @Test
    fun `登录失败展示服务端中文原因`() = runTest(dispatcher) {
        val repo = fakeRepo(ApiResult.Err(ApiException(10005, "验证码错误或已过期")))
        val vm = LoginViewModel(repo)
        vm.onPhoneChange("13812345678")
        vm.onCodeChange("000000")
        vm.toggleAgreed()
        var success = false
        vm.login { success = true }
        advanceUntilIdle()
        assertFalse(success)
        assertEquals("验证码错误或已过期", vm.state.value.error)
        assertNull(MemberSession.profile.value)
    }

    @Test
    fun `获取验证码成功展示提示`() = runTest(dispatcher) {
        val repo = fakeRepo()
        val vm = LoginViewModel(repo)
        vm.onPhoneChange("13812345678")
        vm.sendCode()
        advanceUntilIdle()
        assertEquals(1, repo.smsCalls)
        assertTrue(vm.state.value.codeTip?.contains("123456") == true)
    }
}

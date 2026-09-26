package com.shanye.coffee.data

import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.dto.MemberCouponDto
import com.shanye.coffee.data.remote.dto.MemberLoginRequestDto
import com.shanye.coffee.data.remote.dto.MemberLoginDataDto
import com.shanye.coffee.data.remote.dto.MemberProfileDto
import com.shanye.coffee.data.remote.dto.PointsSummaryDto
import com.shanye.coffee.data.remote.dto.SmsCodeDataDto
import com.shanye.coffee.data.remote.dto.SmsCodeRequestDto
import com.shanye.coffee.data.remote.toApiResult
import kotlinx.serialization.json.Json

/** 会员：登录、资料、积分、优惠券 */
open class MemberRepository(
    private val api: ApiService,
    private val store: SessionStore,
) : BaseRepository(store) {

    private val json = Json { ignoreUnknownKeys = true; explicitNulls = false }

    open suspend fun sendSmsCode(phone: String): ApiResult<SmsCodeDataDto> =
        call { api.sendSmsCode(SmsCodeRequestDto(phone)).toApiResult() }

    /** 登录并持久化会话 */
    open suspend fun login(phone: String, code: String): ApiResult<MemberLoginDataDto> {
        val result = call { api.memberLogin(MemberLoginRequestDto(phone, code)).toApiResult() }
        if (result is ApiResult.Ok) {
            store.save(result.data.token, json.encodeToString(MemberProfileDto.serializer(), result.data.member))
        }
        return result
    }

    open suspend fun me(): ApiResult<MemberProfileDto> = call { api.memberMe().toApiResult() }

    open suspend fun pointsSummary(): ApiResult<PointsSummaryDto> = call { api.pointsSummary().toApiResult() }

    open suspend fun coupons(status: String? = null): ApiResult<List<MemberCouponDto>> =
        call { api.memberCoupons(status).toApiResult() }

    open suspend fun claimCoupon(id: Long): ApiResult<MemberCouponDto> = call { api.claimCoupon(id).toApiResult() }

    open suspend fun logout() {
        store.clear()
    }
}

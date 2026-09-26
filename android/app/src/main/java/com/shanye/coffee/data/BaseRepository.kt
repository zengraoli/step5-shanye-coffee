package com.shanye.coffee.data

import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiException
import java.io.IOException

/** 仓库基类：统一异常包装 + 未登录时清理会话并通知 UI */
abstract class BaseRepository(protected val sessionStore: SessionStore?) {

    protected suspend fun <T> call(block: suspend () -> ApiResult<T>): ApiResult<T> {
        val result = try {
            block()
        } catch (_: IOException) {
            ApiResult.Err(ApiException(10998, "网络异常，请检查服务是否启动"))
        } catch (e: Exception) {
            ApiResult.Err(ApiException(10999, "服务响应异常：${e.message ?: "未知错误"}"))
        }
        if (result is ApiResult.Err && result.error.code == 10002) {
            sessionStore?.clear()
            SessionBus.notifyUnauthorized()
        }
        return result
    }
}

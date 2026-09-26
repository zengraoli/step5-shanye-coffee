package com.shanye.coffee.data.remote

import com.shanye.coffee.BuildConfig
import com.shanye.coffee.data.remote.dto.ApiEnvelope
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory

/** 业务错误：服务端返回的非 0 code */
class ApiException(val code: Int, override val message: String) : Exception(message)

/** 统一调用结果 */
sealed interface ApiResult<out T> {
    data class Ok<T>(val data: T) : ApiResult<T>
    data class Err(val error: ApiException) : ApiResult<Nothing>
}

private val lenientJson = Json { ignoreUnknownKeys = true; coerceInputValues = true }

/**
 * 解包统一响应。HTTP 层失败时尝试解析错误体中的业务 code / message。
 */
fun <T> retrofit2.Response<ApiEnvelope<T>>.toApiResult(): ApiResult<T> {
    val envelope = body()
    if (isSuccessful && envelope != null && envelope.code == 0 && envelope.data != null) {
        return ApiResult.Ok(envelope.data)
    }
    val fallbackMessage = envelope?.message ?: "服务响应异常（HTTP ${code()}）"
    val parsed = errorBody()?.string()?.let { raw ->
        runCatching {
            val element = lenientJson.parseToJsonElement(raw).jsonObject
            val code = element["code"]?.jsonPrimitive?.intOrNull
            val message = element["message"]?.jsonPrimitive?.content
            ApiException(code ?: code(), message ?: fallbackMessage)
        }.getOrNull()
    }
    return ApiResult.Err(parsed ?: ApiException(envelope?.code ?: code(), fallbackMessage))
}

/** 网络层客户端（Retrofit + OkHttp + kotlinx.serialization） */
object ApiClient {

    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }

    fun createService(tokenProvider: () -> String?): ApiService {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC else HttpLoggingInterceptor.Level.NONE
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenProvider))
            .addInterceptor(logging)
            .connectTimeout(java.time.Duration.ofSeconds(10))
            .readTimeout(java.time.Duration.ofSeconds(15))
            .build()
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(ApiService::class.java)
    }
}

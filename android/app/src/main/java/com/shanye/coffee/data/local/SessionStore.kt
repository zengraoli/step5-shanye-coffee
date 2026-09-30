package com.shanye.coffee.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import com.shanye.coffee.data.remote.dto.MemberProfileDto

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "shanye_session")

/** 登录态本地存储（DataStore） */
class SessionStore(private val context: Context) {

    private val tokenKey = stringPreferencesKey("member_token")
    private val profileKey = stringPreferencesKey("member_profile")

    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[tokenKey] }

    val profileJsonFlow: Flow<String?> = context.dataStore.data.map { it[profileKey] }

    /** 同步读取 token（OkHttp 拦截器用） */
    fun currentToken(): String? = runBlocking { tokenFlow.first() }

    suspend fun save(token: String, profileJson: String) {
        context.dataStore.edit { preferences ->
            preferences[tokenKey] = token
            preferences[profileKey] = profileJson
        }
    }

    suspend fun updateProfile(profileJson: String) {
        context.dataStore.edit { preferences ->
            preferences[profileKey] = profileJson
        }
    }

    /** 读取本地登录态对应的会员资料；没有或解析失败返回 null */
    suspend fun restore(): MemberProfileDto? {
        val json = profileJsonFlow.first() ?: return null
        return runCatching {
            kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
                .decodeFromString<MemberProfileDto>(json)
        }.getOrNull()
    }

    suspend fun clear() {
        context.dataStore.edit { preferences ->
            preferences.remove(tokenKey)
            preferences.remove(profileKey)
        }
    }
}

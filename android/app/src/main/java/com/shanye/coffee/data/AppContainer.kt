package com.shanye.coffee.data

import android.content.Context
import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.ApiClient

/** 依赖容器（简单的服务定位器） */
class AppContainer(context: Context) {

    val sessionStore: SessionStore = SessionStore(context)

    val api: ApiService by lazy {
        ApiClient.createService { sessionStore.currentToken() }
    }

    val memberRepository: MemberRepository by lazy { MemberRepository(api, sessionStore) }
    val catalogRepository: CatalogRepository by lazy { CatalogRepository(api, sessionStore) }
    val orderRepository: OrderRepository by lazy { OrderRepository(api, sessionStore) }
}

package com.shanye.coffee.data

import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.dto.CategoryDto
import com.shanye.coffee.data.remote.dto.ProductListDto
import com.shanye.coffee.data.remote.dto.PromoStateDto
import com.shanye.coffee.data.remote.dto.StoreDto
import com.shanye.coffee.data.remote.toApiResult

/** 门店 / 商品 / 活动 */
class CatalogRepository(
    private val api: ApiService,
    sessionStore: SessionStore?,
) : BaseRepository(sessionStore) {

    suspend fun stores(): ApiResult<List<StoreDto>> = call { api.stores().toApiResult() }

    suspend fun categories(): ApiResult<List<CategoryDto>> = call { api.categories().toApiResult() }

    suspend fun products(
        categoryId: Long? = null,
        keyword: String? = null,
        page: Int = 1,
        pageSize: Int = 60,
    ): ApiResult<ProductListDto> = call { api.products(categoryId, keyword, page, pageSize).toApiResult() }

    suspend fun promo(): ApiResult<PromoStateDto> = call { api.promo().toApiResult() }
}

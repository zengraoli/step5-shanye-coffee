package com.shanye.coffee.data

import com.shanye.coffee.data.local.SessionStore
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.ApiService
import com.shanye.coffee.data.remote.dto.CategoryDto
import com.shanye.coffee.data.remote.dto.CouponTemplateDto
import com.shanye.coffee.data.remote.dto.ProductListDto
import com.shanye.coffee.data.remote.dto.PromoStateDto
import com.shanye.coffee.data.remote.dto.StoreDto
import com.shanye.coffee.data.remote.toApiResult

/** 门店 / 商品 / 活动 */
open class CatalogRepository(
    private val api: ApiService,
    sessionStore: SessionStore?,
) : BaseRepository(sessionStore) {

    open suspend fun stores(): ApiResult<List<StoreDto>> = call { api.stores().toApiResult() }

    open suspend fun categories(): ApiResult<List<CategoryDto>> = call { api.categories().toApiResult() }

    open suspend fun products(
        categoryId: Long? = null,
        keyword: String? = null,
        page: Int = 1,
        pageSize: Int = 60,
        storeId: Long? = null,
    ): ApiResult<ProductListDto> = call { api.products(categoryId, keyword, storeId, page, pageSize).toApiResult() }

    /** 可领取的券模板 */
    suspend fun couponTemplates(): ApiResult<List<CouponTemplateDto>> = call { api.couponTemplates().toApiResult() }

    open suspend fun promo(): ApiResult<PromoStateDto> = call { api.promo().toApiResult() }
}

package com.shanye.coffee.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shanye.coffee.data.CartStore
import com.shanye.coffee.data.CatalogRepository
import com.shanye.coffee.data.MemberSession
import com.shanye.coffee.data.OrderSession
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.dto.ProductDto
import com.shanye.coffee.data.remote.dto.PromoActivityDto
import com.shanye.coffee.data.remote.dto.StoreDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HomeUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val stores: List<StoreDto> = emptyList(),
    val currentStore: StoreDto? = null,
    val promo: PromoActivityDto? = null,
    val featured: List<ProductDto> = emptyList(),
    val storePickerOpen: Boolean = false,
    val loggedIn: Boolean = false,
)

class HomeViewModel(private val catalogRepository: CatalogRepository) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            MemberSession.profile.collect {
                _state.update { state -> state.copy(loggedIn = it != null) }
            }
        }
        load()
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val storesResult = catalogRepository.stores()
            val promoResult = catalogRepository.promo()
            val productsResult = catalogRepository.products(pageSize = 60)
            if (storesResult is ApiResult.Ok && productsResult is ApiResult.Ok) {
                val stores = storesResult.data
                val promo = (promoResult as? ApiResult.Ok)?.data?.activity
                val activePromo = if ((promoResult as? ApiResult.Ok)?.data?.active == true) promo else null
                CartStore.setPromoProducts(activePromo?.productIds ?: emptyList())
                val current = OrderSession.store.value
                    ?: stores.firstOrNull { it.status == "open" }
                    ?: stores.firstOrNull()
                if (current != null) {
                    OrderSession.selectStore(current)
                }
                _state.update {
                    it.copy(
                        loading = false,
                        error = null,
                        stores = stores,
                        currentStore = current,
                        promo = activePromo,
                        featured = pickFeatured(productsResult.data.list),
                        loggedIn = MemberSession.isLoggedIn,
                    )
                }
            } else {
                val message = when {
                    storesResult is ApiResult.Err -> storesResult.error.message
                    productsResult is ApiResult.Err -> productsResult.error.message
                    else -> "加载失败，请稍后重试"
                }
                _state.update { it.copy(loading = false, error = message) }
            }
        }
    }

    fun openStorePicker() {
        _state.update { it.copy(storePickerOpen = true) }
    }

    fun closeStorePicker() {
        _state.update { it.copy(storePickerOpen = false) }
    }

    fun selectStore(store: StoreDto) {
        OrderSession.selectStore(store)
        _state.update { it.copy(currentStore = store, storePickerOpen = false) }
    }
}

/** 当季推荐：优先“招牌 / 限定 / 人气 / 新品”，补足 6 个 */
internal fun pickFeatured(list: List<ProductDto>): List<ProductDto> {
    val tags = listOf("招牌", "限定", "人气", "新品")
    val preferred = list.filter { product -> tags.any { tag -> product.subtitle.contains(tag) } }
    val rest = list.filter { product -> !preferred.contains(product) }
    return (preferred + rest).take(6)
}

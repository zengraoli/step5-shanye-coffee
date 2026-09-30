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
    val searchOpen: Boolean = false,
    val refreshing: Boolean = false,
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

    /** 下拉刷新 / 重试：重新拉门店（营业状态）与商品 */
    fun refresh() {
        _state.update { it.copy(refreshing = true, error = null) }
        viewModelScope.launch {
            loadInternal()
            _state.update { it.copy(refreshing = false) }
        }
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            loadInternal()
        }
    }

    private suspend fun loadInternal() {
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
                        featured = pickFeatured(productsResult.data.list, storeId = current?.id),
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

    fun openStorePicker() {
        _state.update { it.copy(storePickerOpen = true) }
    }

    fun closeStorePicker() {
        _state.update { it.copy(storePickerOpen = false) }
    }

    fun selectStore(store: StoreDto) {
        OrderSession.selectStore(store)
        _state.update { it.copy(currentStore = store, storePickerOpen = false) }
        // 换门店后按新门店口径刷新商品（售罄状态会变）
        viewModelScope.launch {
            val productsResult = catalogRepository.products(pageSize = 60, storeId = store.id)
            if (productsResult is ApiResult.Ok) {
                _state.update {
                    it.copy(featured = pickFeatured(productsResult.data.list, storeId = store.id))
                }
            }
        }
    }

    fun openSearch() {
        _state.update { it.copy(searchOpen = true) }
    }

    fun closeSearch() {
        _state.update { it.copy(searchOpen = false) }
    }
}

/** 当季推荐：优先“招牌 / 限定 / 人气 / 新品”，过滤已售罄商品，补足 6 个 */
internal fun pickFeatured(list: List<ProductDto>, storeId: Long? = null): List<ProductDto> {
    val tags = listOf("招牌", "限定", "人气", "新品")
    val available = list.filter { product -> !product.soldOut && product.onSale }
    val preferred = available.filter { product -> tags.any { tag -> product.subtitle.contains(tag) } }
    val rest = available.filter { product -> !preferred.contains(product) }
    return (preferred + rest).take(6)
}

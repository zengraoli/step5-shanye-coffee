package com.shanye.coffee.ui.order

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.shanye.coffee.data.CartLine
import com.shanye.coffee.data.CartStore
import com.shanye.coffee.data.CatalogRepository
import com.shanye.coffee.data.OrderSession
import com.shanye.coffee.data.defaultSpecSelection
import com.shanye.coffee.data.remote.ApiResult
import com.shanye.coffee.data.remote.dto.CategoryDto
import com.shanye.coffee.data.remote.dto.ProductDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class OrderUiState(
    val loading: Boolean = true,
    val error: String? = null,
    val categories: List<CategoryDto> = emptyList(),
    val products: List<ProductDto> = emptyList(),
    val activeCategoryId: Long? = null,
    val orderType: String = OrderSession.ORDER_TYPE_TAKEOUT,
    val promoProductIds: Set<Long> = emptySet(),
    val specProduct: ProductDto? = null,
    val specSelection: Map<String, String> = emptyMap(),
    val cartLines: List<CartLine> = emptyList(),
    val cartCount: Int = 0,
    val cartTotalFen: Int = 0,
    val cartPayableFen: Int = 0,
    val promoDiscountFen: Int = 0,
    val cartExpanded: Boolean = false,
) {
    val visibleProducts: List<ProductDto>
        get() = if (activeCategoryId == null) products else products.filter { it.categoryId == activeCategoryId }
}

class OrderViewModel(private val catalogRepository: CatalogRepository) : ViewModel() {

    private val _state = MutableStateFlow(OrderUiState())
    val state: StateFlow<OrderUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            CartStore.lines.collect { lines ->
                _state.update {
                    it.copy(
                        cartLines = lines,
                        cartCount = CartStore.totalCount,
                        cartTotalFen = CartStore.totalFen,
                        cartPayableFen = CartStore.payableFen,
                        promoDiscountFen = CartStore.promoDiscountFen(),
                    )
                }
            }
        }
        viewModelScope.launch {
            CartStore.promoProductIds.collect { ids ->
                _state.update { it.copy(promoProductIds = ids) }
            }
        }
        load()
    }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val categoriesResult = catalogRepository.categories()
            val productsResult = catalogRepository.products(pageSize = 60)
            val promoResult = catalogRepository.promo()
            if (categoriesResult is ApiResult.Ok && productsResult is ApiResult.Ok) {
                val promo = (promoResult as? ApiResult.Ok)?.data
                val activePromo = if (promo?.active == true) promo.activity else null
                CartStore.setPromoProducts(activePromo?.productIds ?: emptyList())
                _state.update {
                    it.copy(
                        loading = false,
                        error = null,
                        categories = categoriesResult.data,
                        products = productsResult.data.list,
                        activeCategoryId = categoriesResult.data.firstOrNull()?.id,
                        promoProductIds = activePromo?.productIds?.toSet() ?: emptySet(),
                    )
                }
            } else {
                val message = when {
                    categoriesResult is ApiResult.Err -> categoriesResult.error.message
                    productsResult is ApiResult.Err -> productsResult.error.message
                    else -> "加载失败，请稍后重试"
                }
                _state.update { it.copy(loading = false, error = message) }
            }
        }
    }

    fun selectCategory(id: Long) {
        _state.update { it.copy(activeCategoryId = id) }
    }

    fun setOrderType(type: String) {
        OrderSession.setOrderType(type)
        _state.update { it.copy(orderType = type) }
    }

    /** 打开规格弹窗 */
    fun openSpec(product: ProductDto) {
        _state.update {
            it.copy(
                specProduct = product,
                specSelection = defaultSpecSelection(product.specs),
            )
        }
    }

    fun closeSpec() {
        _state.update { it.copy(specProduct = null) }
    }

    fun selectSpecOption(groupKey: String, value: String) {
        _state.update { it.copy(specSelection = it.specSelection + (groupKey to value)) }
    }

    /** 加入购物车 */
    fun confirmSpec() {
        val state = _state.value
        val product = state.specProduct ?: return
        val specText = product.specs.mapNotNull { group ->
            group.options.find { it.value == state.specSelection[group.key] }?.label
        }.joinToString(" / ")
        val unitPrice = product.basePrice + product.specs.sumOf { group ->
            group.options.find { it.value == state.specSelection[group.key] }?.extra ?: 0
        }
        CartStore.add(
            CartLine(
                productId = product.id,
                productName = product.name,
                categoryName = product.categoryName,
                spec = state.specSelection,
                specText = specText,
                unitPrice = unitPrice,
                quantity = 1,
            ),
        )
        _state.update { it.copy(specProduct = null) }
    }

    fun setCartQuantity(index: Int, quantity: Int) {
        CartStore.setQuantity(index, quantity)
    }

    fun toggleCartExpanded() {
        _state.update { it.copy(cartExpanded = !it.cartExpanded) }
    }

    fun clearCart() {
        CartStore.clear()
        _state.update { it.copy(cartExpanded = false) }
    }
}

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
import com.shanye.coffee.data.remote.dto.StoreDto
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
    val currentStore: StoreDto? = null,
    val stores: List<StoreDto> = emptyList(),
    val storePickerOpen: Boolean = false,
) {
    val visibleProducts: List<ProductDto>
        get() = if (activeCategoryId == null) products else products.filter { it.categoryId == activeCategoryId }
}

class OrderViewModel(
    private val catalogRepository: CatalogRepository,
    /** 首页点“+”带过来的商品 id：进入页面即打开对应规格弹窗 */
    private val focusProductId: Long = 0L,
) : ViewModel() {

    private val _state = MutableStateFlow(OrderUiState())
    val state: StateFlow<OrderUiState> = _state.asStateFlow()

    init {
        // 取餐方式：与首页 / 结算共用 OrderSession，切换后实时同步
        viewModelScope.launch {
            OrderSession.orderType.collect { type ->
                if (_state.value.orderType != type) {
                    _state.update { it.copy(orderType = type) }
                }
            }
        }
        _state.update { it.copy(orderType = OrderSession.orderType.value) }
        // 当前门店：首页选择后点单页同步
        viewModelScope.launch {
            OrderSession.store.collect { store ->
                _state.update { it.copy(currentStore = store) }
            }
        }
        _state.update { it.copy(currentStore = OrderSession.store.value) }
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
            // 按当前门店取商品，售罄状态才是本店口径
            val storeId = OrderSession.store.value?.id
            val categoriesResult = catalogRepository.categories()
            val productsResult = catalogRepository.products(pageSize = 60, storeId = storeId)
            val promoResult = catalogRepository.promo()
            val stores = (catalogRepository.stores() as? ApiResult.Ok)?.data ?: _state.value.stores
            if (categoriesResult is ApiResult.Ok && productsResult is ApiResult.Ok) {
                val promo = (promoResult as? ApiResult.Ok)?.data
                val activePromo = if (promo?.active == true) promo.activity else null
                CartStore.setPromoProducts(activePromo?.productIds ?: emptyList())
                _state.update {
                    it.copy(
                        loading = false,
                        error = null,
                        categories = categoriesResult.data,
                        stores = stores,
                        products = productsResult.data.list,
                        activeCategoryId = categoriesResult.data.firstOrNull()?.id,
                        promoProductIds = activePromo?.productIds?.toSet() ?: emptySet(),
                    )
                }
                // 首页带过来的商品：直接打开规格弹窗；无规格商品（轻食 / 周边）也要能加购
                if (focusProductId != 0L) {
                    val target = productsResult.data.list.firstOrNull { it.id == focusProductId }
                    if (target != null) {
                        if (target.specs.isEmpty()) {
                            addToCart(target, emptyMap())
                        } else {
                            openSpec(target)
                        }
                    }
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

    /** 直接加入购物车（无规格商品，如轻食 / 周边） */
    private fun addToCart(product: ProductDto, spec: Map<String, String>) {
        val unitPrice = product.basePrice + product.specs.sumOf { group ->
            group.options.find { it.value == spec[group.key] }?.extra ?: 0
        }
        val specText = product.specs.mapNotNull { group ->
            group.options.find { it.value == spec[group.key] }?.label
        }.ifEmpty { listOf("标准装") }.joinToString(" / ")
        CartStore.add(
            CartLine(
                productId = product.id,
                productName = product.name,
                categoryName = product.categoryName,
                spec = spec,
                specText = specText,
                unitPrice = unitPrice,
                quantity = 1,
            ),
        )
    }

    /**
     * 打开规格弹窗。
     * 无规格商品（轻食 / 周边等，服务端不下发规格组）直接加入购物车，不再要求选杯型温度糖度。
     */
    fun openSpec(product: ProductDto) {
        if (product.specs.isEmpty()) {
            addToCart(product, emptyMap())
            return
        }
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
        addToCart(product, state.specSelection)
        _state.update { it.copy(specProduct = null, cartExpanded = true) }
    }

    fun setCartQuantity(index: Int, quantity: Int) {
        CartStore.setQuantity(index, quantity)
    }

    fun toggleCartExpanded() {
        _state.update { it.copy(cartExpanded = !it.cartExpanded) }
    }

    /** 打开 / 关闭门店选择；换门店后重新拉商品（售罄按门店） */
    fun openStorePicker() {
        _state.update { it.copy(storePickerOpen = true) }
    }

    fun closeStorePicker() {
        _state.update { it.copy(storePickerOpen = false) }
    }

    fun selectStore(store: StoreDto) {
        OrderSession.selectStore(store)
        _state.update { it.copy(currentStore = store, storePickerOpen = false) }
        load()
    }

    fun clearCart() {
        CartStore.clear()
        _state.update { it.copy(cartExpanded = false) }
    }
}

package com.shanye.coffee.ui

import androidx.compose.runtime.staticCompositionLocalOf
import com.shanye.coffee.data.AppContainer

/** 依赖容器（由 MainActivity 提供） */
val LocalAppContainer = staticCompositionLocalOf<AppContainer> {
    error("AppContainer 未提供")
}

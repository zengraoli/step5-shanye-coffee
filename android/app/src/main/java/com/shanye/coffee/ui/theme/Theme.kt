package com.shanye.coffee.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val ShanyeColorScheme = lightColorScheme(
    primary = BrandGreen,
    onPrimary = TextOnDark,
    primaryContainer = BrandGreenContainer,
    onPrimaryContainer = BrandGreenDark,
    secondary = Terracotta,
    onSecondary = TextOnDark,
    secondaryContainer = TerracottaContainer,
    onSecondaryContainer = TerracottaDark,
    tertiary = Tan,
    onTertiary = TextPrimary,
    background = CreamBackground,
    onBackground = TextPrimary,
    surface = CreamCard,
    onSurface = TextPrimary,
    surfaceVariant = CreamMuted,
    onSurfaceVariant = TextSecondary,
    outline = Outline,
    outlineVariant = Outline,
    error = Danger,
    onError = TextOnDark,
)

@Composable
fun ShanyeCoffeeTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    // 设计稿为浅色米白底，暂不提供深色主题
    val colorScheme = ShanyeColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }
    MaterialTheme(
        colorScheme = colorScheme,
        typography = ShanyeTypography,
        shapes = ShanyeShapes,
        content = content,
    )
}

/** 供预览使用 */
@Composable
fun ShanyeCoffeePreviewTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ShanyeColorScheme,
        typography = ShanyeTypography,
        shapes = ShanyeShapes,
        content = content,
    )
}

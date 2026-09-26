package com.shanye.coffee.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * 商品插画：自绘咖啡杯（杯身 + 饮品分层 + 热气 + 把手）。
 * 背景色按分类区分，不引用任何外部图片。
 */
@Composable
fun ProductCupArt(
    modifier: Modifier = Modifier,
    size: Dp = 72.dp,
    cupColor: Color = Color(0xFFFFFDF8),
    outlineColor: Color = Color(0xFF4A3728),
    drinkColor: Color = Color(0xFFC89B6A),
    bandColor: Color = Color(0xFFE9B872),
) {
    Canvas(modifier = modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val cupW = w * 0.46f
        val cupH = h * 0.44f
        val left = (w - cupW) / 2f
        val top = h * 0.3f
        val radius = CornerRadius(cupW * 0.14f, cupW * 0.14f)

        // 把手
        drawArc(
            color = outlineColor,
            startAngle = -80f,
            sweepAngle = 200f,
            useCenter = false,
            topLeft = Offset(left + cupW - cupW * 0.08f, top + cupH * 0.16f),
            size = Size(cupW * 0.42f, cupH * 0.5f),
            style = Stroke(width = cupW * 0.09f),
        )
        // 杯身
        drawRoundRect(
            color = cupColor,
            topLeft = Offset(left, top),
            size = Size(cupW, cupH),
            cornerRadius = radius,
        )
        drawRoundRect(
            color = outlineColor,
            topLeft = Offset(left, top),
            size = Size(cupW, cupH),
            cornerRadius = radius,
            style = Stroke(width = cupW * 0.055f),
        )
        // 饮品分层
        drawRoundRect(
            color = drinkColor,
            topLeft = Offset(left + cupW * 0.1f, top + cupH * 0.42f),
            size = Size(cupW * 0.8f, cupH * 0.42f),
            cornerRadius = CornerRadius(cupW * 0.06f, cupW * 0.06f),
        )
        // 杯套
        drawRoundRect(
            color = bandColor,
            topLeft = Offset(left, top + cupH * 0.26f),
            size = Size(cupW, cupH * 0.2f),
            cornerRadius = CornerRadius(0f, 0f),
        )
        // 热气
        val steam = Stroke(width = cupW * 0.05f)
        for (i in 0..2) {
            val cx = left + cupW * (0.28f + i * 0.22f)
            val y0 = top - h * 0.06f
            drawArc(
                color = bandColor,
                startAngle = 200f,
                sweepAngle = 210f,
                useCenter = false,
                topLeft = Offset(cx - cupW * 0.1f, y0 - h * 0.1f),
                size = Size(cupW * 0.2f, h * 0.14f),
                style = steam,
            )
        }
    }
}

/** 分类插画底色（与设计稿一致：咖啡米黄、茶饮浅绿、轻食杏色、周边灰绿） */
fun categoryArtColors(categoryName: String): Pair<Color, Color> = when (categoryName) {
    "咖啡" -> Color(0xFFF3E7CD) to Color(0xFFC89B6A)
    "茶饮" -> Color(0xFFE6EDDF) to Color(0xFF7D9B6A)
    "轻食" -> Color(0xFFF7E8D5) to Color(0xFFD9A66B)
    else -> Color(0xFFECE4D6) to Color(0xFF8A8578)
}

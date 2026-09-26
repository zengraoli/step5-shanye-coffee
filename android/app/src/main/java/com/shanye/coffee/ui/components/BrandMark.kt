package com.shanye.coffee.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.shanye.coffee.ui.theme.BrandGreen
import com.shanye.coffee.ui.theme.CreamBackground
import com.shanye.coffee.ui.theme.Tan

/**
 * 品牌标识：自绘 SVG 风格图形（深绿圆底 + 山形 + 太阳）。
 * 不使用任何外部图片资源。
 */
@Composable
fun BrandMark(
    modifier: Modifier = Modifier,
    size: Dp = 40.dp,
    circleColor: Color = BrandGreen,
    inkColor: Color = CreamBackground,
    sunColor: Color = Tan,
) {
    Canvas(modifier = modifier.size(size)) {
        val radius = this.size.minDimension / 2f
        val center = Offset(this.size.width / 2f, this.size.height / 2f)
        drawCircle(color = circleColor, radius = radius, center = center)

        val unit = radius / 20f
        // 太阳
        drawCircle(
            color = sunColor,
            radius = 3.2f * unit,
            center = Offset(center.x + 5.2f * unit, center.y - 5.2f * unit),
        )
        // 山形（两座山峰）
        val mountain = Path().apply {
            moveTo(center.x - 8.5f * unit, center.y + 4.5f * unit)
            lineTo(center.x - 3.2f * unit, center.y - 4.2f * unit)
            lineTo(center.x + 1.2f * unit, center.y + 1.4f * unit)
            lineTo(center.x + 4.6f * unit, center.y - 2.6f * unit)
            lineTo(center.x + 9.2f * unit, center.y + 4.5f * unit)
            close()
        }
        drawPath(path = mountain, color = inkColor)
        // 杯底线
        drawRect(
            color = sunColor,
            topLeft = Offset(center.x - 5.4f * unit, center.y + 7.4f * unit),
            size = Size(10.8f * unit, 1.3f * unit),
        )
    }
}

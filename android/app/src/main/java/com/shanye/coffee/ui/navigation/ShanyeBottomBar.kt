package com.shanye.coffee.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.LocalCafe
import androidx.compose.material.icons.filled.LocalCafe
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState
import com.shanye.coffee.ui.theme.BrandGreen
import com.shanye.coffee.ui.theme.BrandGreenContainer
import com.shanye.coffee.ui.theme.CreamBackground
import com.shanye.coffee.ui.theme.TextSecondary

/** 底部导航（与设计稿一致：选中态为浅绿胶囊） */
@Composable
fun ShanyeBottomBar(navController: NavHostController) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val destination = backStackEntry?.destination

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(CreamBackground)
            .navigationBarsPadding()
            .height(64.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TopLevelTab.entries.forEach { tab ->
            val selected = destination?.hierarchy?.any { it.route == tab.route } == true
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(if (selected) BrandGreenContainer else CreamBackground)
                    .padding(horizontal = 18.dp, vertical = 6.dp),
            ) {
                Icon(
                    imageVector = tab.icon(selected),
                    contentDescription = tab.label,
                    tint = if (selected) BrandGreen else TextSecondary,
                    modifier = Modifier.size(24.dp),
                )
                Text(
                    text = tab.label,
                    style = MaterialTheme.typography.labelMedium,
                    color = if (selected) BrandGreen else TextSecondary,
                )
            }
        }
    }
}

private fun TopLevelTab.icon(selected: Boolean): ImageVector = when (this) {
    TopLevelTab.HOME -> if (selected) Icons.Filled.Home else Icons.Outlined.Home
    TopLevelTab.ORDER -> if (selected) Icons.Filled.LocalCafe else Icons.Outlined.LocalCafe
    TopLevelTab.ORDERS -> if (selected) Icons.Filled.ReceiptLong else Icons.Outlined.ReceiptLong
    TopLevelTab.PROFILE -> if (selected) Icons.Filled.Person else Icons.Outlined.Person
}

/** 顶部导航条占位（内容区留白） */
@Composable
fun BottomBarSpacer() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .height(64.dp),
    )
}

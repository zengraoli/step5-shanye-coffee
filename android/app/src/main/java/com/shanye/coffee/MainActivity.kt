package com.shanye.coffee

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.compose.rememberNavController
import com.shanye.coffee.data.SessionBus
import com.shanye.coffee.ui.navigation.Routes
import com.shanye.coffee.ui.navigation.ShanyeApp
import com.shanye.coffee.ui.navigation.ShanyeNavigator
import com.shanye.coffee.ui.LocalAppContainer
import com.shanye.coffee.ui.theme.ShanyeCoffeeTheme
import androidx.compose.runtime.CompositionLocalProvider

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ShanyeCoffeeTheme {
                val navController = rememberNavController()
                ShanyeNavigator.bind(navController)

                // 登录态失效时统一跳转登录页
                LaunchedEffect(Unit) {
                    SessionBus.unauthorized.collect {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.HOME) { inclusive = false }
                            launchSingleTop = true
                        }
                    }
                }

                CompositionLocalProvider(LocalAppContainer provides (application as ShanyeApplication).container) {
                    ShanyeApp()
                }
            }
        }
    }
}

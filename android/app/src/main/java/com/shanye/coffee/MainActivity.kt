package com.shanye.coffee

import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.runtime.CompositionLocalProvider
import com.shanye.coffee.ui.LocalAppContainer
import com.shanye.coffee.ui.navigation.ShanyeApp
import com.shanye.coffee.ui.theme.ShanyeCoffeeTheme

class MainActivity : androidx.activity.ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 冷启动深链：先记下日志，交给导航层在建图后消费
        handleDeepLink(intent)
        setContent {
            ShanyeCoffeeTheme {
                CompositionLocalProvider(
                    LocalAppContainer provides (application as ShanyeApplication).container,
                ) {
                    ShanyeApp()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val uri = intent?.data?.toString() ?: return
        DeepLinkBus.emit(uri)
    }
}

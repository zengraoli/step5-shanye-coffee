package com.shanye.coffee.ui

import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.net.toUri
import androidx.test.core.app.ApplicationProvider
import com.shanye.coffee.MainActivity
import com.shanye.coffee.ui.navigation.Routes
import com.shanye.coffee.ui.navigation.TopLevelTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * deep link：shanye://<页面> 由系统解析到 MainActivity，并由 Navigation 打开对应页面。
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class DeepLinkTest {

    private val context get() = ApplicationProvider.getApplicationContext<android.content.Context>()

    @Test
    fun `每个 Tab 的 deep link 与路由一致`() {
        for (tab in TopLevelTab.entries) {
            assertEquals("shanye://${tab.route}", tab.deepLink)
        }
        // 其余页面
        assertEquals("shanye://login", "shanye://${Routes.LOGIN}")
        assertEquals("shanye://checkout", "shanye://${Routes.CHECKOUT}")
    }

    @Test
    fun `系统可将 shanye deep link 解析到 MainActivity`() {
        val uris = listOf(
            "shanye://login",
            "shanye://home",
            "shanye://order",
            "shanye://checkout",
            "shanye://orders",
            "shanye://profile",
        )
        for (uri in uris) {
            val intent = Intent(Intent.ACTION_VIEW, uri.toUri())
            val resolved = context.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
            assertNotNull("应能解析: $uri", resolved)
            assertEquals(
                "应跳转到 MainActivity: $uri",
                ComponentName(context, MainActivity::class.java).className,
                resolved?.activityInfo?.name,
            )
        }
    }

    @Test
    fun `未知 scheme 不会解析到本应用`() {
        val intent = Intent(Intent.ACTION_VIEW, "https://example.com".toUri())
        val resolved = context.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
        val isOurs = resolved?.activityInfo?.name == MainActivity::class.java.name
        assertEquals(false, isOurs)
    }
}

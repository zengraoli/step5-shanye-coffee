package com.shanye.coffee

import android.app.Application
import com.shanye.coffee.data.AppContainer

class ShanyeApplication : Application() {

    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}

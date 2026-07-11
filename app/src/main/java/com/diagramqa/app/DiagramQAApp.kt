package com.diagramqa.app

import android.app.Application
import android.content.Context
import androidx.appcompat.app.AppCompatDelegate
import com.diagramqa.app.data.local.AppDatabase
import com.diagramqa.app.data.remote.ApiClient
import com.diagramqa.app.data.repository.DiagramRepository
import com.diagramqa.app.util.NetworkMonitor
import com.diagramqa.app.util.PreferencesManager

/**
 * Application class. Wires up singletons (DB, repository, API client, network monitor)
 * and applies saved theme preference at startup.
 */
class DiagramQAApp : Application() {

    val database: AppDatabase by lazy { AppDatabase.getInstance(this) }
    val repository: DiagramRepository by lazy {
        DiagramRepository(database, ApiClient.create(BuildConfig.BASE_URL))
    }
    val preferences: PreferencesManager by lazy { PreferencesManager(this) }
    val networkMonitor: NetworkMonitor by lazy { NetworkMonitor(this) }

    override fun onCreate() {
        super.onCreate()
        instance = this
        applyTheme(preferences.darkMode)
    }

    private fun applyTheme(mode: Int) {
        AppCompatDelegate.setDefaultNightMode(
            when (mode) {
                PreferencesManager.DARK_MODE_ON -> AppCompatDelegate.MODE_NIGHT_YES
                PreferencesManager.DARK_MODE_OFF -> AppCompatDelegate.MODE_NIGHT_NO
                else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
            }
        )
    }

    companion object {
        @Volatile
        private var instance: DiagramQAApp? = null

        fun get(context: Context): DiagramQAApp =
            instance ?: (context.applicationContext as DiagramQAApp)

        fun get(): DiagramQAApp = instance!!
    }
}

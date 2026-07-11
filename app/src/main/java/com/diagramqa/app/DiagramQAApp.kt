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
    val preferences: PreferencesManager by lazy { PreferencesManager(this) }
    val networkMonitor: NetworkMonitor by lazy { NetworkMonitor(this) }
    val repository: DiagramRepository by lazy {
        DiagramRepository(database, ApiClient.create(BuildConfig.BASE_URL), networkMonitor)
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                val sw = java.io.StringWriter()
                val pw = java.io.PrintWriter(sw)
                throwable.printStackTrace(pw)
                val stackTraceString = sw.toString()

                val file = java.io.File(filesDir, "crash_report.txt")
                file.writeText(stackTraceString)
            } catch (_: Exception) {}

            defaultHandler?.uncaughtException(thread, throwable)
        }

    }

    companion object {
        @Volatile
        private var instance: DiagramQAApp? = null

        fun get(context: Context): DiagramQAApp =
            instance ?: (context.applicationContext as DiagramQAApp)

        fun get(): DiagramQAApp = instance!!
    }
}

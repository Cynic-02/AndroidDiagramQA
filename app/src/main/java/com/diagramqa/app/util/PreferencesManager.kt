package com.diagramqa.app.util

import android.content.Context
import android.content.SharedPreferences

/**
 * Persistent app preferences backed by SharedPreferences.
 *
 * Stored values:
 *  - dark_mode: 0 = follow system, 1 = on, 2 = off
 *  - animations_enabled: Boolean
 *  - haptics_enabled: Boolean
 */
class PreferencesManager(context: Context) {

    private val sharedPrefs: SharedPreferences = 
        context.applicationContext.getSharedPreferences("diagramqa_prefs", Context.MODE_PRIVATE)

    suspend fun setDarkMode(mode: Int) {
        sharedPrefs.edit().putInt(KEY_DARK_MODE, mode).apply()
    }

    val darkMode: Int
        get() = sharedPrefs.getInt(KEY_DARK_MODE, DARK_MODE_SYSTEM)

    suspend fun setAnimationsEnabled(enabled: Boolean) {
        sharedPrefs.edit().putBoolean(KEY_ANIMATIONS, enabled).apply()
    }

    val animationsEnabled: Boolean
        get() = sharedPrefs.getBoolean(KEY_ANIMATIONS, true)

    suspend fun setHapticsEnabled(enabled: Boolean) {
        sharedPrefs.edit().putBoolean(KEY_HAPTICS, enabled).apply()
    }

    val hapticsEnabled: Boolean
        get() = sharedPrefs.getBoolean(KEY_HAPTICS, true)

    companion object {
        const val DARK_MODE_SYSTEM = 0
        const val DARK_MODE_ON = 1
        const val DARK_MODE_OFF = 2

        private const val KEY_DARK_MODE = "dark_mode"
        private const val KEY_ANIMATIONS = "animations_enabled"
        private const val KEY_HAPTICS = "haptics_enabled"
    }
}


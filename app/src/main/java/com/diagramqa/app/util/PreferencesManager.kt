package com.diagramqa.app.util

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

private val Context.dataStore by preferencesDataStore(name = "diagramqa_prefs")

/**
 * Persistent app preferences backed by Jetpack DataStore.
 *
 * Stored values:
 *  - dark_mode: 0 = follow system, 1 = on, 2 = off
 *  - animations_enabled: Boolean
 *  - haptics_enabled: Boolean
 */
class PreferencesManager(private val context: Context) {

    suspend fun setDarkMode(mode: Int) {
        context.dataStore.edit { it[DARK_MODE] = mode }
    }

    val darkMode: Int
        get() = runBlocking {
            context.dataStore.data.map { it[DARK_MODE] ?: DARK_MODE_SYSTEM }.first()
        }

    suspend fun setAnimationsEnabled(enabled: Boolean) {
        context.dataStore.edit { it[ANIMATIONS] = enabled }
    }

    val animationsEnabled: Boolean
        get() = runBlocking {
            context.dataStore.data.map { it[ANIMATIONS] ?: true }.first()
        }

    suspend fun setHapticsEnabled(enabled: Boolean) {
        context.dataStore.edit { it[HAPTICS] = enabled }
    }

    val hapticsEnabled: Boolean
        get() = runBlocking {
            context.dataStore.data.map { it[HAPTICS] ?: true }.first()
        }

    companion object {
        const val DARK_MODE_SYSTEM = 0
        const val DARK_MODE_ON = 1
        const val DARK_MODE_OFF = 2

        private val DARK_MODE = intPreferencesKey("dark_mode")
        private val ANIMATIONS = booleanPreferencesKey("animations_enabled")
        private val HAPTICS = booleanPreferencesKey("haptics_enabled")
    }
}

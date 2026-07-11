package com.diagramqa.app

import android.os.Bundle
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.diagramqa.app.databinding.ActivitySettingsBinding
import com.diagramqa.app.util.PreferencesManager
import kotlinx.coroutines.launch

class SettingsActivity : AppCompatActivity() {

    private lateinit var b: ActivitySettingsBinding
    private lateinit var prefs: PreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(b.root)

        prefs = (application as DiagramQAApp).preferences
        setupToolbar()
        setupToggles()
        setupActions()
        populate()
    }

    private fun setupToolbar() {
        b.toolbar.setNavigationOnClickListener {
            finish()
            overridePendingTransition(R.anim.activity_close_enter, R.anim.activity_close_exit)
        }
    }

    private fun setupToggles() {
        val mode = prefs.darkMode
        b.switchDarkMode.isChecked = mode == PreferencesManager.DARK_MODE_ON
        b.textDarkMode.text = when (mode) {
            PreferencesManager.DARK_MODE_ON -> getString(R.string.settings_dark_mode_on)
            PreferencesManager.DARK_MODE_OFF -> getString(R.string.settings_dark_mode_off)
            else -> getString(R.string.settings_dark_mode_system)
        }
        b.rowDarkMode.setOnClickListener {
            // Cycle system -> on -> off
            val next = when (prefs.darkMode) {
                PreferencesManager.DARK_MODE_SYSTEM -> PreferencesManager.DARK_MODE_ON
                PreferencesManager.DARK_MODE_ON -> PreferencesManager.DARK_MODE_OFF
                else -> PreferencesManager.DARK_MODE_SYSTEM
            }
            lifecycleScope.launch { prefs.setDarkMode(next) }
            recreate()
        }

        b.switchAnimations.isChecked = prefs.animationsEnabled
        b.switchAnimations.setOnCheckedChangeListener { _, checked ->
            lifecycleScope.launch { prefs.setAnimationsEnabled(checked) }
        }

        b.switchHaptics.isChecked = prefs.hapticsEnabled
        b.switchHaptics.setOnCheckedChangeListener { _, checked ->
            lifecycleScope.launch { prefs.setHapticsEnabled(checked) }
        }
    }

    private fun setupActions() {
        b.rowClearCache.setOnClickListener {
            // Coil clears its memory cache; this is mostly cosmetic.
            (application as DiagramQAApp).let { app ->
                lifecycleScope.launch {
                    app.repository.clearAllSessions()
                }
            }
            showInfo(R.string.msg_cache_cleared)
        }

        b.rowClearHistory.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle(R.string.dialog_confirm_clear_history)
                .setMessage(R.string.dialog_confirm_clear_history_msg)
                .setNegativeButton(R.string.action_cancel, null)
                .setPositiveButton(R.string.action_delete) { _, _ ->
                    lifecycleScope.launch {
                        (application as DiagramQAApp).repository.clearAllSessions()
                        showInfo(R.string.msg_history_cleared)
                    }
                }
                .show()
        }
    }

    private fun populate() {
        b.textVersion.text = getString(R.string.splash_version)
        b.textBackend.text = com.diagramqa.app.BuildConfig.BASE_URL
            .removeSuffix("/")
            .let { if (it.length > 40) it.take(40) + "…" else it }
    }

    private fun showInfo(resId: Int) {
        com.google.android.material.snackbar.Snackbar
            .make(b.root, resId, com.google.android.material.snackbar.Snackbar.LENGTH_SHORT)
            .show()
    }
}

package com.diagramqa.app.util

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.HapticFeedbackConstants
import android.view.View

/**
 * Centralized haptic feedback. Respects the user's haptics preference.
 */
object HapticUtil {

    fun light(view: View) {
        if (!isHapticsEnabled(view.context)) return
        view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
    }

    fun confirm(view: View) {
        if (!isHapticsEnabled(view.context)) return
        view.performHapticFeedback(HapticFeedbackConstants.CONFIRM)
    }

    fun reject(view: View) {
        if (!isHapticsEnabled(view.context)) return
        view.performHapticFeedback(HapticFeedbackConstants.REJECT)
    }

    fun tick(context: Context, durationMs: Long = 12L) {
        if (!isHapticsEnabled(context)) return
        val vibrator = vibrator(context) ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(durationMs)
        }
    }

    private fun isHapticsEnabled(context: Context): Boolean =
        com.diagramqa.app.DiagramQAApp.get(context).preferences.hapticsEnabled

    private fun vibrator(context: Context): Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val mgr = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        mgr?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }
}

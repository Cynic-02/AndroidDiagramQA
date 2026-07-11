package com.diagramqa.app.util

import android.content.Context
import android.view.animation.AnimationUtils
import android.view.animation.Interpolator
import android.view.View
import com.diagramqa.app.DiagramQAApp

/**
 * Animation helpers that respect the user's "animations enabled" preference.
 */
object AnimUtil {

    fun load(context: Context, resId: Int) =
        if (DiagramQAApp.get(context).preferences.animationsEnabled) {
            AnimationUtils.loadAnimation(context, resId)
        } else null

    fun play(view: View, resId: Int) {
        load(view.context, resId)?.let { view.startAnimation(it) }
    }

    val interpolator: Interpolator
        get() = android.view.animation.OvershootInterpolator(0.85f)
}

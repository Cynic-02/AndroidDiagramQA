package com.diagramqa.app

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.view.animation.AnimationUtils
import android.view.animation.OvershootInterpolator
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.lifecycle.lifecycleScope
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Android 12 SplashScreen API — must be called before super.onCreate
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        // Keep splash visible while we warm up.
        var ready = false
        val keep = splash.setKeepOnScreenCondition { !ready }

        animateEntrance()

        // Warm up the network monitor + DB before navigating
        lifecycleScope.launch {
            val app = DiagramQAApp.get(this@SplashActivity)
            app.networkMonitor.start() // begin observing connectivity
            withContext(Dispatchers.IO) {
                // Touch DB so it's initialized on a background thread
                app.database.sessionDao().observeSessions()
            }
            delay(1100) // minimum splash duration for the animation
            ready = true
            navigate()
        }
    }

    private fun animateEntrance() {
        val logoContainer = findViewById<View>(R.id.logoContainer)
        val brand = findViewById<View>(R.id.brandText)
        val tagline = findViewById<View>(R.id.taglineText)
        val loading = findViewById<View>(R.id.loadingIndicator)
        val loadingText = findViewById<View>(R.id.loadingText)
        val version = findViewById<View>(R.id.versionText)
        val orb1 = findViewById<View>(R.id.orb1)
        val orb2 = findViewById<View>(R.id.orb2)

        val logoIn = AnimationUtils.loadAnimation(this, R.anim.splash_logo_in).apply {
            interpolator = OvershootInterpolator(0.85f)
        }
        val textIn = AnimationUtils.loadAnimation(this, R.anim.splash_text_in)
        val orbFloat = AnimationUtils.loadAnimation(this, R.anim.float_loop)

        logoContainer.startAnimation(logoIn)
        brand.startAnimation(textIn)
        tagline.startAnimation(textIn)
        loading.startAnimation(textIn)
        loadingText.startAnimation(textIn)
        version.startAnimation(textIn)
        orb1.startAnimation(orbFloat)
        orb2.startAnimation(orbFloat)

        // Pulse loading dots
        listOf(R.id.dot1, R.id.dot2, R.id.dot3).forEachIndexed { i, id ->
            val v = findViewById<View>(id)
            val a = AlphaAnimation(0.3f, 1f).apply {
                duration = 700
                startOffset = (i * 180).toLong()
                repeatMode = AlphaAnimation.REVERSE
                repeatCount = Animation.INFINITE
            }
            v.startAnimation(a)
        }
    }

    private fun navigate() {
        val intent = Intent(this, MainActivity::class.java)
        startActivity(intent)
        finish()
        overridePendingTransition(R.anim.fade_scale_in, R.anim.fade_scale_out)
    }
}

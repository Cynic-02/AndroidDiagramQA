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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Android 12 SplashScreen API — must be called before super.onCreate
        installSplashScreen()
        super.onCreate(savedInstanceState)

        val crashFile = java.io.File(filesDir, "crash_report.txt")
        if (crashFile.exists()) {
            val trace = try {
                val content = crashFile.readText()
                crashFile.delete()
                content
            } catch (_: Exception) {
                "Error reading crash file"
            }
            CrashReportActivity.start(this, trace)
            finish()
            return
        }

        setContentView(R.layout.activity_splash)

        animateEntrance()

        // Start network monitor and navigate after delay
        lifecycleScope.launch {
            val app = DiagramQAApp.get(this@SplashActivity)
            app.networkMonitor.start() // begin observing connectivity
            delay(1100) // minimum splash duration for the animation
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

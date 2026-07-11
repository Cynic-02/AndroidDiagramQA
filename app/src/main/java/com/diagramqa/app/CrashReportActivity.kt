package com.diagramqa.app

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import android.app.Activity

class CrashReportActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Let's create the layout programmatically so we don't depend on any XML layout compilation
        val root = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(32, 32, 32, 32)
            setBackgroundColor(0xFF121212.toInt()) // Dark background
        }

        val titleView = TextView(this).apply {
            text = "DiagramQA - App Crash Report"
            textSize = 20f
            setTextColor(0xFFFF5B4D.toInt()) // Soft red
            setTypeface(null, android.graphics.Typeface.BOLD)
            setPadding(0, 0, 0, 16)
        }
        root.addView(titleView)

        val explanationView = TextView(this).apply {
            text = "The application encountered an unexpected crash. Please copy the stack trace below and share it with the developer."
            textSize = 14f
            setTextColor(0xFFFFFFFF.toInt())
            setPadding(0, 0, 0, 16)
        }
        root.addView(explanationView)

        val stackTraceText = intent.getStringExtra(EXTRA_STACK_TRACE) ?: "No stack trace available."

        val scrollView = android.widget.ScrollView(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }
        val textView = TextView(this).apply {
            text = stackTraceText
            textSize = 12f
            setTextColor(0xFFCCCCCC.toInt())
            setTextIsSelectable(true)
            typeface = android.graphics.Typeface.MONOSPACE
        }
        scrollView.addView(textView)
        root.addView(scrollView)

        val buttonContainer = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.END
            setPadding(0, 16, 0, 0)
        }

        val copyButton = Button(this).apply {
            text = "Copy Stack Trace"
            setOnClickListener {
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("Crash Stack Trace", stackTraceText)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this@CrashReportActivity, "Copied to clipboard", Toast.LENGTH_SHORT).show()
            }
        }
        buttonContainer.addView(copyButton)

        val closeButton = Button(this).apply {
            text = "Close"
            setOnClickListener {
                finish()
                System.exit(0)
            }
        }
        buttonContainer.addView(closeButton)
        root.addView(buttonContainer)

        setContentView(root)
    }

    companion object {
        const val EXTRA_STACK_TRACE = "extra_stack_trace"

        fun start(context: Context, stackTrace: String) {
            val intent = Intent(context, CrashReportActivity::class.java).apply {
                putExtra(EXTRA_STACK_TRACE, stackTrace)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            }
            context.startActivity(intent)
        }
    }
}

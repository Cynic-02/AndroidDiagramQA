package com.diagramqa.app

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import coil.load
import com.diagramqa.app.databinding.ActivityImageViewerBinding
import java.io.File

class ImageViewerActivity : AppCompatActivity() {

    private lateinit var b: ActivityImageViewerBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityImageViewerBinding.inflate(layoutInflater)
        setContentView(b.root)

        val path = intent.getStringExtra(EXTRA_PATH)
        if (path != null) {
            b.imageFull.load(File(path)) {
                crossfade(true)
            }
        }

        b.toolbar.setNavigationOnClickListener {
            finish()
            overridePendingTransition(R.anim.fade_scale_in, R.anim.fade_scale_out)
        }

        b.toolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_share_image -> {
                    path?.let { shareImage(it) }
                    true
                }
                else -> false
            }
        }
    }

    private fun shareImage(path: String) {
        val file = File(path)
        if (!file.exists()) return
        val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "image/*"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivity(Intent.createChooser(intent, "Share diagram"))
    }

    companion object {
        const val EXTRA_PATH = "extra_path"
    }
}

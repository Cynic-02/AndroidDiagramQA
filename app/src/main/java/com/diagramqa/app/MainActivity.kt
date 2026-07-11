package com.diagramqa.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.animation.AnimationUtils
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.diagramqa.app.databinding.ActivityMainBinding
import com.diagramqa.app.ui.adapter.SessionsAdapter
import com.diagramqa.app.ui.dialog.ImagePickerSheet
import com.diagramqa.app.ui.viewmodel.HomeViewModel
import com.diagramqa.app.util.HapticUtil
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch
import java.io.File

class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding
    private val vm: HomeViewModel by viewModels()
    private lateinit var adapter: SessionsAdapter
    private var pendingCameraUri: Uri? = null
    private var pendingCameraFile: File? = null

    private val pickImage =
        registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
            if (uri != null) startNewSession(uri)
        }

    private val takePicture =
        registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
            val uri = pendingCameraUri
            val file = pendingCameraFile
            pendingCameraUri = null
            pendingCameraFile = null

            if (success && uri != null && file?.exists() == true && file.length() > 0L) {
                startNewSession(uri)
            } else {
                file?.delete()
                Snackbar.make(b.root, R.string.msg_camera_capture_failed, Snackbar.LENGTH_SHORT).show()
            }
        }

    private val requestCameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) launchCameraCapture()
            else Snackbar.make(b.root, R.string.msg_camera_permission_denied, Snackbar.LENGTH_SHORT).show()
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        val prefs = (application as DiagramQAApp).preferences
        val mode = prefs.darkMode
        androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(
            when (mode) {
                com.diagramqa.app.util.PreferencesManager.DARK_MODE_ON -> androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES
                com.diagramqa.app.util.PreferencesManager.DARK_MODE_OFF -> androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO
                else -> androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
            }
        )

        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        setupRecycler()
        setupFab()
        setupToolbar()
        observe()

        // Animate list entrance
        b.recyclerSessions.layoutAnimation =
            AnimationUtils.loadLayoutAnimation(this, R.anim.layout_animation_fall_down)
    }

    private fun setupRecycler() {
        adapter = SessionsAdapter(
            onStartSession = { showPicker() },
            onOpenSession = { openSession(it) },
            onLongPressSession = { confirmDelete(it) }
        )
        b.recyclerSessions.adapter = adapter
        b.recyclerSessions.layoutManager = LinearLayoutManager(this)
        b.recyclerSessions.setHasFixedSize(false)
        b.recyclerSessions.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(rv: RecyclerView, dx: Int, dy: Int) {
                if (dy > 0 && b.fabNewSession.isExtended) b.fabNewSession.shrink()
                else if (dy < 0 && !b.fabNewSession.isExtended) b.fabNewSession.extend()
            }
        })
    }

    private fun setupFab() {
        b.fabNewSession.setOnClickListener {
            HapticUtil.light(it)
            showPicker()
        }
    }

    private fun setupToolbar() {
        b.toolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_settings -> {
                    startActivity(Intent(this, SettingsActivity::class.java))
                    overridePendingTransition(R.anim.slide_in_right, R.anim.activity_exit)
                    true
                }
                else -> false
            }
        }
    }

    private fun observe() {
        vm.sessions.observe(this) { sessions ->
            adapter.submitSessions(sessions)
            b.emptyState.visibility =
                if (sessions.isEmpty()) View.VISIBLE else View.GONE
        }

        vm.isOnline.observe(this) { online ->
            updateStatusIndicator(online)
            b.offlineBanner.visibility = if (online) View.GONE else View.VISIBLE
            if (online) b.offlineBanner.startAnimation(
                AnimationUtils.loadAnimation(this, R.anim.slide_out_top)
            ) else b.offlineBanner.startAnimation(
                AnimationUtils.loadAnimation(this, R.anim.slide_in_top)
            )
        }

        vm.toast.observe(this) { msg ->
            if (!msg.isNullOrBlank()) {
                Snackbar.make(b.root, msg, Snackbar.LENGTH_SHORT).show()
                vm.toastShown()
            }
        }

        b.swipeRefresh.setColorSchemeColors(getColor(R.color.brand_primary))
        b.swipeRefresh.setOnRefreshListener {
            // Sync pending if any
            lifecycleScope.launch {
                try {
                    (application as DiagramQAApp).repository.syncPending(application)
                } catch (_: Throwable) {
                    Snackbar.make(b.root, R.string.msg_sync_failed, Snackbar.LENGTH_SHORT).show()
                }
                b.swipeRefresh.isRefreshing = false
            }
        }
    }

    private fun updateStatusIndicator(online: Boolean) {
        if (online) {
            b.statusDot.setBackgroundResource(R.drawable.dot_online)
            b.statusText.text = getString(R.string.home_online)
        } else {
            b.statusDot.setBackgroundResource(R.drawable.dot_offline)
            b.statusText.text = getString(R.string.home_offline)
        }
    }

    private fun showPicker() {
        ImagePickerSheet.show(supportFragmentManager,
            onCamera = {
                startCameraFlow()
            },
            onGallery = {
                pickImage.launch("image/*")
            }
        )
    }

    private fun startNewSession(uri: Uri) {
        val title = "Session ${System.currentTimeMillis() % 100000}"
        vm.newSession(title, uri)
    }

    private fun startCameraFlow() {
        if (!packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            Snackbar.make(b.root, R.string.msg_camera_unavailable, Snackbar.LENGTH_SHORT).show()
            return
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            launchCameraCapture()
        } else {
            requestCameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun launchCameraCapture() {
        try {
            val dir = File(cacheDir, "camera").apply { mkdirs() }
            val file = File.createTempFile("diagram_capture_", ".jpg", dir)
            val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
            pendingCameraFile = file
            pendingCameraUri = uri
            takePicture.launch(uri)
        } catch (_: Throwable) {
            pendingCameraFile?.delete()
            pendingCameraFile = null
            pendingCameraUri = null
            Snackbar.make(b.root, R.string.msg_camera_capture_failed, Snackbar.LENGTH_SHORT).show()
        }
    }

    private fun openSession(session: com.diagramqa.app.data.local.SessionEntity) {
        val intent = Intent(this, QnAActivity::class.java).apply {
            putExtra(QnAActivity.EXTRA_SESSION_ID, session.id)
            putExtra(QnAActivity.EXTRA_SESSION_TITLE, session.title)
            putExtra(QnAActivity.EXTRA_DIAGRAM_PATH, session.diagramPath)
        }
        startActivity(intent)
        overridePendingTransition(R.anim.slide_in_right, R.anim.activity_exit)
    }

    private fun confirmDelete(session: com.diagramqa.app.data.local.SessionEntity) {
        HapticUtil.reject(b.root)
        AlertDialog.Builder(this)
            .setTitle(R.string.dialog_confirm_delete_session)
            .setMessage(R.string.dialog_confirm_delete_session_msg)
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.action_delete) { _, _ ->
                vm.deleteSession(session)
            }
            .show()
    }

    override fun onResume() {
        super.onResume()
        // Refresh status when coming back
        updateStatusIndicator(vm.isOnline.value == true)
    }
}

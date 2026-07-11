package com.diagramqa.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.animation.AnimationUtils
import android.view.inputmethod.EditorInfo
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import coil.load
import coil.request.CachePolicy
import com.diagramqa.app.databinding.ActivityQnaBinding
import com.diagramqa.app.ui.adapter.ChatAdapter
import com.diagramqa.app.ui.dialog.ImagePickerSheet
import com.diagramqa.app.ui.viewmodel.QnAViewModel
import com.diagramqa.app.util.HapticUtil
import com.google.android.material.snackbar.Snackbar
import kotlinx.coroutines.launch
import java.io.File

class QnAActivity : AppCompatActivity() {

    private lateinit var b: ActivityQnaBinding
    private val vm: QnAViewModel by viewModels()
    private lateinit var adapter: ChatAdapter
    private var pendingCameraUri: Uri? = null
    private var pendingCameraFile: File? = null

    private val pickImage =
        registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
            if (uri != null) {
                createSessionFromDiagram(uri)
            }
        }

    private val takePicture =
        registerForActivityResult(ActivityResultContracts.TakePicture()) { success ->
            val uri = pendingCameraUri
            val file = pendingCameraFile
            pendingCameraUri = null
            pendingCameraFile = null

            if (success && uri != null && file?.exists() == true && file.length() > 0L) {
                createSessionFromDiagram(uri)
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
        super.onCreate(savedInstanceState)
        b = ActivityQnaBinding.inflate(layoutInflater)
        setContentView(b.root)

        setupRecycler()
        setupToolbar()
        setupInput()
        observe()

        // If launched with an existing session id, load it
        intent.getStringExtra(EXTRA_SESSION_ID)?.let { id ->
            val title = intent.getStringExtra(EXTRA_SESSION_TITLE) ?: getString(R.string.qna_title)
            loadSessionUi(id, title)
        }
    }

    private fun setupRecycler() {
        adapter = ChatAdapter()
        b.recyclerChat.adapter = adapter
        b.recyclerChat.layoutManager = LinearLayoutManager(this).apply {
            stackFromEnd = true
        }
        b.recyclerChat.itemAnimator?.changeDuration = 0
        b.recyclerChat.layoutAnimation =
            AnimationUtils.loadLayoutAnimation(this, R.anim.layout_animation_fall_down)
    }

    private fun setupToolbar() {
        b.toolbar.setNavigationOnClickListener {
            HapticUtil.light(it)
            finish()
            overridePendingTransition(R.anim.activity_close_enter, R.anim.activity_close_exit)
        }
        b.toolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_change_diagram -> { showDiagramPicker(); true }
                R.id.action_clear -> { confirmClear(); true }
                R.id.action_share -> { shareCurrentSession(); true }
                else -> false
            }
        }
        b.thumbDiagram.setOnClickListener { openImageViewer() }
    }

    private fun setupInput() {
        b.inputMessage.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                send(); true
            } else false
        }
        b.inputMessage.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                // Toggle send button enabled state
            }
        })
        b.btnSend.setOnClickListener { send() }
        b.btnChangeDiagram.setOnClickListener { showDiagramPicker() }
    }

    private fun observe() {
        vm.session.observe(this) { session ->
            if (session != null) {
                b.titleText.text = session.title
                val diagram = File(session.diagramPath)
                if (diagram.exists()) {
                    b.thumbDiagram.load(diagram) {
                        crossfade(true)
                        diskCachePolicy(CachePolicy.ENABLED)
                        memoryCachePolicy(CachePolicy.ENABLED)
                        placeholder(R.drawable.ic_diagram)
                        error(R.drawable.ic_diagram)
                    }
                } else {
                    b.thumbDiagram.setImageResource(R.drawable.ic_diagram)
                    Snackbar.make(b.root, R.string.msg_diagram_load_failed, Snackbar.LENGTH_SHORT).show()
                }
            }
        }

        vm.messages.observe(this) { msgs ->
            adapter.submitList(msgs) {
                if (msgs.isNotEmpty()) {
                    b.recyclerChat.scrollToPosition(msgs.size - 1)
                }
            }
            b.emptyState.visibility = if (msgs.isEmpty()) View.VISIBLE else View.GONE
        }

        vm.isOnline.observe(this) { online ->
            b.offlineBanner.visibility = if (online) View.GONE else View.VISIBLE
            b.statusText.text = if (online) getString(R.string.home_online)
                else getString(R.string.home_offline)
            if (online) {
                // Try to flush pending ops
                vm.onConnectionRestored()
            }
        }

        vm.sending.observe(this) { sending ->
            b.typingIndicator.visibility = if (sending) View.VISIBLE else View.GONE
            b.btnSend.isEnabled = !sending
            if (sending) animateTypingDots()
        }

        vm.toast.observe(this) { msg ->
            if (!msg.isNullOrBlank()) {
                Snackbar.make(b.root, msg, Snackbar.LENGTH_SHORT).show()
                vm.toastShown()
            }
        }

        vm.syncedToast.observe(this) { synced ->
            if (synced) {
                Snackbar.make(b.root, R.string.msg_synced, Snackbar.LENGTH_SHORT).show()
                vm.syncedToastShown()
            }
        }
    }

    private fun animateTypingDots() {
        val baseDelay = 0L
        val dots = listOf(b.typingDot1, b.typingDot2, b.typingDot3)
        dots.forEachIndexed { i, v ->
            v.animate().alpha(0.3f).setDuration(0).withEndAction {
                v.animate().alpha(1f).setStartDelay(baseDelay + i * 180L).setDuration(420)
                    .withEndAction {
                        v.animate().alpha(0.3f).setStartDelay(180L).setDuration(420).start()
                    }.start()
            }.start()
        }
    }

    private fun loadSessionUi(sessionId: String, title: String) {
        vm.loadSession(sessionId)
        b.titleText.text = title
    }

    private fun showDiagramPicker() {
        ImagePickerSheet.show(supportFragmentManager,
            onCamera = { startCameraFlow() },
            onGallery = { pickImage.launch("image/*") }
        )
    }

    private fun createSessionFromDiagram(uri: Uri) {
        val title = "Session ${System.currentTimeMillis() % 100000}"
        vm.newSession(title, uri) { id ->
            loadSessionUi(id, title)
        }
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

    private fun send() {
        val text = b.inputMessage.text?.toString()?.trim() ?: ""
        if (text.isBlank()) {
            Snackbar.make(b.root, R.string.msg_question_empty, Snackbar.LENGTH_SHORT).show()
            return
        }
        if (vm.session.value == null) {
            Snackbar.make(b.root, "Pick a diagram first", Snackbar.LENGTH_SHORT).show()
            return
        }
        HapticUtil.light(b.btnSend)
        vm.ask(text)
        b.inputMessage.text?.clear()
    }

    private fun confirmClear() {
        AlertDialog.Builder(this)
            .setTitle(R.string.dialog_confirm_clear)
            .setMessage(R.string.dialog_confirm_clear_msg)
            .setNegativeButton(R.string.action_cancel, null)
            .setPositiveButton(R.string.action_confirm) { _, _ -> vm.clearChat() }
            .show()
    }

    private fun openImageViewer() {
        val path = vm.session.value?.diagramPath ?: return
        val intent = Intent(this, ImageViewerActivity::class.java).apply {
            putExtra(ImageViewerActivity.EXTRA_PATH, path)
        }
        startActivity(intent)
        overridePendingTransition(R.anim.fade_scale_in, R.anim.activity_exit)
    }

    private fun shareCurrentSession() {
        val session = vm.session.value ?: return
        val file = File(session.diagramPath)
        if (!file.exists()) {
            Snackbar.make(b.root, R.string.msg_diagram_load_failed, Snackbar.LENGTH_SHORT).show()
            return
        }
        val uri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        val share = Intent(Intent.ACTION_SEND).apply {
            type = "image/*"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivity(Intent.createChooser(share, "Share diagram"))
    }

    companion object {
        const val EXTRA_SESSION_ID = "extra_session_id"
        const val EXTRA_SESSION_TITLE = "extra_session_title"
        const val EXTRA_DIAGRAM_PATH = "extra_diagram_path"
    }
}

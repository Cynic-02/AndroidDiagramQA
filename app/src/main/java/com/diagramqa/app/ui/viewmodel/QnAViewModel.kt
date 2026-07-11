package com.diagramqa.app.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.diagramqa.app.DiagramQAApp
import com.diagramqa.app.data.local.MessageEntity
import com.diagramqa.app.data.local.SessionEntity
import com.diagramqa.app.data.repository.Result
import kotlinx.coroutines.launch

class QnAViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = (app as DiagramQAApp).repository
    private val networkMonitor = (app as DiagramQAApp).networkMonitor

    private val _sessionId = MutableLiveData<String?>()
    val sessionId: LiveData<String?> = _sessionId

    private val _session = MutableLiveData<SessionEntity?>()
    val session: LiveData<SessionEntity?> = _session

    private val _messages = MutableLiveData<List<MessageEntity>>(emptyList())
    val messages: LiveData<List<MessageEntity>> = _messages

    val isOnline: LiveData<Boolean> = networkMonitor.isOnline

    private val _sending = MutableLiveData(false)
    val sending: LiveData<Boolean> = _sending

    private val _toast = MutableLiveData<String?>()
    val toast: LiveData<String?> = _toast

    private val _syncedToast = MutableLiveData(false)
    val syncedToast: LiveData<Boolean> = _syncedToast

    fun loadSession(id: String) {
        if (_sessionId.value != id) _sessionId.value = id
        // Subscribe to flows for this session
        viewModelScope.launch {
            repo.observeSession(id).collect { _session.postValue(it) }
        }
        viewModelScope.launch {
            repo.observeMessages(id).collect { _messages.postValue(it) }
        }
    }

    fun newSession(title: String, diagramUri: Uri, onCreated: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val s = repo.createSession(title, diagramUri, getApplication())
                _sessionId.value = s.id
                loadSession(s.id)
                onCreated(s.id)
            } catch (t: Throwable) {
                _toast.value = "Could not load diagram: ${t.message}"
            }
        }
    }

    fun ask(question: String) {
        val sid = _sessionId.value ?: return
        if (question.isBlank()) {
            _toast.value = "Type a question first"
            return
        }
        _sending.value = true
        viewModelScope.launch {
            when (val r = repo.askQuestion(sid, question, getApplication())) {
                is Result.Success -> { /* UI auto-updates via messages LiveData */ }
                is Result.Error -> _toast.value = r.message
                Result.Offline -> _toast.value = "Queued — will send when you reconnect"
            }
            _sending.value = false
        }
    }

    fun clearChat() {
        val sid = _sessionId.value ?: return
        viewModelScope.launch {
            repo.clearChat(sid)
            _toast.value = "Chat cleared"
        }
    }

    fun toastShown() { _toast.value = null }
    fun syncedToastShown() { _syncedToast.value = false }

    /**
     * Called when the network monitor reports connectivity restored.
     */
    fun onConnectionRestored() {
        val sid = _sessionId.value ?: return
        viewModelScope.launch {
            val count = repo.syncPending(getApplication())
            if (count > 0) _syncedToast.value = true
        }
    }
}

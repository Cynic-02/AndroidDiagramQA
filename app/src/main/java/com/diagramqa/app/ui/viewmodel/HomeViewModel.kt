package com.diagramqa.app.ui.viewmodel

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.diagramqa.app.DiagramQAApp
import com.diagramqa.app.data.local.SessionEntity
import com.diagramqa.app.data.repository.Result
import kotlinx.coroutines.launch

class HomeViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = (app as DiagramQAApp).repository
    private val networkMonitor = (app as DiagramQAApp).networkMonitor

    private val _sessions = MutableLiveData<List<SessionEntity>>(emptyList())
    val sessions: LiveData<List<SessionEntity>> = _sessions

    val isOnline: LiveData<Boolean> = networkMonitor.isOnline

    private val _toast = MutableLiveData<String?>()
    val toast: LiveData<String?> = _toast

    init {
        // Subscribe to DB flow on init
        viewModelScope.launch {
            repo.observeSessions().collect { _sessions.postValue(it) }
        }
    }

    fun newSession(title: String, diagramUri: Uri) {
        viewModelScope.launch {
            try {
                repo.createSession(title, diagramUri, getApplication())
                _toast.value = "Session created"
            } catch (t: Throwable) {
                _toast.value = "Could not load diagram: ${t.message}"
            }
        }
    }

    fun deleteSession(session: SessionEntity) {
        viewModelScope.launch {
            repo.deleteSession(session)
            _toast.value = "Session deleted"
        }
    }

    fun clearAll() {
        viewModelScope.launch {
            repo.clearAllSessions()
            _toast.value = "All sessions cleared"
        }
    }

    fun toastShown() { _toast.value = null }
}

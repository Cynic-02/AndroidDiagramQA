package com.diagramqa.app.data.repository

import android.content.Context
import android.net.Uri
import com.diagramqa.app.data.local.AppDatabase
import com.diagramqa.app.data.local.MessageEntity
import com.diagramqa.app.data.local.PendingOpEntity
import com.diagramqa.app.data.local.SessionEntity
import com.diagramqa.app.data.remote.ApiService
import com.diagramqa.app.util.NetworkMonitor
import com.diagramqa.app.util.ImageUtil
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.util.UUID

/**
 * Result of an asynchronous operation that may succeed or fail gracefully.
 */
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val cause: Throwable? = null) : Result<Nothing>()
    data object Offline : Result<Nothing>()
}

/**
 * Single source of truth for sessions, messages, and backend calls.
 *
 * Behavior:
 *  - When online: every operation flows through the API and is mirrored locally.
 *  - When offline: writes are persisted locally + queued in `pending_ops`;
 *    a [NetworkMonitor] connectivity callback flushes the queue automatically.
 */
class DiagramRepository(
    private val db: AppDatabase,
    private val api: ApiService,
    private val networkMonitor: NetworkMonitor? = null
) {

    fun observeSessions(): Flow<List<SessionEntity>> = db.sessionDao().observeSessions()
    fun observeMessages(sessionId: String): Flow<List<MessageEntity>> =
        db.messageDao().observeBySession(sessionId)
    fun observeSession(sessionId: String): Flow<SessionEntity?> =
        db.sessionDao().observeById(sessionId)

    val isOnline: Boolean get() = networkMonitor?.isCurrentlyConnected() ?: true

    /**
     * Creates a new session anchored to a local diagram image.
     */
    suspend fun createSession(title: String, diagramUri: Uri, context: Context): SessionEntity =
        withContext(Dispatchers.IO) {
            // Copy the chosen image into our app-private storage so it persists.
            val stored = ImageUtil.copyToInternal(context, diagramUri)
            val now = System.currentTimeMillis()
            val session = SessionEntity(
                id = UUID.randomUUID().toString(),
                title = title.ifBlank { "Untitled diagram" },
                diagramPath = stored.absolutePath,
                createdAt = now,
                updatedAt = now,
                isSynced = false
            )
            db.sessionDao().upsert(session)
            session
        }

    /**
     * Asks a question against a session's diagram. Always persists the user
     * message locally first; if offline, the question is queued for later.
     */
    suspend fun askQuestion(
        sessionId: String,
        question: String,
        context: Context
    ): Result<String> = withContext(Dispatchers.IO) {
        val session = db.sessionDao().getById(sessionId)
            ?: return@withContext Result.Error("Session not found")

        val now = System.currentTimeMillis()
        val userMsg = MessageEntity(
            id = UUID.randomUUID().toString(),
            sessionId = sessionId,
            role = "user",
            content = question,
            timestamp = now,
            isSynced = false,
            isPending = !isOnline
        )
        db.messageDao().insert(userMsg)

        val newCount = db.messageDao().countBySession(sessionId)
        db.sessionDao().updateSummary(
            sessionId,
            newCount,
            question,
            session.lastAnswer,
            now
        )

        if (!isOnline) {
            // Queue for sync
            val payload = JSONObject().apply {
                put("question", question)
            }.toString()
            db.pendingOpDao().insert(
                PendingOpEntity(
                    id = UUID.randomUUID().toString(),
                    sessionId = sessionId,
                    messageId = userMsg.id,
                    opType = "ask",
                    payload = payload,
                    createdAt = now
                )
            )
            return@withContext Result.Offline
        }

        // Online: hit the API
        try {
            ensureDiagramUploaded(session, context)
            val diagramId = session.diagramRemoteId
                ?: return@withContext Result.Error("Diagram upload failed")
            val resp = api.askQuestion(
                diagramId,
                ApiService.AskRequest(question = question, sessionId = sessionId)
            )
            if (!resp.isSuccessful) {
                db.messageDao().markFailed(userMsg.id, "HTTP ${resp.code()}")
                return@withContext Result.Error("Server error: ${resp.code()}")
            }
            val answer = resp.body()?.answer ?: ""
            db.messageDao().markSynced(userMsg.id)
            val aiMsg = MessageEntity(
                id = UUID.randomUUID().toString(),
                sessionId = sessionId,
                role = "assistant",
                content = answer,
                timestamp = System.currentTimeMillis(),
                isSynced = true
            )
            db.messageDao().insert(aiMsg)
            db.sessionDao().updateSummary(
                sessionId,
                newCount + 1,
                question,
                answer,
                aiMsg.timestamp
            )
            db.sessionDao().markSynced(sessionId)
            Result.Success(answer)
        } catch (t: Throwable) {
            db.messageDao().markFailed(userMsg.id, t.message ?: "Network error")
            Result.Error(t.message ?: "Network error", t)
        }
    }

    private suspend fun ensureDiagramUploaded(session: SessionEntity, context: Context) {
        if (session.diagramRemoteId != null) return
        val file = File(session.diagramPath)
        if (!file.exists()) return
        try {
            val reqFile = file.asRequestBody("image/*".toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("image", file.name, reqFile)
            val name = session.title.toRequestBody("text/plain".toMediaTypeOrNull())
            val resp = api.uploadDiagram(part, name)
            if (resp.isSuccessful) {
                val remoteId = resp.body()?.id
                if (remoteId != null) {
                    db.sessionDao().update(
                        session.copy(
                            diagramRemoteId = remoteId,
                            isSynced = true
                        )
                    )
                }
            }
        } catch (_: Throwable) { /* will be retried on next ask */ }
    }

    /**
     * Flushes all pending operations. Called when connectivity returns.
     */
    suspend fun syncPending(context: Context): Int = withContext(Dispatchers.IO) {
        val pending = db.pendingOpDao().getAll()
        if (pending.isEmpty()) return@withContext 0
        var synced = 0
        for (op in pending) {
            try {
                val payload = JSONObject(op.payload)
                val session = db.sessionDao().getById(op.sessionId) ?: continue
                if (op.opType == "ask") {
                    val q = payload.optString("question")
                    ensureDiagramUploaded(session, context)
                    val diagramId = session.diagramRemoteId ?: continue
                    val resp = api.askQuestion(
                        diagramId,
                        ApiService.AskRequest(question = q, sessionId = op.sessionId)
                    )
                    if (resp.isSuccessful) {
                        val answer = resp.body()?.answer ?: ""
                        db.messageDao().markSynced(op.messageId)
                        val aiMsg = MessageEntity(
                            id = UUID.randomUUID().toString(),
                            sessionId = op.sessionId,
                            role = "assistant",
                            content = answer,
                            timestamp = System.currentTimeMillis(),
                            isSynced = true
                        )
                        db.messageDao().insert(aiMsg)
                        val count = db.messageDao().countBySession(op.sessionId)
                        db.sessionDao().updateSummary(
                            op.sessionId, count, q, answer, aiMsg.timestamp
                        )
                        db.sessionDao().markSynced(op.sessionId)
                        db.pendingOpDao().delete(op)
                        synced++
                    }
                }
            } catch (_: Throwable) {
                db.pendingOpDao().bumpRetry(op.id)
            }
        }
        synced
    }

    suspend fun deleteSession(session: SessionEntity) = withContext(Dispatchers.IO) {
        db.sessionDao().delete(session)
        File(session.diagramPath).takeIf { it.exists() }?.delete()
    }

    suspend fun clearAllSessions() = withContext(Dispatchers.IO) {
        db.sessionDao().clearAll()
    }

    suspend fun clearChat(sessionId: String) = withContext(Dispatchers.IO) {
        db.messageDao().clearForSession(sessionId)
        db.sessionDao().updateSummary(sessionId, 0, null, null, System.currentTimeMillis())
    }

    suspend fun hasPending(): Boolean = withContext(Dispatchers.IO) {
        db.pendingOpDao().count() > 0
    }
}

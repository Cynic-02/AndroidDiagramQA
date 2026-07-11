package com.diagramqa.app.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * A user-created chat session anchored to a single diagram image.
 */
@Entity(
    tableName = "sessions",
    indices = [Index("updated_at")]
)
data class SessionEntity(
    @PrimaryKey
    val id: String,
    val title: String,
    @ColumnInfo(name = "diagram_path")
    val diagramPath: String,
    @ColumnInfo(name = "diagram_remote_id")
    val diagramRemoteId: String? = null,
    @ColumnInfo(name = "created_at")
    val createdAt: Long,
    @ColumnInfo(name = "updated_at")
    val updatedAt: Long,
    @ColumnInfo(name = "is_synced")
    val isSynced: Boolean = false,
    @ColumnInfo(name = "message_count")
    val messageCount: Int = 0,
    @ColumnInfo(name = "last_question")
    val lastQuestion: String? = null,
    @ColumnInfo(name = "last_answer")
    val lastAnswer: String? = null
)

/**
 * A single chat message inside a session.
 */
@Entity(
    tableName = "messages",
    foreignKeys = [
        ForeignKey(
            entity = SessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["session_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("session_id")]
)
data class MessageEntity(
    @PrimaryKey
    val id: String,
    @ColumnInfo(name = "session_id")
    val sessionId: String,
    val role: String, // "user" | "assistant" | "system"
    val content: String,
    val timestamp: Long,
    @ColumnInfo(name = "is_synced")
    val isSynced: Boolean = false,
    @ColumnInfo(name = "is_pending")
    val isPending: Boolean = false,
    @ColumnInfo(name = "error_state")
    val errorState: String? = null
)

/**
 * A pending operation that should be retried when the network returns.
 */
@Entity(
    tableName = "pending_ops",
    indices = [Index("session_id")]
)
data class PendingOpEntity(
    @PrimaryKey
    val id: String,
    @ColumnInfo(name = "session_id")
    val sessionId: String,
    @ColumnInfo(name = "message_id")
    val messageId: String,
    @ColumnInfo(name = "op_type")
    val opType: String, // "ask" | "upload_diagram"
    val payload: String, // serialized JSON payload
    @ColumnInfo(name = "created_at")
    val createdAt: Long,
    @ColumnInfo(name = "retry_count")
    val retryCount: Int = 0
)

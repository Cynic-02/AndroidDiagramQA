package com.diagramqa.app.data.local

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {

    @Query("SELECT * FROM sessions ORDER BY updated_at DESC")
    fun observeSessions(): Flow<List<SessionEntity>>

    @Query("SELECT * FROM sessions WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): SessionEntity?

    @Query("SELECT * FROM sessions WHERE id = :id LIMIT 1")
    fun observeById(id: String): Flow<SessionEntity?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(session: SessionEntity)

    @Update
    suspend fun update(session: SessionEntity)

    @Delete
    suspend fun delete(session: SessionEntity)

    @Query("DELETE FROM sessions")
    suspend fun clearAll()

    @Query("UPDATE sessions SET is_synced = 1 WHERE id = :id")
    suspend fun markSynced(id: String)

    @Query("UPDATE sessions SET message_count = :count, last_question = :q, last_answer = :a, updated_at = :ts WHERE id = :id")
    suspend fun updateSummary(id: String, count: Int, q: String?, a: String?, ts: Long)
}

@Dao
interface MessageDao {

    @Query("SELECT * FROM messages WHERE session_id = :sessionId ORDER BY timestamp ASC")
    fun observeBySession(sessionId: String): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE session_id = :sessionId ORDER BY timestamp ASC")
    suspend fun getBySession(sessionId: String): List<MessageEntity>

    @Query("SELECT COUNT(*) FROM messages WHERE session_id = :sessionId")
    suspend fun countBySession(sessionId: String): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: MessageEntity)

    @Update
    suspend fun update(message: MessageEntity)

    @Delete
    suspend fun delete(message: MessageEntity)

    @Query("DELETE FROM messages WHERE session_id = :sessionId")
    suspend fun clearForSession(sessionId: String)

    @Query("UPDATE messages SET is_pending = 0, is_synced = 1, error_state = NULL WHERE id = :id")
    suspend fun markSynced(id: String)

    @Query("UPDATE messages SET is_pending = 0, error_state = :error WHERE id = :id")
    suspend fun markFailed(id: String, error: String)
}

@Dao
interface PendingOpDao {

    @Query("SELECT * FROM pending_ops ORDER BY created_at ASC")
    suspend fun getAll(): List<PendingOpEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(op: PendingOpEntity)

    @Delete
    suspend fun delete(op: PendingOpEntity)

    @Query("SELECT COUNT(*) FROM pending_ops")
    suspend fun count(): Int

    @Query("SELECT * FROM pending_ops WHERE session_id = :sessionId")
    suspend fun forSession(sessionId: String): List<PendingOpEntity>

    @Query("UPDATE pending_ops SET retry_count = retry_count + 1 WHERE id = :id")
    suspend fun bumpRetry(id: String)
}

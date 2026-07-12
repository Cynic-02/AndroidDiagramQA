/**
 * ChatMessageDao — CRUD for the local `chat_messages` SQLite table.
 * Caches /api/chat history so conversations are readable offline.
 */
import { getDb } from './database';
import type { ChatMessageRow, LocalChatMessage } from '../types/models';
import { toLocalChatMessage } from '../types/models';

export const ChatMessageDao = {
  async getBySession(sessionId: string): Promise<LocalChatMessage[]> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );
    const rows: LocalChatMessage[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(toLocalChatMessage(result.rows.item(i) as ChatMessageRow));
    }
    return rows;
  },

  async insert(msg: ChatMessageRow): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      `INSERT OR REPLACE INTO chat_messages (id, session_id, role, content, created_at)
       VALUES (?,?,?,?,?)`,
      [msg.id, msg.session_id, msg.role, msg.content, msg.created_at]
    );
  },

  async clearForSession(sessionId: string): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      'DELETE FROM chat_messages WHERE session_id = ?',
      [sessionId]
    );
  },
};

export default ChatMessageDao;

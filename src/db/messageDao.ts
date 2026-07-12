import { getDb } from './database';
import { MessageRow, Message, toMessage } from '../types/models';

function rowsToArray(rows: any): MessageRow[] {
  const out: MessageRow[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export const MessageDao = {
  async getBySession(sessionId: string): Promise<Message[]> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC;',
      [sessionId],
    );
    return rowsToArray(result.rows).map(toMessage);
  },

  async countBySession(sessionId: string): Promise<number> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT COUNT(*) as cnt FROM messages WHERE session_id = ?;',
      [sessionId],
    );
    return result.rows.item(0).cnt as number;
  },

  async insert(message: MessageRow): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      `INSERT OR REPLACE INTO messages
        (id, session_id, role, content, timestamp, is_synced, is_pending, error_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        message.id,
        message.session_id,
        message.role,
        message.content,
        message.timestamp,
        message.is_synced,
        message.is_pending,
        message.error_state,
      ],
    );
  },

  async clearForSession(sessionId: string): Promise<void> {
    const db = await getDb();
    await db.executeSql('DELETE FROM messages WHERE session_id = ?;', [sessionId]);
  },

  async markSynced(id: string): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      "UPDATE messages SET is_pending = 0, is_synced = 1, error_state = NULL WHERE id = ?;",
      [id],
    );
  },

  async markFailed(id: string, error: string): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      'UPDATE messages SET is_pending = 0, error_state = ? WHERE id = ?;',
      [error, id],
    );
  },
};

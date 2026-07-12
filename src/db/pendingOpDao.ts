/**
 * PendingOp DAO — mirrors Daos.kt PendingOpDao.
 * Manages the pending_ops table for offline-queue operations.
 */
import { getDb } from './database';
import { PendingOpRow } from '../types/models';

function rowsToArray(rows: any): PendingOpRow[] {
  const out: PendingOpRow[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export const PendingOpDao = {
  async getAll(): Promise<PendingOpRow[]> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT * FROM pending_ops ORDER BY created_at ASC;',
    );
    return rowsToArray(result.rows);
  },

  async insert(op: PendingOpRow): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      `INSERT OR REPLACE INTO pending_ops
        (id, session_id, message_id, op_type, payload, created_at, retry_count)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        op.id,
        op.session_id,
        op.message_id,
        op.op_type,
        op.payload,
        op.created_at,
        op.retry_count,
      ],
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.executeSql('DELETE FROM pending_ops WHERE id = ?;', [id]);
  },

  async bumpRetry(id: string): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      'UPDATE pending_ops SET retry_count = retry_count + 1 WHERE id = ?;',
      [id],
    );
  },

  async count(): Promise<number> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT COUNT(*) as cnt FROM pending_ops;',
    );
    return result.rows.item(0).cnt as number;
  },
};

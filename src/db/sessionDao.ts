import { getDb } from './database';
import { SessionRow, Session, toSession } from '../types/models';

function rowsToArray(rows: any): SessionRow[] {
  const out: SessionRow[] = [];
  for (let i = 0; i < rows.length; i++) out.push(rows.item(i));
  return out;
}

export const SessionDao = {
  async getAll(): Promise<Session[]> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT * FROM sessions ORDER BY updated_at DESC;',
    );
    return rowsToArray(result.rows).map(toSession);
  },

  async getById(id: string): Promise<Session | null> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT * FROM sessions WHERE id = ? LIMIT 1;',
      [id],
    );
    if (result.rows.length === 0) return null;
    return toSession(result.rows.item(0));
  },

  async getByRunId(runId: string): Promise<Session | null> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT * FROM sessions WHERE run_id = ? LIMIT 1;',
      [runId],
    );
    if (result.rows.length === 0) return null;
    return toSession(result.rows.item(0));
  },

  async upsert(session: SessionRow): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      `INSERT OR REPLACE INTO sessions
        (id, title, diagram_path, diagram_remote_id, run_id, bloom_level, status,
         created_at, updated_at, is_synced, qa_count, last_question, last_answer, folder_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        session.id,
        session.title,
        session.diagram_path,
        session.diagram_remote_id ?? null,
        session.run_id ?? null,
        session.bloom_level ?? null,
        session.status ?? 'local',
        session.created_at,
        session.updated_at,
        session.is_synced,
        session.qa_count,
        session.last_question ?? null,
        session.last_answer ?? null,
        session.folder_id ?? null,
      ],
    );
  },

  async update(session: SessionRow): Promise<void> {
    await SessionDao.upsert(session);
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.executeSql('DELETE FROM sessions WHERE id = ?;', [id]);
  },

  async clearAll(): Promise<void> {
    const db = await getDb();
    await db.executeSql('DELETE FROM sessions;');
  },

  async markSynced(id: string): Promise<void> {
    const db = await getDb();
    await db.executeSql('UPDATE sessions SET is_synced = 1 WHERE id = ?;', [id]);
  },

  async updateStatus(id: string, status: string, qaCount: number): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      'UPDATE sessions SET status = ?, qa_count = ?, updated_at = ? WHERE id = ?;',
      [status, qaCount, Date.now(), id],
    );
  },

  async updateSummary(
    id: string,
    count: number,
    q: string | null,
    a: string | null,
    ts: number,
  ): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      `UPDATE sessions SET qa_count = ?, last_question = ?, last_answer = ?, updated_at = ?
       WHERE id = ?;`,
      [count, q, a, ts, id],
    );
  },
};

export default SessionDao;

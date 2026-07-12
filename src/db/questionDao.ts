/**
 * QuestionDao — CRUD for the local `questions` SQLite table.
 * Questions are populated by the pipeline SSE stream when the `results`
 * stage completes. They're read back offline so the user can study without
 * a network connection.
 */
import { getDb } from './database';
import type { QuestionRow, LocalQuestion } from '../types/models';
import { toLocalQuestion } from '../types/models';

export const QuestionDao = {
  async getBySession(sessionId: string): Promise<LocalQuestion[]> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT * FROM questions WHERE session_id = ? ORDER BY rowid ASC',
      [sessionId]
    );
    const rows: LocalQuestion[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(toLocalQuestion(result.rows.item(i) as QuestionRow));
    }
    return rows;
  },

  async count(sessionId: string): Promise<number> {
    const db = await getDb();
    const [result] = await db.executeSql(
      'SELECT COUNT(*) as cnt FROM questions WHERE session_id = ?',
      [sessionId]
    );
    return result.rows.item(0).cnt as number;
  },

  async upsert(q: QuestionRow): Promise<void> {
    const db = await getDb();
    await db.executeSql(
      `INSERT OR REPLACE INTO questions
        (id, session_id, bloom_level, type, text, options, answer,
         explanation, verification_score, verification_verdict, is_approved,
         correct_option_index)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        q.id,
        q.session_id,
        q.bloom_level,
        q.type,
        q.text,
        q.options ?? null,
        q.answer,
        q.explanation ?? null,
        q.verification_score ?? null,
        q.verification_verdict ?? null,
        q.is_approved,
        q.correct_option_index ?? null,
      ]
    );
  },

  async clearForSession(sessionId: string): Promise<void> {
    const db = await getDb();
    await db.executeSql('DELETE FROM questions WHERE session_id = ?', [sessionId]);
  },
};

export default QuestionDao;

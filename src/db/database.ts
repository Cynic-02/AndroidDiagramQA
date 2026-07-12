/**
 * SQLite database schema for the DiagramMind mobile app.
 *
 * Tables:
 *  - sessions       — local run/session cache (mirrors website Run)
 *  - messages       — offline chat message queue
 *  - pending_ops    — offline operation queue
 *  - questions      — cached FinalQAItem list per session
 *  - chat_messages  — cached API chat history per session
 *  - user_session   — single-row authenticated user cache
 */
import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabase({ name: 'diagramqa.db', location: 'default' });
  await initSchema(db);
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

async function initSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.executeSql('PRAGMA foreign_keys = ON;');

  // ── sessions ───────────────────────────────────────────────────────────────
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS sessions (
      id                TEXT PRIMARY KEY NOT NULL,
      title             TEXT NOT NULL,
      diagram_path      TEXT NOT NULL,
      diagram_remote_id TEXT,
      run_id            TEXT,
      bloom_level       TEXT,
      status            TEXT NOT NULL DEFAULT 'local',
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL,
      is_synced         INTEGER NOT NULL DEFAULT 0,
      qa_count          INTEGER NOT NULL DEFAULT 0,
      last_question     TEXT,
      last_answer       TEXT,
      folder_id         TEXT
    );
  `);
  await database.executeSql(
    `CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);`
  );

  // Migration: add new columns to existing installs (safe — IF NOT EXISTS guards)
  const newCols = [
    { name: 'run_id',       def: 'TEXT' },
    { name: 'bloom_level',  def: 'TEXT' },
    { name: 'status',       def: "TEXT NOT NULL DEFAULT 'local'" },
    { name: 'qa_count',     def: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'folder_id',    def: 'TEXT' },
  ];
  for (const col of newCols) {
    try {
      await database.executeSql(
        `ALTER TABLE sessions ADD COLUMN ${col.name} ${col.def};`
      );
    } catch {
      // Column already exists — ignore
    }
  }

  // ── messages ───────────────────────────────────────────────────────────────
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT PRIMARY KEY NOT NULL,
      session_id  TEXT NOT NULL,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      timestamp   INTEGER NOT NULL,
      is_synced   INTEGER NOT NULL DEFAULT 0,
      is_pending  INTEGER NOT NULL DEFAULT 0,
      error_state TEXT,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
  await database.executeSql(
    `CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);`
  );

  // ── pending_ops ────────────────────────────────────────────────────────────
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS pending_ops (
      id          TEXT PRIMARY KEY NOT NULL,
      session_id  TEXT NOT NULL,
      message_id  TEXT NOT NULL,
      op_type     TEXT NOT NULL,
      payload     TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0
    );
  `);
  await database.executeSql(
    `CREATE INDEX IF NOT EXISTS idx_pending_ops_session_id ON pending_ops(session_id);`
  );

  // ── questions (cached FinalQAItem[]) ───────────────────────────────────────
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS questions (
      id                   TEXT PRIMARY KEY NOT NULL,
      session_id           TEXT NOT NULL,
      bloom_level          TEXT NOT NULL,
      type                 TEXT NOT NULL,
      text                 TEXT NOT NULL,
      options              TEXT,
      answer               TEXT NOT NULL,
      explanation          TEXT,
      verification_score   INTEGER,
      verification_verdict TEXT,
      is_approved          INTEGER NOT NULL DEFAULT 1,
      correct_option_index INTEGER,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
  await database.executeSql(
    `CREATE INDEX IF NOT EXISTS idx_questions_session_id ON questions(session_id);`
  );
  // Migration for existing installs
  try {
    await database.executeSql(`ALTER TABLE questions ADD COLUMN correct_option_index INTEGER;`);
  } catch { /* column already exists */ }

  // ── chat_messages (cached /api/chat history) ───────────────────────────────
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id         TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      role       TEXT NOT NULL,
      content    TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
    );
  `);
  await database.executeSql(
    `CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);`
  );

  // ── user_session (single authenticated user row) ───────────────────────────
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS user_session (
      id    TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      name  TEXT,
      token TEXT NOT NULL
    );
  `);
}

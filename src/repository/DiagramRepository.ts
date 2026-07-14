/**
 * DiagramRepository — the single coordination layer between the website
 * API, local SQLite cache, and the offline queue.
 *
 * Architecture:
 *  ┌─ Screens / Hooks ─────────────────────────────────────────────┐
 *  │  useSessions  useChat  useAuth  usePipeline                    │
 *  └──────────────────────────┬───────────────────────────────────-─┘
 *                             │
 *  ┌── DiagramRepository ─────▼───────────────────────────────────┐
 *  │  All methods return Result<T> or throw — never return null    │
 *  │  for network errors.                                          │
 *  └──┬──────────────────────────────────────────────────────┬────┘
 *     │  Local SQLite (offline cache)                        │ Remote Next.js API
 *  SessionDao / MessageDao / QuestionDao / ChatMessageDao  apiClient (axios)
 */
import RNFS from 'react-native-fs';
import { v4 as uuidv4 } from 'uuid';
import SessionDao from '../db/sessionDao';
import { MessageDao } from '../db/messageDao';
import { PendingOpDao } from '../db/pendingOpDao';
import QuestionDao from '../db/questionDao';
import ChatMessageDao from '../db/chatMessageDao';
import {
  apiCreateRun,
  apiGetRun,
  apiDeleteRun,
  apiChat,
  apiGetChatHistory,
  apiGetHistory,
  apiSaveAttempt,
  apiGradeAnswer,
  apiGetStats,
  getRunStreamUrl,
  BASE_URL,
  TokenStore,
} from '../api/apiClient';
import { NetworkMonitor } from '../utils/NetworkMonitor';
import type {
  Session,
  SessionRow,
  Message,
  MessageRow,
  PendingOpRow,
  LocalQuestion,
  LocalChatMessage,
  QuestionRow,
  ChatMessageRow,
  BloomLevel,
  FinalQAItem,
  StageEvent,
  StageStatus,
  StageId,
  LogLine,
  HistoryItem,
  AppStats,
  GradeResult,
  RunRecord,
} from '../types/models';
import { toSession } from '../types/models';

// ─── Result type (sealed union) ───────────────────────────────────────────────
export type Result<T> =
  | { type: 'success'; data: T }
  | { type: 'error'; message: string }
  | { type: 'offline' }

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Copy a content:// or file:// URI to internal app storage, return new path. */
async function copyToInternal(uri: string): Promise<string> {
  const dest = `${RNFS.DocumentDirectoryPath}/diagram_${Date.now()}.jpg`;
  if (uri.startsWith('content://')) {
    // RNFS supports content:// URIs on Android natively
    await RNFS.copyFile(uri, dest);
  } else if (uri.startsWith('file://')) {
    // Strip the scheme to get raw filesystem path
    await RNFS.copyFile(uri.replace('file://', ''), dest);
  } else {
    // Plain filesystem path
    await RNFS.copyFile(uri, dest);
  }
  return dest;
}

/** Read a local file and return it as a base64 data URL (image/jpeg). */
async function fileToDataUrl(path: string): Promise<string> {
  const base64 = await RNFS.readFile(path, 'base64');
  return `data:image/jpeg;base64,${base64}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export const DiagramRepository = {
  // ── SESSIONS ───────────────────────────────────────────────────────────────

  async getSessions(): Promise<Session[]> {
    return SessionDao.getAll();
  },

  async getSession(id: string): Promise<Session | null> {
    return SessionDao.getById(id);
  },

  /**
   * Create a new session:
   *  1. Copy image to internal storage.
   *  2. POST /api/runs to create a Run on the server (requires auth + network).
   *  3. Save session row locally with run_id + status='running'.
   *  4. Return session so caller can navigate to PipelineScreen.
   */
  async createSession(
    title: string,
    imageUri: string,
    bloomLevel: BloomLevel,
    questionCount = 4,
    mcqOnly = false
  ): Promise<Result<Session>> {
    const token = await TokenStore.get();
    const isGuest = token === 'guest_token';

    if (isGuest) {
      try {
        const localPath = await copyToInternal(imageUri);
        const now = Date.now();
        const sessionRow: SessionRow = {
          id:                uuidv4(),
          title,
          diagram_path:      localPath,
          diagram_remote_id: `guest_diag_${uuidv4()}`,
          run_id:            `guest_run_${uuidv4()}`,
          bloom_level:       bloomLevel,
          status:            'running',
          created_at:        now,
          updated_at:        now,
          is_synced:         1,
          qa_count:          0,
          last_question:     null,
          last_answer:       null,
          folder_id:         null,
        };

        await SessionDao.upsert(sessionRow);
        return { type: 'success', data: toSession(sessionRow) };
      } catch (err) {
        return { type: 'error', message: err instanceof Error ? err.message : 'Failed to create guest session' };
      }
    }

    const isOnline = NetworkMonitor.isConnected();
    if (!isOnline) {
      return { type: 'offline' };
    }

    try {
      const localPath = await copyToInternal(imageUri);
      const dataUrl   = await fileToDataUrl(localPath);

      // Check size limit (~4.2MB base64)
      if (dataUrl.length > 4_200_000) {
        return { type: 'error', message: 'Diagram is too large. Please use an image under ~2.5 MB.' };
      }

      const filename = `diagram_${Date.now()}.jpg`;
      const response = await apiCreateRun({
        filename,
        mimeType:      'image/jpeg',
        dataUrl,
        bloomLevel,
        questionCount,
        mcqOnly,
      });

      const now = Date.now();
      const sessionRow: SessionRow = {
        id:                uuidv4(),
        title,
        diagram_path:      localPath,
        diagram_remote_id: response.diagramId,
        run_id:            response.runId,
        bloom_level:       bloomLevel,
        status:            'running',
        created_at:        now,
        updated_at:        now,
        is_synced:         1,
        qa_count:          0,
        last_question:     null,
        last_answer:       null,
        folder_id:         null,
      };

      await SessionDao.upsert(sessionRow);
      return { type: 'success', data: toSession(sessionRow) };
    } catch (err) {
      return { type: 'error', message: err instanceof Error ? err.message : 'Failed to create session' };
    }
  },

  async deleteSession(session: Session): Promise<void> {
    await SessionDao.delete(session.id);
    try {
      if (session.runId) await apiDeleteRun(session.runId);
    } catch { /* best-effort remote delete */ }
    try {
      const exists = await RNFS.exists(session.diagramPath);
      if (exists) await RNFS.unlink(session.diagramPath);
    } catch { /* ignore file errors */ }
  },

  async clearAllSessions(): Promise<void> {
    await SessionDao.clearAll();
  },

  // ── PIPELINE SSE STREAM ────────────────────────────────────────────────────

  /**
   * Open an SSE connection to GET /api/runs/[runId]/stream.
   *
   * Calls `onStage` for each `stage` event, `onLog` for each `log` event.
   * When the `results` stage fires, automatically saves FinalQAItem[] to
   * the local `questions` table and updates the session row.
   *
   * Returns a cleanup function that aborts the fetch.
   */
  streamPipeline(
    session: Session,
    onStage: (event: StageEvent) => void,
    onLog:   (log: LogLine) => void,
    onDone:  () => void,
    onError: (msg: string) => void
  ): () => void {
    const { runId } = session;
    if (!runId) { onError('No run ID — cannot stream pipeline.'); return () => {}; }

    if (runId.startsWith('guest_run_')) {
      let active = true;
      const timeouts: any[] = [];
      const runMock = async () => {
        const mockStages: { stage: StageId; msg: string; logs: string[] }[] = [
          { stage: 'extraction', msg: 'Parsing diagram structure locally...', logs: ['Detecting nodes...', 'Extracting arrows...'] },
          { stage: 'generation', msg: 'Generating Bloom-level questions...', logs: ['Creating question candidates...', 'Formatting answers...'] },
          { stage: 'answering', msg: 'Answering from diagram only...', logs: ['Executing vision-QA...', 'Verifying accuracy...'] },
          { stage: 'verification', msg: 'Critic checking QA pairs...', logs: ['Verifying terminology...', 'Scoring difficulty...'] },
        ];

        let timeOffset = 1000;
        for (const item of mockStages) {
          if (!active) return;
          const t1 = setTimeout(() => {
            if (!active) return;
            onStage({ runId, stage: item.stage, status: 'running', message: item.msg, timestamp: Date.now() });
            onLog({ runId, stage: item.stage, level: 'info', text: item.logs[0] });
          }, timeOffset);
          const t2 = setTimeout(() => {
            if (!active) return;
            onLog({ runId, stage: item.stage, level: 'success', text: item.logs[1] });
            onStage({ runId, stage: item.stage, status: 'done', message: 'Done.', timestamp: Date.now() });
          }, timeOffset + 2000);
          timeouts.push(t1, t2);
          timeOffset += 3000;
        }

        // Final results stage
        const tDone = setTimeout(async () => {
          if (!active) return;
          const bloom = session.bloomLevel ?? 'Understand';
          const mockQAs: FinalQAItem[] = [
            {
              id: `mock_q1_${uuidv4()}`,
              question: `Identify the main components depicted in this diagram under ${bloom} level.`,
              answer: 'The diagram shows a feedback loop system with input, process, output, and feedback block.',
              bloomLevel: bloom,
              cognitiveSkill: 'Identification',
              verification: 'pass',
              score: 0.95,
              questionType: 'short-answer',
            },
            {
              id: `mock_q2_${uuidv4()}`,
              question: 'Which element is responsible for processing the output feedback?',
              answer: 'The feedback block.',
              bloomLevel: bloom,
              cognitiveSkill: 'Recall',
              verification: 'pass',
              score: 0.92,
              questionType: 'mcq',
              options: ['Input Controller', 'Feedback Block', 'Main Process', 'Output Gate'],
              correctOptionIndex: 1,
            },
            {
              id: `mock_q3_${uuidv4()}`,
              question: 'Explain the role of the input signal in this architecture.',
              answer: 'The input signal initiates the entire state flow, setting initial parameters for the main process.',
              bloomLevel: bloom,
              cognitiveSkill: 'Explanation',
              verification: 'pass',
              score: 0.88,
              questionType: 'short-answer',
            },
            {
              id: `mock_q4_${uuidv4()}`,
              question: 'What happens if the feedback block is removed?',
              answer: 'The system runs in an open loop with no regulatory correction.',
              bloomLevel: bloom,
              cognitiveSkill: 'Analysis',
              verification: 'pass',
              score: 0.90,
              questionType: 'mcq',
              options: ['System stabilizes', 'System runs in open loop', 'System halts completely', 'No change'],
              correctOptionIndex: 1,
            }
          ];

          try {
            await QuestionDao.clearForSession(session.id);
            for (const item of mockQAs) {
              await QuestionDao.upsert({
                id:                   item.id,
                session_id:           session.id,
                bloom_level:          item.bloomLevel,
                type:                 item.questionType === 'mcq' ? 'MCQ' : 'SHORT',
                text:                 item.question,
                options:              item.options ? JSON.stringify(item.options) : null,
                answer:               item.answer,
                explanation:          item.explanation ?? null,
                verification_score:   Math.round(item.score * 100),
                verification_verdict: item.verification.toUpperCase(),
                is_approved:          1,
                correct_option_index: item.correctOptionIndex ?? null,
              });
            }

            await SessionDao.updateSummary(
              session.id,
              mockQAs.length,
              mockQAs[0].question,
              mockQAs[0].answer,
              Date.now()
            );
            await SessionDao.updateStatus(session.id, 'completed', mockQAs.length);

            onStage({
              runId,
              stage: 'results',
              status: 'done',
              message: 'Pipeline completed successfully.',
              data: mockQAs,
              timestamp: Date.now()
            });

            onDone();
          } catch (e) {
            onError(e instanceof Error ? e.message : 'Database error in mock pipeline');
          }
        }, timeOffset);
        timeouts.push(tDone);
      };

      runMock();

      return () => {
        active = false;
        timeouts.forEach(clearTimeout);
      };
    }

    const controller = new AbortController();
    const token = (async () => TokenStore.get())();

    (async () => {
      try {
        const authToken = await token;
        const url = getRunStreamUrl(runId);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        });

        const anyRes = res as any;
        if (!res.ok || !anyRes.body) {
          onError(`Pipeline stream error: ${res.status}`);
          return;
        }

        const reader = anyRes.body.getReader();
        // TextDecoder may not be typed in RN's lib — use inline decoder
        const Decoder: any = (globalThis as any).TextDecoder ?? class {
          decode(v: Uint8Array) { return String.fromCharCode(...Array.from(v)); }
        };
        const decoder = new Decoder('utf-8');
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split('\n\n');
          buf = parts.pop() ?? '';

          for (const part of parts) {
            const lines = part.split('\n');
            let eventName = '';
            let dataStr   = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) eventName = line.slice(7);
              if (line.startsWith('data: '))  dataStr   = line.slice(6);
            }
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (eventName === 'stage') {
                const ev = parsed as StageEvent;
                onStage(ev);

                // ── Save questions to local DB when pipeline completes ──
                if (ev.stage === 'results' && ev.status === 'done' && Array.isArray(ev.data)) {
                  const items = ev.data as FinalQAItem[];
                  await QuestionDao.clearForSession(session.id);
                  for (const item of items) {
                    await QuestionDao.upsert({
                      id:                   item.id,
                      session_id:           session.id,
                      bloom_level:          item.bloomLevel,
                      type:                 item.questionType?.toUpperCase() === 'MCQ' ? 'MCQ' : 'SHORT',
                      text:                 item.question,
                      options:              item.options ? JSON.stringify(item.options) : null,
                      answer:               item.answer,
                      explanation:          item.explanation ?? null,
                      verification_score:   Math.round(item.score * 100),
                      verification_verdict: item.verification.toUpperCase(),
                      is_approved:          1,
                      correct_option_index: item.correctOptionIndex ?? null,
                    });
                  }
                  await SessionDao.updateSummary(
                    session.id,
                    items.length,
                    items[0]?.question ?? null,
                    items[0]?.answer ?? null,
                    Date.now()
                  );
                  await SessionDao.updateStatus(session.id, 'completed', items.length);
                  onDone();
                }
                if (ev.status === 'error') {
                  await SessionDao.updateStatus(session.id, 'failed', 0);
                  onError(ev.message ?? 'Pipeline failed');
                }
              } else if (eventName === 'log') {
                onLog(parsed as LogLine);
              }
            } catch { /* malformed SSE event — skip */ }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          onError(err?.message ?? 'Stream connection lost');
        }
      }
    })();

    return () => controller.abort();
  },

  /**
   * Poll GET /api/runs/[runId] — fallback when SSE drops.
   * Returns the run record. Saves questions to local DB if completed.
   */
  async pollRunStatus(session: Session): Promise<RunRecord | null> {
    if (!session.runId) return null;
    try {
      const run = await apiGetRun(session.runId);

      if (run.status === 'completed' && run.finalQA && run.finalQA.length > 0) {
        await QuestionDao.clearForSession(session.id);
        for (const item of run.finalQA) {
          await QuestionDao.upsert({
            id:                   item.id,
            session_id:           session.id,
            bloom_level:          item.bloomLevel,
            type:                 item.questionType?.toUpperCase() === 'MCQ' ? 'MCQ' : 'SHORT',
            text:                 item.question,
            options:              item.options ? JSON.stringify(item.options) : null,
            answer:               item.answer,
            explanation:          item.explanation ?? null,
            verification_score:   Math.round(item.score * 100),
            verification_verdict: item.verification.toUpperCase(),
            is_approved:          1,
            correct_option_index: item.correctOptionIndex ?? null,
          });
        }
        await SessionDao.updateStatus(session.id, 'completed', run.finalQA.length);
      } else if (run.status === 'failed') {
        await SessionDao.updateStatus(session.id, 'failed', 0);
      }

      return run;
    } catch {
      return null;
    }
  },

  // ── QUESTIONS ──────────────────────────────────────────────────────────────

  async getQuestions(sessionId: string): Promise<LocalQuestion[]> {
    return QuestionDao.getBySession(sessionId);
  },

  // ── CHAT ───────────────────────────────────────────────────────────────────

  async getChatMessages(sessionId: string): Promise<LocalChatMessage[]> {
    return ChatMessageDao.getBySession(sessionId);
  },

  async sendChatMessage(
    session: Session,
    message: string
  ): Promise<Result<string>> {
    if (!session.runId) return { type: 'error', message: 'No run ID for this session.' };

    if (session.runId.startsWith('guest_run_')) {
      try {
        const userMsgId = uuidv4();
        await ChatMessageDao.insert({
          id:         userMsgId,
          session_id: session.id,
          role:       'user',
          content:    message,
          created_at: Date.now(),
        });

        // Mock assistant response
        const reply = `[Guest Mode Analysis] You asked: "${message}". In this diagram, we see clear structural elements including flows and processes. Please sign in to use advanced GPT vision analysis on this diagram!`;
        
        await ChatMessageDao.insert({
          id:         uuidv4(),
          session_id: session.id,
          role:       'assistant',
          content:    reply,
          created_at: Date.now(),
        });

        return { type: 'success', data: reply };
      } catch (err) {
        return { type: 'error', message: err instanceof Error ? err.message : 'Chat failed' };
      }
    }

    if (!NetworkMonitor.isConnected()) return { type: 'offline' };

    try {
      // Save user message locally
      const userMsgId = uuidv4();
      await ChatMessageDao.insert({
        id:         userMsgId,
        session_id: session.id,
        role:       'user',
        content:    message,
        created_at: Date.now(),
      });

      const response = await apiChat({ runId: session.runId, message });

      // Save assistant reply locally
      await ChatMessageDao.insert({
        id:         uuidv4(),
        session_id: session.id,
        role:       'assistant',
        content:    response.reply,
        created_at: Date.now(),
      });

      return { type: 'success', data: response.reply };
    } catch (err) {
      return { type: 'error', message: err instanceof Error ? err.message : 'Chat failed' };
    }
  },

  async syncChatHistory(session: Session): Promise<void> {
    if (!session.runId || !NetworkMonitor.isConnected()) return;
    try {
      const msgs = await apiGetChatHistory(session.runId);
      await ChatMessageDao.clearForSession(session.id);
      for (const m of msgs) {
        await ChatMessageDao.insert({
          id:         m.id,
          session_id: session.id,
          role:       m.role as 'user' | 'assistant',
          content:    m.content,
          created_at: new Date(m.createdAt).getTime(),
        });
      }
    } catch { /* best-effort */ }
  },

  async clearChat(sessionId: string): Promise<void> {
    await ChatMessageDao.clearForSession(sessionId);
    await MessageDao.clearForSession(sessionId);
  },

  // ── STUDY / GRADING ────────────────────────────────────────────────────────

  async gradeAnswer(
    session: Session,
    questionId: string,
    studentAnswer: string
  ): Promise<Result<GradeResult>> {
    if (!session.runId) return { type: 'error', message: 'No run ID' };

    if (session.runId.startsWith('guest_run_')) {
      const score = Math.min(100, Math.max(30, Math.round(30 + Math.random() * 70)));
      return {
        type: 'success',
        data: {
          score,
          feedback: score >= 70
            ? 'Excellent answer! You captured the key concepts of the feedback loops correctly.'
            : 'Good attempt, but you missed some of the detailed flow mechanics. Focus on input/output feedback.',
          conceptMastery: score >= 75,
          weakConcepts: score < 70 ? ['Feedback flow', 'Regulatory loops'] : [],
          studyTip: 'Try looking at the nodes connected directly to the feedback loop outputs.',
        }
      };
    }

    if (!NetworkMonitor.isConnected()) return { type: 'offline' };
    try {
      const result = await apiGradeAnswer(session.runId, questionId, studentAnswer);
      return { type: 'success', data: result };
    } catch (err) {
      return { type: 'error', message: err instanceof Error ? err.message : 'Grading failed' };
    }
  },

  async saveAttempt(
    session: Session,
    score: number,
    total: number,
    answers: Record<string, string>
  ): Promise<void> {
    if (!session.runId || session.runId.startsWith('guest_run_')) return;
    if (!NetworkMonitor.isConnected()) return;
    try {
      await apiSaveAttempt(session.runId, score, total, answers);
    } catch { /* best-effort */ }
  },

  // ── HISTORY (from website, syncs to local sessions) ───────────────────────

  async fetchHistory(cursor?: string): Promise<{ items: HistoryItem[]; nextCursor: string | null }> {
    try {
      const data = await apiGetHistory(40, cursor);
      // Sync each remote run into local sessions table
      for (const item of data.items) {
        const existing = await SessionDao.getByRunId(item.id);
        if (!existing) {
          const now = Date.now();
          await SessionDao.upsert({
            id:                uuidv4(),
            title:             item.filename.replace(/\.[^.]+$/, ''),
            diagram_path:      '',      // no local copy — user can tap to view
            diagram_remote_id: item.id,
            run_id:            item.id,
            bloom_level:       item.bloomLevel,
            status:            item.status,
            created_at:        new Date(item.createdAt).getTime(),
            updated_at:        item.completedAt ? new Date(item.completedAt).getTime() : now,
            is_synced:         1,
            qa_count:          item.qaCount,
            last_question:     null,
            last_answer:       null,
            folder_id:         null,
          });
        }
      }
      return data;
    } catch {
      return { items: [], nextCursor: null };
    }
  },

  // ── LEGACY offline message queue (pending_ops) ────────────────────────────

  async getMessages(sessionId: string): Promise<Message[]> {
    return MessageDao.getBySession(sessionId);
  },

  async hasPending(): Promise<boolean> {
    const count = await PendingOpDao.count();
    return count > 0;
  },

  async syncPending(): Promise<number> {
    const ops = await PendingOpDao.getAll();
    let synced = 0;
    for (const op of ops) {
      try {
        const session = await SessionDao.getById(op.session_id);
        if (!session || !session.runId) {
          await PendingOpDao.delete(op.id);
          continue;
        }
        if (op.op_type === 'ask') {
          const payload = JSON.parse(op.payload) as { question: string };
          const result = await apiChat({ runId: session.runId, message: payload.question });
          await MessageDao.markSynced(op.message_id);
          await ChatMessageDao.insert({
            id:         uuidv4(),
            session_id: op.session_id,
            role:       'assistant',
            content:    result.reply,
            created_at: Date.now(),
          });
          await PendingOpDao.delete(op.id);
          synced++;
        }
      } catch {
        await PendingOpDao.bumpRetry(op.id);
      }
    }
    return synced;
  },

  // ── STATS ──────────────────────────────────────────────────────────────────

  async getStats(): Promise<AppStats | null> {
    try {
      return await apiGetStats();
    } catch {
      return null;
    }
  },
};

export default DiagramRepository;


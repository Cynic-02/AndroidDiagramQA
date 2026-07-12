/**
 * Mobile app data model types — aligned with the DiagramMind website schema.
 *
 * Three layers:
 *  1. SQLite raw row interfaces (snake_case)  — local DB cache
 *  2. App-facing interfaces (camelCase)        — used in components & hooks
 *  3. Website-aligned API types               — mirrored from src/lib/types.ts
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. PIPELINE / WEBSITE TYPES  (mirrors CSE499/src/lib/types.ts exactly)
// ─────────────────────────────────────────────────────────────────────────────

export type StageId =
  | 'upload'
  | 'extraction'
  | 'generation'
  | 'answering'
  | 'verification'
  | 'results'

export type StageStatus = 'idle' | 'running' | 'done' | 'flagged' | 'error'

export type BloomLevel =
  | 'Remember'
  | 'Understand'
  | 'Apply'
  | 'Analyze'
  | 'Evaluate'
  | 'Create'

export const BLOOM_LEVELS: BloomLevel[] = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
]

export const BLOOM_EMOJIS: Record<BloomLevel, string> = {
  Remember:   '🧠',
  Understand: '💡',
  Apply:      '🔧',
  Analyze:    '🔍',
  Evaluate:   '⚖️',
  Create:     '✨',
}

export type QuestionType = 'short-answer' | 'mcq'

export interface ExtractedEntity {
  id: string
  label: string
  type: string
  role?: string
}

export interface ExtractedRelationship {
  from: string
  to: string
  label: string
  kind?: string
}

export interface ExtractionOutput {
  diagramType: string
  summary: string
  entities: ExtractedEntity[]
  relationships: ExtractedRelationship[]
  layoutNotes?: string
}

export interface GeneratedQuestion {
  id: string
  text: string
  bloomLevel: BloomLevel
  cognitiveSkill: string
  targets: string[]
  questionType?: QuestionType
  options?: string[]
  correctOptionIndex?: number
}

export interface GeneratedAnswer {
  questionId: string
  answer: string
  reasoning: string
  confidence: number
  selectedOptionIndex?: number
}

export interface VerificationVerdict {
  questionId: string
  status: 'pass' | 'reject' | 'flagged'
  correctness: 'correct' | 'partial' | 'incorrect'
  ambiguity: boolean
  difficultyAccurate: boolean
  leakRisk: boolean
  issues: string[]
  suggestion?: string
}

export interface FinalQAItem {
  id: string
  question: string
  answer: string
  bloomLevel: BloomLevel
  cognitiveSkill: string
  verification: 'pass' | 'flagged'
  score: number
  questionType?: QuestionType
  options?: string[]
  correctOptionIndex?: number
  explanation?: string
}

export interface StageEvent {
  runId: string
  stage: StageId
  status: StageStatus
  message?: string
  provider?: string
  model?: string
  data?:
    | ExtractionOutput
    | GeneratedQuestion[]
    | GeneratedAnswer[]
    | VerificationVerdict[]
    | FinalQAItem[]
    | null
  timestamp: number
}

export interface LogLine {
  runId: string
  stage: StageId
  level: 'info' | 'warn' | 'error' | 'success'
  text: string
}

export interface RunRecord {
  id: string
  diagramId: string
  filename: string
  dataUrl: string
  bloomLevel: BloomLevel
  status: 'running' | 'completed' | 'failed'
  provider?: string
  diagramType?: string
  extraction?: ExtractionOutput
  questions?: GeneratedQuestion[]
  answers?: GeneratedAnswer[]
  verification?: VerificationVerdict[]
  finalQA?: FinalQAItem[]
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  folderId?: string
  questionsList?: LocalQuestion[]
  createdAt: string
}

export interface CreateRunResponse {
  runId: string
  diagramId: string
}

/** Lightweight item returned by GET /api/history */
export interface HistoryItem {
  id: string           // runId
  filename: string
  dataUrl: string      // base64 thumbnail
  bloomLevel: BloomLevel
  status: 'running' | 'completed' | 'failed'
  diagramType?: string
  qaCount: number
  provider?: string
  durationMs?: number
  completedAt?: string
  createdAt: string
}

/** API chat message shape */
export interface ApiChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

/** Authenticated user from the website */
export interface AuthUser {
  id: string
  email: string
  name: string | null
}

/** POST /api/runs/[id]/grade response */
export interface GradeResult {
  score: number
  feedback: string
  conceptMastery: boolean
  weakConcepts: string[]
  studyTip: string
}

/** Student attempt */
export interface StudentAttempt {
  id: string
  runId: string
  score: number
  total: number
  answers: Record<string, string>
  createdAt: string
}

/** GET /api/stats response */
export interface AppStats {
  runs: {
    total: number
    completed: number
    failed: number
    running: number
    successRate: number
    averageDurationMs: number | null
    byBloomLevel: Record<string, number>
  }
  agents: number
  providers: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LOCAL SQLite ROW TYPES  (snake_case — match CREATE TABLE columns)
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionRow {
  id: string
  title: string
  diagram_path: string        // local file path (content:// or file://)
  diagram_remote_id: string | null  // website diagramId after upload
  run_id: string | null       // website runId
  bloom_level: string | null  // BloomLevel string
  status: string              // 'running' | 'completed' | 'failed' | 'local'
  created_at: number
  updated_at: number
  is_synced: number           // 0/1
  qa_count: number            // number of finalQA items
  last_question: string | null
  last_answer: string | null
  folder_id: string | null
}

export interface MessageRow {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  is_synced: number
  is_pending: number
  error_state: string | null
}

export interface PendingOpRow {
  id: string
  session_id: string
  message_id: string
  op_type: 'ask' | 'upload_diagram'
  payload: string
  created_at: number
  retry_count: number
}

export interface QuestionRow {
  id: string
  session_id: string
  bloom_level: string
  type: string            // 'MCQ' | 'SHORT'
  text: string
  options: string | null  // JSON array
  answer: string
  explanation: string | null
  verification_score: number | null
  verification_verdict: string | null
  is_approved: number     // 0/1
  correct_option_index: number | null  // MCQ correct answer index
}

export interface ChatMessageRow {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: number
}

export interface UserSessionRow {
  id: string
  email: string
  name: string | null
  token: string           // JWT Bearer token
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. APP-FACING INTERFACES  (camelCase — what hooks/components use)
// ─────────────────────────────────────────────────────────────────────────────

export interface Session {
  id: string
  title: string
  diagramPath: string
  diagramRemoteId: string | null
  runId: string | null
  bloomLevel: BloomLevel | null
  status: 'running' | 'completed' | 'failed' | 'local'
  createdAt: number
  updatedAt: number
  isSynced: boolean
  qaCount: number
  lastQuestion: string | null
  lastAnswer: string | null
  folderId: string | null
}

export interface Message {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isSynced: boolean
  isPending: boolean
  errorState: string | null
}

export interface PendingOp extends PendingOpRow {}

/** A locally cached question from the pipeline */
export interface LocalQuestion {
  id: string
  sessionId: string
  bloomLevel: BloomLevel
  type: 'MCQ' | 'SHORT'
  text: string
  options: string[] | null
  answer: string
  explanation: string | null
  verificationScore: number | null
  verificationVerdict: string | null
  isApproved: boolean
  correctOptionIndex: number | null  // MCQ correct answer (0-based)
}

/** A locally cached chat message */
export interface LocalChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONVERTERS
// ─────────────────────────────────────────────────────────────────────────────

export function toSession(row: SessionRow): Session {
  return {
    id:              row.id,
    title:           row.title,
    diagramPath:     row.diagram_path,
    diagramRemoteId: row.diagram_remote_id,
    runId:           row.run_id,
    bloomLevel:      (row.bloom_level as BloomLevel | null) ?? null,
    status:          (row.status as Session['status']) ?? 'local',
    createdAt:       row.created_at,
    updatedAt:       row.updated_at,
    isSynced:        row.is_synced === 1,
    qaCount:         row.qa_count,
    lastQuestion:    row.last_question,
    lastAnswer:      row.last_answer,
    folderId:        row.folder_id,
  }
}

export function toMessage(row: MessageRow): Message {
  return {
    id:         row.id,
    sessionId:  row.session_id,
    role:       row.role,
    content:    row.content,
    timestamp:  row.timestamp,
    isSynced:   row.is_synced === 1,
    isPending:  row.is_pending === 1,
    errorState: row.error_state,
  }
}

export function toLocalQuestion(row: QuestionRow): LocalQuestion {
  return {
    id:                   row.id,
    sessionId:            row.session_id,
    bloomLevel:           row.bloom_level as BloomLevel,
    type:                 row.type as 'MCQ' | 'SHORT',
    text:                 row.text,
    options:              row.options ? JSON.parse(row.options) : null,
    answer:               row.answer,
    explanation:          row.explanation,
    verificationScore:    row.verification_score,
    verificationVerdict:  row.verification_verdict,
    isApproved:           row.is_approved === 1,
    correctOptionIndex:   row.correct_option_index ?? null,
  }
}

export function toLocalChatMessage(row: ChatMessageRow): LocalChatMessage {
  return {
    id:        row.id,
    sessionId: row.session_id,
    role:      row.role,
    content:   row.content,
    createdAt: row.created_at,
  }
}

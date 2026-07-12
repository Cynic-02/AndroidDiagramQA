/**
 * API client — targets the DiagramMind Next.js backend (port 3000).
 *
 * Auth: Bearer token stored in AsyncStorage and injected via an Axios
 * request interceptor. This avoids relying on HttpOnly cookies which
 * React Native's networking layer cannot access.
 *
 * Base URL: http://10.0.2.2:3000  (Android emulator → host machine :3000)
 * Override: set DIAGRAMMIND_BASE_URL env var for real device / staging.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CreateRunResponse,
  RunRecord,
  HistoryItem,
  ApiChatMessage,
  GradeResult,
  StudentAttempt,
  AppStats,
  AuthUser,
  BloomLevel,
  FinalQAItem,
  LocalQuestion,
} from '../types/models';

// ─── Base URL ────────────────────────────────────────────────────────────────
// 10.0.2.2 is the special Android emulator alias for the host loopback.
// On a real device replace with the machine's LAN IP or deployed URL.
export const BASE_URL =
  (typeof __DEV__ !== 'undefined' ? 'http://10.0.2.2:3000' : 'http://10.0.2.2:3000');

const AUTH_TOKEN_KEY = '@diagrammind_auth_token';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Bearer token if we have one ─────────────────
client.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore — worst case the request goes out unauthenticated
  }
  return config;
});

// ─── Token helpers ───────────────────────────────────────────────────────────
export const TokenStore = {
  async save(token: string) {
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  },
  async clear() {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  },
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginRequest  { email: string; password: string }
export interface RegisterRequest { email: string; password: string; name?: string }
export interface AuthResponse  { user: AuthUser; token: string }

export async function apiLogin(body: LoginRequest): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/api/auth/login', body);
  return data;
}

export async function apiRegister(body: RegisterRequest): Promise<AuthResponse> {
  const { data } = await client.post<AuthResponse>('/api/auth/register', body);
  return data;
}

export async function apiLogout(): Promise<void> {
  await client.post('/api/auth/logout');
}

export async function apiGetMe(): Promise<AuthUser | null> {
  try {
    const { data } = await client.get<{ user: AuthUser | null }>('/api/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNS ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateRunBody {
  filename: string
  mimeType: string
  dataUrl: string          // base64 data URL, must start with 'data:image/'
  bloomLevel: BloomLevel
  provider?: string
  questionCount?: number   // 1–20
  mcqOnly?: boolean
}

export async function apiCreateRun(body: CreateRunBody): Promise<CreateRunResponse> {
  const { data } = await client.post<CreateRunResponse>('/api/runs', body);
  return data;
}

export async function apiGetRun(runId: string): Promise<RunRecord> {
  const { data } = await client.get<RunRecord>(`/api/runs/${runId}`);
  return data;
}

export async function apiDeleteRun(runId: string): Promise<void> {
  await client.delete(`/api/runs/${runId}`);
}

export async function apiPatchRunFolder(runId: string, folderId: string | null): Promise<void> {
  await client.patch(`/api/runs/${runId}`, { folderId });
}

// ─── GET /api/runs/[id]/stream — SSE pipeline stream ────────────────────────
// Returns the full URL string; the caller uses fetch() or EventSource to
// open the SSE connection (Axios does not support streaming on RN).
export function getRunStreamUrl(runId: string): string {
  return `${BASE_URL}/api/runs/${runId}/stream`;
}

// ─── Student attempts ────────────────────────────────────────────────────────
export async function apiSaveAttempt(
  runId: string,
  score: number,
  total: number,
  answers: Record<string, string>
): Promise<StudentAttempt> {
  const { data } = await client.post<{ attempt: StudentAttempt }>(
    `/api/runs/${runId}/attempts`,
    { score, total, answers }
  );
  return data.attempt;
}

export async function apiGradeAnswer(
  runId: string,
  questionId: string,
  studentAnswer: string
): Promise<GradeResult> {
  const { data } = await client.post<GradeResult>(
    `/api/runs/${runId}/grade`,
    { questionId, studentAnswer }
  );
  return data;
}

export async function apiExportRun(
  runId: string,
  format: 'csv' | 'moodle' | 'qti' = 'csv'
): Promise<string> {
  const { data } = await client.get<string>(
    `/api/runs/${runId}/export?format=${format}`,
    { responseType: 'text' }
  );
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

export interface ChatRequest  { runId: string; message: string; provider?: string }
export interface ChatResponse { reply: string; reasoning?: string; provider?: string; model?: string }

export async function apiChat(body: ChatRequest): Promise<ChatResponse> {
  const { data } = await client.post<ChatResponse>('/api/chat', body);
  return data;
}

export async function apiGetChatHistory(runId: string): Promise<ApiChatMessage[]> {
  const { data } = await client.get<{ messages: ApiChatMessage[] }>(
    `/api/chat?runId=${encodeURIComponent(runId)}`
  );
  return data.messages;
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────

export interface HistoryResponse {
  items: HistoryItem[]
  nextCursor: string | null
}

export async function apiGetHistory(
  limit = 40,
  cursor?: string,
  status?: 'running' | 'completed' | 'failed',
  q?: string
): Promise<HistoryResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (status) params.set('status', status);
  if (q)      params.set('q', q);
  const { data } = await client.get<HistoryResponse>(`/api/history?${params}`);
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────────────────────

export async function apiGetStats(): Promise<AppStats> {
  const { data } = await client.get<AppStats>('/api/stats');
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

export async function apiPing(): Promise<boolean> {
  try {
    await client.get('/api/health', { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

export default client;

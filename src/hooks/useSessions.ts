/**
 * useSessions — React hook that mirrors HomeViewModel.kt.
 *
 * Provides:
 *   sessions      → list of all sessions, sorted updated_at DESC
 *   isOnline      → live connectivity flag
 *   toast         → ephemeral user-facing message
 *   newSession()  → create a new session from a picked image URI
 *   deleteSession() → delete a session (with confirmation in the UI)
 *   clearAll()    → delete every session
 *   syncPending() → flush offline-queued operations
 *   dismissToast()
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { DiagramRepository } from '../repository/DiagramRepository';
import { NetworkMonitor } from '../utils/NetworkMonitor';
import { Session } from '../types/models';

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isOnline, setIsOnline] = useState(NetworkMonitor.isConnected());
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Keep a ref to avoid stale closures in the network listener
  const isMounted = useRef(true);

  // ── Load sessions from DB ─────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      const list = await DiagramRepository.getSessions();
      if (isMounted.current) setSessions(list);
    } catch (e: any) {
      if (isMounted.current) setToast(e?.message ?? 'Failed to load sessions');
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    refresh();
    return () => { isMounted.current = false; };
  }, [refresh]);

  // ── Network monitor ───────────────────────────────────────────────────────
  useEffect(() => {
    NetworkMonitor.start();
    let prevOnline: boolean | null = null;
    const unsub = NetworkMonitor.subscribe(online => {
      if (!isMounted.current) return;
      setIsOnline(online);
      // Only auto-sync on genuine reconnection (false → true), not on mount
      if (prevOnline === false && online) {
        DiagramRepository.syncPending().catch(() => {});
        refresh();
      }
      prevOnline = online;
    });
    return unsub;
  }, [refresh]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const newSession = useCallback(
    async (title: string, imageUri: string, bloomLevel: import('../types/models').BloomLevel = 'Understand'): Promise<Session | null> => {
      setLoading(true);
      try {
        const result = await DiagramRepository.createSession(title, imageUri, bloomLevel);
        if (result.type === 'success') {
          await refresh();
          if (isMounted.current) setToast('Session created');
          return result.data;
        } else if (result.type === 'error') {
          if (isMounted.current) setToast(result.message);
        } else {
          if (isMounted.current) setToast('You are offline. Connect to create a session.');
        }
        return null;
      } catch (e: any) {
        if (isMounted.current) setToast(`Could not load diagram: ${e?.message}`);
        return null;
      } finally {
        if (isMounted.current) setLoading(false);
      }
    },
    [refresh],
  );

  const deleteSession = useCallback(
    async (session: Session) => {
      try {
        await DiagramRepository.deleteSession(session);
        await refresh();
        if (isMounted.current) setToast('Session deleted');
      } catch (e: any) {
        if (isMounted.current) setToast(`Could not delete session: ${e?.message}`);
      }
    },
    [refresh],
  );

  const clearAll = useCallback(async () => {
    try {
      await DiagramRepository.clearAllSessions();
      await refresh();
      if (isMounted.current) setToast('All sessions cleared');
    } catch (e: any) {
      if (isMounted.current) setToast(`Could not clear sessions: ${e?.message}`);
    }
  }, [refresh]);

  const syncPending = useCallback(async () => {
    try {
      await DiagramRepository.syncPending();
      await refresh();
    } catch (e: any) {
      if (isMounted.current) setToast(e?.message ?? 'Sync failed');
    }
  }, [refresh]);

  const dismissToast = useCallback(() => setToast(null), []);

  return {
    sessions,
    isOnline,
    toast,
    loading,
    newSession,
    deleteSession,
    clearAll,
    syncPending,
    dismissToast,
    refresh,
  };
}

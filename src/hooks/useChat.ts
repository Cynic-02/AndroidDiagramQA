/**
 * useChat — React hook that mirrors QnAViewModel.kt.
 *
 * Provides:
 *   session       → the active Session object
 *   messages      → ordered message list for the session
 *   isOnline      → live connectivity flag
 *   sending       → true while a question is in-flight (shows typing indicator)
 *   toast         → ephemeral user-facing message
 *   syncedToast   → fires once when offline messages are synced
 *   loadSession() → load (or switch to) a session by id
 *   newSession()  → create a new session from an image URI
 *   ask()         → send a question
 *   clearChat()   → delete all messages in the session
 *   onConnectionRestored() → flush pending ops after going online
 *   dismissToast()
 *   dismissSyncedToast()
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { DiagramRepository } from '../repository/DiagramRepository';
import { NetworkMonitor } from '../utils/NetworkMonitor';
import { Session, Message } from '../types/models';

export function useChat() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isOnline, setIsOnline] = useState(NetworkMonitor.isConnected());
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [syncedToast, setSyncedToast] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    NetworkMonitor.start();
    const unsub = NetworkMonitor.subscribe(online => {
      if (!isMounted.current) return;
      setIsOnline(online);
    });
    return () => {
      isMounted.current = false;
      unsub();
    };
  }, []);

  // ── Load helpers ─────────────────────────────────────────────────────────

  const reloadMessages = useCallback(async (sessionId: string) => {
    try {
      const msgs = await DiagramRepository.getMessages(sessionId);
      if (isMounted.current) setMessages(msgs);
    } catch { /* silent */ }
  }, []);

  const reloadSession = useCallback(async (sessionId: string) => {
    try {
      const s = await DiagramRepository.getSession(sessionId);
      if (isMounted.current) setSession(s);
    } catch { /* silent */ }
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────────

  const loadSession = useCallback(
    async (id: string) => {
      await Promise.all([reloadSession(id), reloadMessages(id)]);
    },
    [reloadSession, reloadMessages],
  );

  const newSession = useCallback(
    async (
      title: string,
      imageUri: string,
      bloomLevel: import('../types/models').BloomLevel = 'Understand',
      onCreated?: (id: string) => void,
    ): Promise<Session | null> => {
      try {
        const result = await DiagramRepository.createSession(title, imageUri, bloomLevel);
        if (result.type !== 'success') return null;
        const s = result.data;
        if (isMounted.current) {
          setSession(s);
          setMessages([]);
        }
        onCreated?.(s.id);
        return s;
      } catch (e: any) {
        if (isMounted.current) setToast(`Could not load diagram: ${e?.message}`);
        return null;
      }
    },
    [],
  );

  const ask = useCallback(
    async (question: string) => {
      const sid = session?.id;
      if (!sid) {
        setToast('Pick a diagram first');
        return;
      }
      if (!question.trim()) {
        setToast('Type a question first');
        return;
      }
      if (isMounted.current) setSending(true);
      try {
        const result = await DiagramRepository.sendChatMessage(session, question);
        // Always reload messages from DB so the UI is in sync
        await reloadMessages(sid);
        await reloadSession(sid);

        if (result.type === 'offline') {
          if (isMounted.current) setToast('Queued — will send when you reconnect');
        } else if (result.type === 'error') {
          if (isMounted.current) setToast(result.message);
        }
      } catch (e: any) {
        if (isMounted.current) setToast(e?.message ?? 'Could not send question');
      } finally {
        if (isMounted.current) setSending(false);
      }
    },
    [session, reloadMessages, reloadSession],
  );

  const clearChat = useCallback(async () => {
    const sid = session?.id;
    if (!sid) return;
    try {
      await DiagramRepository.clearChat(sid);
      await reloadMessages(sid);
      await reloadSession(sid);
      if (isMounted.current) setToast('Chat cleared');
    } catch (e: any) {
      if (isMounted.current) setToast(`Could not clear chat: ${e?.message}`);
    }
  }, [session, reloadMessages, reloadSession]);

  const onConnectionRestored = useCallback(async () => {
    const sid = session?.id;
    if (!sid) return;
    try {
      const count = await DiagramRepository.syncPending();
      if (count > 0) {
        await reloadMessages(sid);
        await reloadSession(sid);
        if (isMounted.current) setSyncedToast(true);
      }
    } catch (e: any) {
      if (isMounted.current) setToast(e?.message ?? 'Could not sync pending questions');
    }
  }, [session, reloadMessages, reloadSession]);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (isOnline && session?.id) {
      onConnectionRestored();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const dismissToast = useCallback(() => setToast(null), []);
  const dismissSyncedToast = useCallback(() => setSyncedToast(false), []);

  return {
    session,
    messages,
    isOnline,
    sending,
    toast,
    syncedToast,
    loadSession,
    newSession,
    ask,
    clearChat,
    onConnectionRestored,
    dismissToast,
    dismissSyncedToast,
    reloadMessages,
    reloadSession,
  };
}

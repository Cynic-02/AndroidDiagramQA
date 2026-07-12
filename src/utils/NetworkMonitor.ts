/**
 * Network connectivity monitor — mirrors NetworkMonitor.kt.
 *
 * Uses @react-native-community/netinfo to watch the connection state and
 * exposes:
 *   subscribe(cb)  → register a listener, returns an unsubscribe fn
 *   isConnected()  → sync snapshot (best-effort)
 *
 * The subscriber receives `true` when connected and `false` when offline.
 */
import NetInfo, {
  NetInfoState,
  NetInfoSubscription,
} from '@react-native-community/netinfo';

type Listener = (online: boolean) => void;

let _isConnected = true;
const _listeners = new Set<Listener>();

let _netInfoUnsub: NetInfoSubscription | null = null;

function notify(online: boolean) {
  _isConnected = online;
  _listeners.forEach(l => l(online));
}

function handleState(state: NetInfoState) {
  const online =
    !!state.isConnected && (state.isInternetReachable !== false);
  notify(online);
}

export const NetworkMonitor = {
  /** Start monitoring — call once at app startup (mirrors monitor.start()). */
  start() {
    if (_netInfoUnsub) return; // already started
    // Fetch initial state
    NetInfo.fetch().then(handleState).catch(() => notify(false));
    _netInfoUnsub = NetInfo.addEventListener(handleState);
  },

  /** Stop monitoring — call on cleanup. */
  stop() {
    _netInfoUnsub?.();
    _netInfoUnsub = null;
  },

  /** Register a listener. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    _listeners.add(listener);
    // Immediately fire with current state
    listener(_isConnected);
    return () => _listeners.delete(listener);
  },

  /** Synchronous snapshot of current connectivity. */
  isConnected(): boolean {
    return _isConnected;
  },
};

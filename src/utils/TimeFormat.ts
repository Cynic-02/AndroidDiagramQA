/**
 * Friendly relative-time formatter — mirrors TimeFormat.kt exactly.
 *
 *   "just now"  → < 1 min
 *   "5 m"       → minutes
 *   "2 h"       → hours
 *   "Yesterday" → > 1 day but < 2 days
 *   "3 d"       → days (< 7 d)
 *   "Jun 5"     → same year
 *   "Jun 5, 2024" → different year
 */
export const TimeFormat = {
  relative(timestamp: number, now: number = Date.now()): string {
    const delta = now - timestamp;
    const MINUTE = 60 * 1000;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;

    if (delta < MINUTE) return 'just now';
    if (delta < HOUR) return `${Math.floor(delta / MINUTE)} m`;
    if (delta < DAY) return `${Math.floor(delta / HOUR)} h`;
    if (delta < 2 * DAY) return 'Yesterday';
    if (delta < 7 * DAY) return `${Math.floor(delta / DAY)} d`;

    const date = new Date(timestamp);
    const nowDate = new Date(now);
    const sameYear = date.getFullYear() === nowDate.getFullYear();
    const opts: Intl.DateTimeFormatOptions = sameYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString(undefined, opts);
  },

  clock(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  full(timestamp: number): string {
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
};

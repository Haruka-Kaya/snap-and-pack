/**
 * Today's calendar events, ported from flutter-app/lib/calendar.dart.
 * Permission denial or any error returns an empty list; the home screen
 * then simply shows the fixed presets (same graceful behavior as Flutter).
 * Web has no device calendar — returns [].
 */

import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

export interface CalEvent {
  id: string;
  title: string;
  start: Date | null;
  location: string | null;
}

/** キャッシュキー(同じ日の同じイベントなら提案を再利用) */
export function calEventKey(e: CalEvent): string {
  const now = new Date();
  return `ev_${e.id}_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export async function todayEvents(): Promise<CalEvent[]> {
  if (Platform.OS === 'web') return [];
  try {
    const perm = await Calendar.requestCalendarPermissionsAsync();
    if (!perm.granted) return [];

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (calendars.length === 0) return [];

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const raw = await Calendar.getEventsAsync(
      calendars.map((c) => c.id),
      dayStart,
      dayEnd,
    );

    const events: CalEvent[] = [];
    const seen = new Set<string>();
    for (const e of raw) {
      const title = (e.title ?? '').trim();
      if (!title) continue;
      const start = e.startDate ? new Date(e.startDate) : null;
      // 同じ予定が複数カレンダーに見えることがあるので重複排除
      const dedup = `${title}@${start ? start.toISOString() : ''}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      events.push({
        id: e.id ?? dedup,
        title,
        start,
        location: e.location ?? null,
      });
    }
    events.sort((a, b) => {
      if (a.start == null) return -1;
      if (b.start == null) return 1;
      return a.start.getTime() - b.start.getTime();
    });
    return events;
  } catch {
    return [];
  }
}

export function formatEventTime(start: Date | null, allDayLabel: string): string {
  if (!start) return allDayLabel;
  return `${start.getHours()}:${String(start.getMinutes()).padStart(2, '0')}`;
}

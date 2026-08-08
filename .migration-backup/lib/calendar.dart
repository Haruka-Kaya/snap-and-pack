import 'package:device_calendar/device_calendar.dart';

/// 今日の予定1件分の最小表現
class CalEvent {
  final String id;
  final String title;
  final DateTime? start;
  final String? location;
  const CalEvent(this.id, this.title, this.start, this.location);

  /// キャッシュキー(同じ日の同じイベントなら提案を再利用)
  String get key =>
      'ev_${id}_${DateTime.now().year}-${DateTime.now().month}-${DateTime.now().day}';
}

/// 端末カレンダー(同期済みの Google カレンダー含む)から今日の予定を読む。
/// 権限拒否・0件時は空リストを返し、UI は固定プリセットのみ表示する。
class CalendarService {
  static final DeviceCalendarPlugin _plugin = DeviceCalendarPlugin();

  static Future<List<CalEvent>> todayEvents() async {
    try {
      var perm = await _plugin.hasPermissions();
      if (perm.data != true) {
        perm = await _plugin.requestPermissions();
        if (perm.data != true) return [];
      }
      final cals = await _plugin.retrieveCalendars();
      final calendars = cals.data;
      if (calendars == null || calendars.isEmpty) return [];

      final now = DateTime.now();
      final dayStart = DateTime(now.year, now.month, now.day);
      final dayEnd = dayStart.add(const Duration(days: 1));

      final events = <CalEvent>[];
      final seen = <String>{};
      for (final cal in calendars) {
        final res = await _plugin.retrieveEvents(
          cal.id,
          RetrieveEventsParams(startDate: dayStart, endDate: dayEnd),
        );
        for (final e in res.data ?? <Event>[]) {
          final title = e.title?.trim() ?? '';
          if (title.isEmpty) continue;
          // 同じ予定が複数カレンダーに見えることがあるので重複排除
          final dedup = '$title@${e.start}';
          if (!seen.add(dedup)) continue;
          events.add(CalEvent(
            e.eventId ?? dedup,
            title,
            e.start,
            e.location,
          ));
        }
      }
      events.sort((a, b) {
        final sa = a.start, sb = b.start;
        if (sa == null) return -1;
        if (sb == null) return 1;
        return sa.compareTo(sb);
      });
      return events;
    } catch (_) {
      return [];
    }
  }
}

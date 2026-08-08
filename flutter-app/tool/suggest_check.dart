// suggestItems(予定→持ち物のAI算出)のPCハーネス。
//   $env:GEMINI_API_KEY="..."; dart run tool/suggest_check.dart
import 'dart:io';

import 'package:wasuremono_zero/api.dart';
import 'package:wasuremono_zero/presets.dart';

Future<void> main() async {
  // マイアイテム相当のダミー(特殊な所持品を混ぜる)
  final myItems = [
    ...baseItemPool,
    const Item('c_meishi', '名刺入れ', '名刺入れ', '🪪'),
    const Item('c_gasunuki', '折りたたみ傘', '折りたたみ傘', '☂️'),
    const Item('c_hoken', '保険証', '保険証', '💊'),
  ];

  final events = [
    ('Builders Weekend ハッカソン', '10:00', '渋谷'),
    ('歯医者', '15:00', null),
    ('飲み会', '19:00', '新宿'),
  ];

  for (final (title, time, loc) in events) {
    final sw = Stopwatch()..start();
    final r = await VisionApi.suggestItems(
        title: title, time: time, location: loc, candidates: myItems);
    sw.stop();
    if (r == null) {
      stdout.writeln('FAIL "$title": 全プロバイダ失敗');
      continue;
    }
    final names = r.ids
        .map((id) => myItems.firstWhere((e) => e.id == id).ja)
        .join(', ');
    final extras = r.extra.map((e) => '${e.$2}${e.$1}').join(', ');
    stdout.writeln('"$title" (${sw.elapsedMilliseconds}ms)');
    stdout.writeln('  選択: $names');
    stdout.writeln('  新規提案: ${extras.isEmpty ? "なし" : extras}');
  }
}

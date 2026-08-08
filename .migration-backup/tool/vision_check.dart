// PC上で判定パイプラインを検証するデバッグハーネス。
// 使い方:
//   $env:GEMINI_API_KEY="..."; dart run tool/vision_check.dart
// tool/fixtures/ の画像を「ハッカソン」プリセットで判定し、期待値と比較する。
import 'dart:io';

import 'package:wasuremono_zero/api.dart';
import 'package:wasuremono_zero/presets.dart';

class Case {
  final List<String> files;
  final List<String> visible; // 写っているアイテム id(期待値)
  const Case(this.files, this.visible);
}

const cases = [
  Case(['laptop.jpg'], ['laptop']),
  Case(['wallet.jpg'], ['wallet']),
  Case(['keys.jpg'], ['keys']),
  Case(['cable.jpg'], ['cable']),
  Case(['battery.jpg'], ['battery']),
  // 本番デモ相当: 4点あり・財布だけ無い机
  Case(['desk_no_wallet.jpg'], ['keys', 'cable', 'battery', 'laptop']),
  // 複数枚(遮蔽対策): 2枚合わせて財布+鍵が写っている → 欠品は残り3つ
  Case(['wallet.jpg', 'keys.jpg'], ['wallet', 'keys']),
  // 複数枚: 机4点+財布単品 → 全部あり(欠品ゼロ)
  Case(['desk_no_wallet.jpg', 'wallet.jpg'],
      ['wallet', 'keys', 'cable', 'battery', 'laptop']),
];

Future<void> main() async {
  final preset = presets.firstWhere((p) => p.id == 'hackathon');
  final allIds = preset.items.map((e) => e.id).toSet();
  var pass = 0, fail = 0;

  for (final c in cases) {
    final files = c.files.map((f) => File('tool/fixtures/$f')).toList();
    if (files.any((f) => !f.existsSync())) {
      stdout.writeln('SKIP ${c.files} (ファイルなし)');
      continue;
    }
    final expectedMissing = allIds.difference(c.visible.toSet());

    final sw = Stopwatch()..start();
    final missing = await VisionApi.findMissing(files, preset.items);
    sw.stop();

    if (missing == null) {
      stdout.writeln('FAIL ${c.files}: 全プロバイダ失敗 (${sw.elapsedMilliseconds}ms)');
      fail++;
      continue;
    }
    final got = missing.toSet();
    final ok =
        got.containsAll(expectedMissing) && expectedMissing.containsAll(got);
    stdout.writeln(
        '${ok ? "PASS" : "FAIL"} ${c.files}: missing=$got expected=$expectedMissing (${sw.elapsedMilliseconds}ms)');
    ok ? pass++ : fail++;
  }
  stdout.writeln('---');
  stdout.writeln('PASS: $pass / FAIL: $fail');
  exitCode = fail > 0 ? 1 : 0;
}

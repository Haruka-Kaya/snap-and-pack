import 'package:flutter/foundation.dart';
import 'strings.dart';

/// アプリ全体の最小状態。3時間ビルドなので Provider は使わない。
final ValueNotifier<AppLang> appLang = ValueNotifier(AppLang.ja);

/// デモモード: 壇上で通信が死んでも発表を止めないための隠しフラグ。
/// HomeScreen のタイトル長押しでトグル。
final ValueNotifier<bool> demoMode = ValueNotifier(false);

/// デモモード時の撮影回数。1回目=欠品あり、2回目以降=出発ヨシ。
int demoAttempt = 0;

import 'dart:ui';

import 'package:flutter/material.dart';

import 'app_state.dart';
import 'screens/home_screen.dart';
import 'store.dart';
import 'strings.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Store.init();
  // 端末ロケールで初期言語を決める(右上ボタンでいつでも切替可)
  final locale = PlatformDispatcher.instance.locale.languageCode;
  appLang.value = locale == 'ja' ? AppLang.ja : AppLang.en;
  runApp(const WasuremonoZeroApp());
}

class WasuremonoZeroApp extends StatelessWidget {
  const WasuremonoZeroApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Snap & Pack',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1A1A1A)),
        fontFamily: null,
      ),
      home: const HomeScreen(),
    );
  }
}

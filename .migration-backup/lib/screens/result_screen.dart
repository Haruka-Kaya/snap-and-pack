import 'package:flutter/material.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:vibration/vibration.dart';

import '../app_state.dart';
import '../presets.dart';
import '../store.dart';
import '../strings.dart';

class ResultScreen extends StatefulWidget {
  const ResultScreen({
    super.key,
    required this.items,
    required this.missingIds,
    this.offline = false,
  });

  final List<Item> items;
  final List<String> missingIds;
  final bool offline;

  @override
  State<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends State<ResultScreen> {
  final FlutterTts _tts = FlutterTts();
  late final Set<String> _missingIds = widget.missingIds.toSet();

  List<Item> get _missing =>
      widget.items.where((e) => _missingIds.contains(e.id)).toList();

  bool get _ok => _missing.isEmpty;

  /// 誤判定フィードバック: 「実はあった」→ 記録して画面からも消す
  Future<void> _hadIt(Item item, AppLang lang) async {
    await Store.markFalseMissing(item.id);
    if (!mounted) return;
    setState(() => _missingIds.remove(item.id));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      duration: const Duration(seconds: 2),
      content: Text(S.t(lang, 'learned')),
    ));
    if (_ok) {
      await _tts.stop();
      _announce();
    }
  }

  @override
  void initState() {
    super.initState();
    _announce();
  }

  Future<void> _announce() async {
    final lang = appLang.value;
    await _tts.setLanguage(lang == AppLang.ja ? 'ja-JP' : 'en-US');
    await _tts.setVolume(1.0);
    await _tts.setPitch(_ok ? 1.0 : 1.2);
    await _tts.setSpeechRate(_ok ? 0.5 : 0.55);

    if (_ok) {
      await _tts.speak(lang == AppLang.ja
          ? '出発ヨシ! いってらっしゃい!'
          : 'Good to go! Have a great day!');
      return;
    }

    if (await Vibration.hasVibrator()) {
      Vibration.vibrate(pattern: [0, 400, 150, 400, 150, 800]);
    }
    final names = _missing.map((e) => e.name(lang)).toList();
    final line = lang == AppLang.ja
        ? '${names.join('と、')}が!! ありません!! 忘れています!!'
        : 'Your ${names.join(' and ')} ${names.length > 1 ? 'are' : 'is'} MISSING!!';
    await _tts.speak(line);
  }

  @override
  void dispose() {
    _tts.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lang = appLang.value;
    final bg = _ok ? const Color(0xFF1B7F3B) : const Color(0xFFC62828);

    return Scaffold(
      backgroundColor: bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              if (widget.offline)
                Align(
                  alignment: Alignment.topRight,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white70),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(S.t(lang, 'offlineNote'),
                        style: const TextStyle(
                            color: Colors.white, fontSize: 12)),
                  ),
                ),
              Expanded(
                child: Center(
                  child: _ok ? _buildOk(lang) : _buildMissing(lang),
                ),
              ),
              SizedBox(
                width: double.infinity,
                height: 64,
                child: FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: bg,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                  ),
                  onPressed: () {
                    if (_ok) {
                      Navigator.of(context)
                          .popUntil((route) => route.isFirst);
                    } else {
                      Navigator.of(context).pop();
                    }
                  },
                  child: Text(
                    _ok ? S.t(lang, 'backHome') : S.t(lang, 'retake'),
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildOk(AppLang lang) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text('✅', style: TextStyle(fontSize: 96)),
        const SizedBox(height: 16),
        Text(
          S.t(lang, 'okTitle'),
          textAlign: TextAlign.center,
          style: const TextStyle(
              fontSize: 52,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              height: 1.1),
        ),
        const SizedBox(height: 12),
        Text(
          S.t(lang, 'okSub'),
          style: const TextStyle(fontSize: 20, color: Colors.white),
        ),
      ],
    );
  }

  Widget _buildMissing(AppLang lang) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          S.t(lang, 'missingTitle'),
          style: const TextStyle(
              fontSize: 44,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              height: 1.1),
        ),
        const SizedBox(height: 28),
        for (final item in _missing) ...[
          Text(item.emoji, style: const TextStyle(fontSize: 72)),
          const SizedBox(height: 8),
          Text(
            item.name(lang),
            textAlign: TextAlign.center,
            style: const TextStyle(
                fontSize: 40,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                height: 1.15),
          ),
          const SizedBox(height: 6),
          OutlinedButton(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white70),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(999)),
            ),
            onPressed: () => _hadIt(item, lang),
            child: Text(S.t(lang, 'hadIt'),
                style: const TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(height: 18),
        ],
      ],
    );
  }
}

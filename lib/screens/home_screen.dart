import 'package:flutter/material.dart';

import '../api.dart';
import '../app_state.dart';
import '../calendar.dart';
import '../presets.dart';
import '../store.dart';
import '../strings.dart';
import 'check_screen.dart';
import 'my_items_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<CalEvent> _events = [];

  @override
  void initState() {
    super.initState();
    CalendarService.todayEvents().then((events) {
      if (mounted) setState(() => _events = events);
    });
  }

  /// 予定タップ → AI が持ち物を算出(キャッシュ優先)→ 検問画面へ
  Future<void> _openEvent(CalEvent event, AppLang lang) async {
    demoAttempt = 0;
    var items = Store.cachedSuggestion(event.key);

    if (items == null) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => Dialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Row(
              children: [
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(strokeWidth: 2.5),
                ),
                const SizedBox(width: 16),
                Expanded(child: Text(S.t(lang, 'generating'))),
              ],
            ),
          ),
        ),
      );

      final time = event.start != null
          ? '${event.start!.hour}:${event.start!.minute.toString().padLeft(2, '0')}'
          : null;
      final r = await VisionApi.suggestItems(
        title: event.title,
        time: time,
        location: event.location,
        candidates: Store.suggestionCandidates(),
      );

      if (r != null) {
        final byId = {for (final e in Store.suggestionCandidates()) e.id: e};
        final resolved = <Item>[
          for (final id in r.ids)
            if (byId[id] != null) byId[id]!,
        ];
        // 新規提案はマイアイテムに登録してから使う
        for (final (name, emoji) in r.extra) {
          resolved.add(await Store.addMyItem(name, emoji));
        }
        if (resolved.isNotEmpty) {
          items = resolved;
          await Store.saveSuggestion(
              event.key, resolved.map((e) => e.id).toList());
        }
      }
      // 失敗時はハッカソンプリセットで代替(デモを止めない)
      items ??= presets.first.items.toList();

      if (mounted) Navigator.of(context).pop(); // ローディングを閉じる
    }

    if (!mounted) return;
    final preset = Preset(
        'cal_${event.key}', event.title, event.title, '📅', items);
    await Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => CheckScreen(preset: preset)));
    setState(() {});
  }


  void _toggleDemo(BuildContext context, AppLang lang) {
    demoMode.value = !demoMode.value;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      duration: const Duration(seconds: 1),
      content: Text(S.t(lang, demoMode.value ? 'demoOn' : 'demoOff')),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AppLang>(
      valueListenable: appLang,
      builder: (context, lang, _) {
        return Scaffold(
          backgroundColor: const Color(0xFFF7F7F5),
          appBar: AppBar(
            backgroundColor: const Color(0xFFF7F7F5),
            elevation: 0,
            title: GestureDetector(
              onLongPress: () => _toggleDemo(context, lang),
              child: Row(
                children: [
                  Text(S.t(lang, 'appTitle'),
                      style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1A1A1A))),
                  ValueListenableBuilder<bool>(
                    valueListenable: demoMode,
                    builder: (_, demo, __) => demo
                        ? const Padding(
                            padding: EdgeInsets.only(left: 6),
                            child: Icon(Icons.circle,
                                size: 8, color: Color(0xFFBBBBBB)),
                          )
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
            actions: [
              IconButton(
                tooltip: S.t(lang, 'myItems'),
                icon: const Icon(Icons.luggage, color: Color(0xFF1A1A1A)),
                onPressed: () async {
                  await Navigator.of(context).push(MaterialPageRoute(
                      builder: (_) => const MyItemsScreen()));
                  setState(() {});
                },
              ),
              TextButton(
                onPressed: () => appLang.value =
                    lang == AppLang.ja ? AppLang.en : AppLang.ja,
                child: Text(
                  lang == AppLang.ja ? 'EN' : '日本語',
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, color: Color(0xFF1A1A1A)),
                ),
              ),
            ],
          ),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(S.t(lang, 'tagline'),
                      style: const TextStyle(
                          fontSize: 14, color: Color(0xFF6B6B6B))),
                  if (_events.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(S.t(lang, 'todayPlans'),
                        style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1A1A1A))),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 96,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _events.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(width: 10),
                        itemBuilder: (context, i) {
                          final e = _events[i];
                          final time = e.start != null
                              ? '${e.start!.hour}:${e.start!.minute.toString().padLeft(2, '0')}'
                              : '終日';
                          return Material(
                            color: const Color(0xFF1A1A1A),
                            borderRadius: BorderRadius.circular(14),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: () => _openEvent(e, lang),
                              child: Container(
                                width: 170,
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(time,
                                        style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFFB9B9B4))),
                                    const SizedBox(height: 6),
                                    Expanded(
                                      child: Text(
                                        e.title,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w700,
                                            color: Colors.white),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Text(S.t(lang, 'choosePlan'),
                      style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1A1A1A))),
                  const SizedBox(height: 12),
                  Expanded(
                    child: ListView.separated(
                      itemCount: presets.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 14),
                      itemBuilder: (context, i) {
                        final p = presets[i];
                        return _PresetCard(
                          preset: p,
                          lang: lang,
                          onReturn: () => setState(() {}),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PresetCard extends StatelessWidget {
  const _PresetCard(
      {required this.preset, required this.lang, required this.onReturn});
  final Preset preset;
  final AppLang lang;
  final VoidCallback onReturn;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          demoAttempt = 0;
          await Navigator.of(context).push(MaterialPageRoute(
              builder: (_) => CheckScreen(preset: preset)));
          onReturn();
        },
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            border: Border.all(color: const Color(0xFFE3E3E0)),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              Text(preset.emoji, style: const TextStyle(fontSize: 40)),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(preset.title(lang),
                        style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1A1A1A))),
                    const SizedBox(height: 4),
                    Text(
                      '${Store.effectiveItems(preset).length} ${S.t(lang, 'itemsCount')}',
                      style: const TextStyle(
                          fontSize: 13, color: Color(0xFF6B6B6B)),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Color(0xFF9A9A9A)),
            ],
          ),
        ),
      ),
    );
  }
}

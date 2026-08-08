import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../api.dart';
import '../app_state.dart';
import '../local_ml.dart';
import '../presets.dart';
import '../store.dart';
import '../strings.dart';
import 'item_dialog.dart';
import 'result_screen.dart';

class CheckScreen extends StatefulWidget {
  const CheckScreen({super.key, required this.preset});
  final Preset preset;

  @override
  State<CheckScreen> createState() => _CheckScreenState();
}

class _CheckScreenState extends State<CheckScreen> {
  bool _busy = false;
  int? _mlCount;
  final List<XFile> _shots = [];
  late List<Item> _items = Store.effectiveItems(widget.preset);

  void _refresh() => setState(() {
        _items = Store.effectiveItems(widget.preset);
      });

  Future<void> _addItemDialog(AppLang lang) async {
    final inList = _items.map((e) => e.id).toSet();
    final candidates =
        Store.myItems().where((e) => !inList.contains(e.id)).toList();

    if (candidates.isNotEmpty) {
      // マイアイテムのチップ選択 or 新規登録へ
      final picked = await showDialog<Object>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(S.t(lang, 'addItem')),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(S.t(lang, 'fromMyItems'),
                  style: const TextStyle(
                      fontSize: 13, color: Color(0xFF6B6B6B))),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final item in candidates)
                    ActionChip(
                      label: Text('${item.emoji} ${item.name(lang)}'),
                      onPressed: () => Navigator.pop(context, item),
                    ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(S.t(lang, 'cancel')),
            ),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF1A1A1A)),
              onPressed: () => Navigator.pop(context, 'new'),
              icon: const Icon(Icons.add, size: 18),
              label: Text(S.t(lang, 'orNewItem')),
            ),
          ],
        ),
      );
      if (picked is Item) {
        await Store.addItemToPreset(widget.preset.id, picked);
        _refresh();
        return;
      }
      if (picked != 'new') return;
    }

    if (!mounted) return;
    final entry = await showItemEntryDialog(context, lang);
    if (entry != null) {
      // 新規登録はマイアイテムにも自動登録してからリストへ追加
      final item = await Store.addMyItem(entry.$1, entry.$2);
      await Store.addItemToPreset(widget.preset.id, item);
      _refresh();
    }
  }

  Future<void> _shoot() async {
    final picker = ImagePicker();
    final shot = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 60,
      maxWidth: 1280,
    );
    if (shot == null || !mounted) return;
    setState(() => _shots.add(shot));
  }

  Future<void> _judge() async {
    if (_shots.isEmpty) return;
    setState(() {
      _busy = true;
      _mlCount = null;
    });

    // 1段目: 端末内ML。通信ゼロで即応答し、待ち時間の体感を消す
    () async {
      var total = 0;
      for (final s in _shots) {
        total += await LocalMl.countObjects(s.path);
      }
      if (mounted && _busy) setState(() => _mlCount = total);
    }();

    List<String>? missing;
    bool offline = false;

    if (demoMode.value) {
      // 壇上用: 通信ゼロ。1回目は先頭アイテムが欠品、2回目以降は出発ヨシ。
      await Future.delayed(const Duration(seconds: 2));
      missing = demoAttempt == 0 ? [_items.first.id] : <String>[];
      demoAttempt++;
    } else {
      missing = await VisionApi.findMissing(
          _shots.map((s) => File(s.path)).toList(), _items,
          lenient: Store.lenientIds());
      if (missing == null) {
        // 全プロバイダ失敗 → デモモードと同じローカル簡易判定で発表を止めない
        offline = true;
        missing = demoAttempt == 0 ? [_items.first.id] : <String>[];
        demoAttempt++;
      }
    }

    if (!mounted) return;
    setState(() {
      _busy = false;
      _shots.clear();
    });
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ResultScreen(
        items: _items,
        missingIds: missing!,
        offline: offline,
      ),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AppLang>(
      valueListenable: appLang,
      builder: (context, lang, _) {
        final p = widget.preset;
        return Scaffold(
          backgroundColor: const Color(0xFFF7F7F5),
          appBar: AppBar(
            backgroundColor: const Color(0xFFF7F7F5),
            elevation: 0,
            foregroundColor: const Color(0xFF1A1A1A),
            title: Text('${p.emoji} ${p.title(lang)}',
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(S.t(lang, 'checklist'),
                      style: const TextStyle(
                          fontSize: 14, color: Color(0xFF6B6B6B))),
                  const SizedBox(height: 12),
                  Expanded(
                    child: ListView(
                      children: [
                        for (final item in _items) ...[
                          Container(
                            margin: const EdgeInsets.only(bottom: 10),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              border:
                                  Border.all(color: const Color(0xFFE3E3E0)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Row(
                              children: [
                                Text(item.emoji,
                                    style: const TextStyle(fontSize: 24)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(item.name(lang),
                                      style: const TextStyle(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF1A1A1A))),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.close,
                                      size: 20, color: Color(0xFFB0B0AC)),
                                  onPressed: () async {
                                    await Store.removeItem(
                                        widget.preset.id, item.id);
                                    _refresh();
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF1A1A1A),
                            side: const BorderSide(color: Color(0xFFC9C9C4)),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                          onPressed: _busy ? null : () => _addItemDialog(lang),
                          icon: const Icon(Icons.add),
                          label: Text(S.t(lang, 'addItem'),
                              style: const TextStyle(
                                  fontWeight: FontWeight.w700)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (_shots.isNotEmpty) ...[
                    SizedBox(
                      height: 72,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: [
                          for (var i = 0; i < _shots.length; i++)
                            Stack(
                              children: [
                                Container(
                                  margin: const EdgeInsets.only(
                                      right: 10, top: 6),
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: Image.file(
                                      File(_shots[i].path),
                                      width: 66,
                                      height: 66,
                                      fit: BoxFit.cover,
                                    ),
                                  ),
                                ),
                                if (!_busy)
                                  Positioned(
                                    right: 2,
                                    top: 0,
                                    child: GestureDetector(
                                      onTap: () =>
                                          setState(() => _shots.removeAt(i)),
                                      child: Container(
                                        decoration: const BoxDecoration(
                                          color: Color(0xFF1A1A1A),
                                          shape: BoxShape.circle,
                                        ),
                                        padding: const EdgeInsets.all(3),
                                        child: const Icon(Icons.close,
                                            size: 12, color: Colors.white),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      S.t(lang, 'photosHint'),
                      style: const TextStyle(
                          fontSize: 12, color: Color(0xFF6B6B6B)),
                    ),
                    const SizedBox(height: 10),
                  ],
                  if (_busy && _mlCount != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Text(
                        '⚡ ${S.t(lang, 'mlFound')} $_mlCount → ${S.t(lang, 'mlMatching')}',
                        style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF6B6B6B)),
                      ),
                    ),
                  Row(
                    children: [
                      if (_shots.isNotEmpty && _shots.length < 3)
                        Expanded(
                          child: SizedBox(
                            height: 64,
                            child: OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF1A1A1A),
                                side: const BorderSide(
                                    color: Color(0xFFC9C9C4)),
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(16)),
                              ),
                              onPressed: _busy ? null : _shoot,
                              icon: const Icon(Icons.add_a_photo, size: 22),
                              label: Text(
                                S.t(lang, 'shootMore'),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700),
                              ),
                            ),
                          ),
                        ),
                      if (_shots.isNotEmpty && _shots.length < 3)
                        const SizedBox(width: 10),
                      Expanded(
                        flex: _shots.isEmpty ? 1 : 2,
                        child: SizedBox(
                          height: 64,
                          child: FilledButton.icon(
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF1A1A1A),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16)),
                            ),
                            onPressed: _busy || _items.isEmpty
                                ? null
                                : (_shots.isEmpty ? _shoot : _judge),
                            icon: _busy
                                ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2.5,
                                        color: Colors.white))
                                : Icon(
                                    _shots.isEmpty
                                        ? Icons.photo_camera
                                        : Icons.policy,
                                    size: 26),
                            label: Text(
                              _busy
                                  ? S.t(lang, 'analyzing')
                                  : (_shots.isEmpty
                                      ? S.t(lang, 'shoot')
                                      : S.t(lang, 'judge')),
                              style: const TextStyle(
                                  fontSize: 17, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ),
                    ],
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

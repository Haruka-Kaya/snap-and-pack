import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import 'presets.dart';

/// プリセットへのユーザー変更(追加アイテム・削除したデフォルト品)を永続化する。
/// main() で Store.init() を await してから使う(以後は同期アクセス)。
class Store {
  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  static String _key(String presetId) => 'mods_$presetId';

  static Map<String, dynamic> _mods(String presetId) {
    final raw = _prefs?.getString(_key(presetId));
    if (raw == null) return {'added': [], 'removed': []};
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<void> _save(String presetId, Map<String, dynamic> mods) async {
    await _prefs?.setString(_key(presetId), jsonEncode(mods));
  }

  /// デフォルト品 − 削除済み + ユーザー追加、の実効リスト。
  /// 追加アイテムの参照写真はマイアイテム登録から引く。
  static List<Item> effectiveItems(Preset preset) {
    final mods = _mods(preset.id);
    final removed = (mods['removed'] as List).cast<String>().toSet();
    final items = preset.items.where((e) => !removed.contains(e.id)).toList();
    final photos = {for (final m in myItems()) m.id: m.photo};
    for (final a in (mods['added'] as List)) {
      final m = a as Map<String, dynamic>;
      final name = m['name'] as String;
      final id = m['id'] as String;
      items.add(Item(id, name, name, m['emoji'] as String, photos[id]));
    }
    return items;
  }

  static Future<void> addItem(
      String presetId, String name, String emoji) async {
    final mods = _mods(presetId);
    (mods['added'] as List).add({
      'id': 'c_${DateTime.now().millisecondsSinceEpoch}',
      'name': name,
      'emoji': emoji,
    });
    await _save(presetId, mods);
  }

  // ---- マイアイテム(所持品カタログ、全予定共通) ----

  static List<Item> myItems() {
    final raw = _prefs?.getString('my_items');
    if (raw == null) return [];
    return (jsonDecode(raw) as List).map((a) {
      final m = a as Map<String, dynamic>;
      final name = m['name'] as String;
      return Item(m['id'] as String, name, name, m['emoji'] as String,
          m['photo'] as String?);
    }).toList();
  }

  static Future<void> _saveMyItems(List<Item> items) async {
    await _prefs?.setString(
        'my_items',
        jsonEncode(items
            .map((e) => {
                  'id': e.id,
                  'name': e.ja,
                  'emoji': e.emoji,
                  if (e.photo != null) 'photo': e.photo,
                })
            .toList()));
  }

  /// マイアイテムに実物の参照写真を紐付ける
  static Future<void> setMyItemPhoto(String itemId, String path) async {
    final items = myItems();
    final i = items.indexWhere((e) => e.id == itemId);
    if (i < 0) return;
    final old = items[i];
    items[i] = Item(old.id, old.ja, old.en, old.emoji, path);
    await _saveMyItems(items);
  }

  // ---- カレンダー予定への AI 提案キャッシュ ----

  /// 提案の全候補(マイアイテム + 基本プール。id 重複はマイアイテム優先)
  static List<Item> suggestionCandidates() {
    final mine = myItems();
    final mineIds = mine.map((e) => e.id).toSet();
    return [
      ...mine,
      ...baseItemPool.where((e) => !mineIds.contains(e.id)),
    ];
  }

  /// キャッシュ済み提案を Item 解決して返す(無ければ null)
  static List<Item>? cachedSuggestion(String eventKey) {
    final ids = _prefs?.getStringList('sg_$eventKey');
    if (ids == null || ids.isEmpty) return null;
    final byId = {for (final e in suggestionCandidates()) e.id: e};
    final items = ids.map((id) => byId[id]).whereType<Item>().toList();
    return items.isEmpty ? null : items;
  }

  static Future<void> saveSuggestion(
      String eventKey, List<String> ids) async {
    await _prefs?.setStringList('sg_$eventKey', ids);
  }

  // ---- 誤判定フィードバック(「実はあった」)----

  /// 「欠品と判定されたが実はあった」を記録 → 次回から甘め判定に使う
  static Future<void> markFalseMissing(String itemId) async {
    final ids = lenientIds()..add(itemId);
    await _prefs?.setStringList('lenient_ids', ids.toList());
  }

  static Set<String> lenientIds() =>
      (_prefs?.getStringList('lenient_ids') ?? []).toSet();

  static Future<Item> addMyItem(String name, String emoji) async {
    final items = myItems();
    // 同名は重複登録しない
    final existing = items.where((e) => e.ja == name).firstOrNull;
    if (existing != null) return existing;
    final item =
        Item('c_${DateTime.now().millisecondsSinceEpoch}', name, name, emoji);
    items.add(item);
    await _saveMyItems(items);
    return item;
  }

  static Future<void> removeMyItem(String itemId) async {
    final items = myItems()..removeWhere((e) => e.id == itemId);
    await _saveMyItems(items);
  }

  /// マイアイテムを予定のリストへ追加(既にあれば何もしない)
  static Future<void> addItemToPreset(String presetId, Item item) async {
    final mods = _mods(presetId);
    final added = mods['added'] as List;
    if (added.any((a) => a['id'] == item.id)) return;
    added.add({'id': item.id, 'name': item.ja, 'emoji': item.emoji});
    // 過去に削除済みなら復活させる
    (mods['removed'] as List).remove(item.id);
    await _save(presetId, mods);
  }

  static Future<void> removeItem(String presetId, String itemId) async {
    final mods = _mods(presetId);
    final added = mods['added'] as List;
    final before = added.length;
    added.removeWhere((a) => a['id'] == itemId);
    if (added.length == before) {
      // デフォルト品 → removed リストへ
      final removed = (mods['removed'] as List).cast<String>();
      if (!removed.contains(itemId)) {
        (mods['removed'] as List).add(itemId);
      }
    }
    await _save(presetId, mods);
  }
}

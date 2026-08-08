import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';

import 'presets.dart';

const String _geminiKeyDefine = String.fromEnvironment('GEMINI_API_KEY');
const String _claudeKeyDefine = String.fromEnvironment('ANTHROPIC_API_KEY');

// 実機ビルドは --dart-define、PC上のデバッグハーネスは環境変数から読む
String get _geminiKey => _geminiKeyDefine.isNotEmpty
    ? _geminiKeyDefine
    : (Platform.environment['GEMINI_API_KEY'] ?? '');
String get _claudeKey => _claudeKeyDefine.isNotEmpty
    ? _claudeKeyDefine
    : (Platform.environment['ANTHROPIC_API_KEY'] ?? '');

/// Vision 判定。主: Gemini 2.5 Flash / 失敗時: Claude / 両方失敗: null
/// (null のとき呼び出し側がローカル簡易判定にフォールバックする)
class VisionApi {
  static final Dio _dio = Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 8),
    receiveTimeout: const Duration(seconds: 15),
  ));

  /// 写真(1〜複数枚)のどれにも写っていない持ち物の id リストを返す。
  /// - 複数枚は角度違い・重なり(遮蔽)対策: どれか1枚に写っていれば所持と判定
  /// - item.photo がある物は「実物の参照写真」を few-shot として先に見せる
  /// - lenient は過去に誤判定された id 集合 → 甘め判定を指示
  static Future<List<String>?> findMissing(List<File> photos, List<Item> items,
      {Set<String> lenient = const {}}) async {
    final b64s = <String>[];
    for (final p in photos) {
      b64s.add(base64Encode(await p.readAsBytes()));
    }
    // 参照写真 (id, base64)
    final refs = <(String, String)>[];
    for (final item in items) {
      final path = item.photo;
      if (path != null && File(path).existsSync()) {
        refs.add((item.id, base64Encode(await File(path).readAsBytes())));
      }
    }
    final list =
        jsonEncode(items.map((e) => {'id': e.id, 'name': e.en}).toList());
    final lenientNote = lenient.isEmpty
        ? ''
        : 'IMPORTANT: The user has confirmed they were actually carrying these '
            'items when previously judged missing: '
            '${jsonEncode(lenient.toList())}. Give these items strong benefit '
            'of the doubt — if anything could plausibly be them, count them as '
            'present. ';
    final refNote = refs.isEmpty
        ? ''
        : 'First you will see ${refs.length} REFERENCE photo(s) of the user\'s '
            'own specific items (labeled by id). Use them to recognize those '
            'exact items in the belongings photos. ';
    final prompt =
        'Here is a packing checklist as JSON: $list. $refNote'
        'You are given ${b64s.length} photo(s) of the same belongings from '
        'different angles (the LAST ${b64s.length} image(s)). '
        'An item counts as PRESENT if it is visible in AT LEAST ONE belongings '
        'photo, even partially hidden behind other objects. Be lenient: if '
        'something similar to the item is visible, count it as present. '
        '$lenientNote'
        'Return ONLY a JSON array containing the ids of checklist items that are '
        'NOT visible in ANY of the belongings photos. If all items are present, '
        'return []. No explanation, no markdown, JSON array only.';
    final ids = items.map((e) => e.id).toSet();

    if (_geminiKey.isNotEmpty) {
      try {
        return await _gemini(b64s, refs, prompt, ids);
      } catch (_) {}
    }
    if (_claudeKey.isNotEmpty) {
      try {
        return await _claude(b64s, refs, prompt, ids);
      } catch (_) {}
    }
    return null;
  }

  static Future<List<String>> _gemini(List<String> b64s,
      List<(String, String)> refs, String prompt, Set<String> ids) async {
    final res = await _dio.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      queryParameters: {'key': _geminiKey},
      data: {
        'contents': [
          {
            'parts': [
              {'text': prompt},
              for (final r in refs) ...[
                {'text': 'Reference photo of item id="${r.$1}":'},
                {
                  'inline_data': {'mime_type': 'image/jpeg', 'data': r.$2}
                },
              ],
              if (refs.isNotEmpty)
                {'text': 'Now the belongings photos to inspect:'},
              for (final b64 in b64s)
                {
                  'inline_data': {'mime_type': 'image/jpeg', 'data': b64}
                },
            ]
          }
        ],
        'generationConfig': {'response_mime_type': 'application/json'},
      },
    );
    final text =
        res.data['candidates'][0]['content']['parts'][0]['text'] as String;
    return _parse(text, ids);
  }

  static Future<List<String>> _claude(List<String> b64s,
      List<(String, String)> refs, String prompt, Set<String> ids) async {
    final res = await _dio.post(
      'https://api.anthropic.com/v1/messages',
      options: Options(headers: {
        'x-api-key': _claudeKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      }),
      data: {
        'model': 'claude-sonnet-5',
        'max_tokens': 300,
        'messages': [
          {
            'role': 'user',
            'content': [
              {'type': 'text', 'text': prompt},
              for (final r in refs) ...[
                {
                  'type': 'text',
                  'text': 'Reference photo of item id="${r.$1}":'
                },
                {
                  'type': 'image',
                  'source': {
                    'type': 'base64',
                    'media_type': 'image/jpeg',
                    'data': r.$2,
                  }
                },
              ],
              if (refs.isNotEmpty)
                {
                  'type': 'text',
                  'text': 'Now the belongings photos to inspect:'
                },
              for (final b64 in b64s)
                {
                  'type': 'image',
                  'source': {
                    'type': 'base64',
                    'media_type': 'image/jpeg',
                    'data': b64,
                  }
                },
            ]
          }
        ],
      },
    );
    final text = res.data['content'][0]['text'] as String;
    return _parse(text, ids);
  }

  /// 予定の内容から必要な持ち物を AI が算出する。
  /// candidates(マイアイテム+基本プール)の id 選択 + 新規提案(最大3つ)を返す。
  /// 両プロバイダ失敗時は null(呼び出し側でフォールバック)。
  static Future<({List<String> ids, List<(String, String)> extra})?>
      suggestItems({
    required String title,
    String? time,
    String? location,
    required List<Item> candidates,
  }) async {
    final list = jsonEncode(
        candidates.map((e) => {'id': e.id, 'name': e.ja}).toList());
    final prompt =
        'You are a packing assistant. Today\'s calendar event: "$title"'
        '${time != null ? ' at $time' : ''}'
        '${location != null && location.isNotEmpty ? ' (location: $location)' : ''}. '
        'Here are the user\'s available items as JSON: $list. '
        'Pick the item ids genuinely needed for this event (typically 3-7). '
        'Additionally you may suggest up to 3 common items NOT in the list, '
        'each as {"name": <short name in Japanese>, "emoji": <one emoji>}. '
        'Return ONLY JSON: {"ids": [...], "extra": [...]}. No explanation.';
    final ids = candidates.map((e) => e.id).toSet();

    Future<({List<String> ids, List<(String, String)> extra})> parse(
        String text) async {
      final start = text.indexOf('{');
      final end = text.lastIndexOf('}');
      final m = jsonDecode(text.substring(start, end + 1))
          as Map<String, dynamic>;
      final picked = ((m['ids'] as List?) ?? [])
          .map((e) => e.toString())
          .where(ids.contains)
          .toList();
      final extra = <(String, String)>[];
      for (final x in ((m['extra'] as List?) ?? []).take(3)) {
        final xm = x as Map<String, dynamic>;
        final name = (xm['name'] ?? '').toString().trim();
        if (name.isNotEmpty) {
          extra.add((name, (xm['emoji'] ?? '🎒').toString()));
        }
      }
      return (ids: picked, extra: extra);
    }

    if (_geminiKey.isNotEmpty) {
      try {
        final res = await _dio.post(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
          queryParameters: {'key': _geminiKey},
          data: {
            'contents': [
              {
                'parts': [
                  {'text': prompt}
                ]
              }
            ],
            'generationConfig': {'response_mime_type': 'application/json'},
          },
        );
        return await parse(
            res.data['candidates'][0]['content']['parts'][0]['text'] as String);
      } catch (_) {}
    }
    if (_claudeKey.isNotEmpty) {
      try {
        final res = await _dio.post(
          'https://api.anthropic.com/v1/messages',
          options: Options(headers: {
            'x-api-key': _claudeKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          }),
          data: {
            'model': 'claude-sonnet-5',
            'max_tokens': 500,
            'messages': [
              {'role': 'user', 'content': prompt}
            ],
          },
        );
        return await parse(res.data['content'][0]['text'] as String);
      } catch (_) {}
    }
    return null;
  }

  /// コードフェンスや前置きが混ざっても配列部分だけ拾う
  static List<String> _parse(String text, Set<String> ids) {
    final start = text.indexOf('[');
    final end = text.lastIndexOf(']');
    if (start < 0 || end <= start) return [];
    final decoded = jsonDecode(text.substring(start, end + 1)) as List;
    return decoded.map((e) => e.toString()).where(ids.contains).toList();
  }
}

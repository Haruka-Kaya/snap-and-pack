import 'package:flutter/material.dart';

import '../strings.dart';

const itemEmojiChoices = [
  '🎒', '👛', '🔑', '💻', '📱', '🔌', '🔋', '📓',
  '✏️', '🥤', '☂️', '🎧', '💊', '📷', '🪪', '🧴',
];

/// 名前+絵文字の入力ダイアログ。(name, emoji) を返す。キャンセルは null。
Future<(String, String)?> showItemEntryDialog(
    BuildContext context, AppLang lang) async {
  final controller = TextEditingController();
  var emoji = '🎒';
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setDialogState) => AlertDialog(
        title: Text(S.t(lang, 'addItem')),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: controller,
              autofocus: true,
              decoration: InputDecoration(hintText: S.t(lang, 'itemName')),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final e in itemEmojiChoices)
                  GestureDetector(
                    onTap: () => setDialogState(() => emoji = e),
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: emoji == e
                              ? const Color(0xFF1A1A1A)
                              : Colors.transparent,
                          width: 2,
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(e, style: const TextStyle(fontSize: 24)),
                    ),
                  ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(S.t(lang, 'cancel')),
          ),
          FilledButton(
            style:
                FilledButton.styleFrom(backgroundColor: const Color(0xFF1A1A1A)),
            onPressed: () => Navigator.pop(context, true),
            child: Text(S.t(lang, 'add')),
          ),
        ],
      ),
    ),
  );
  final name = controller.text.trim();
  if (ok == true && name.isNotEmpty) return (name, emoji);
  return null;
}

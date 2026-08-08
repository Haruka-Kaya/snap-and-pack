import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

import '../app_state.dart';
import '../presets.dart';
import '../store.dart';
import '../strings.dart';
import 'item_dialog.dart';

/// 所持アイテムのカタログ管理画面(登録・削除)
class MyItemsScreen extends StatefulWidget {
  const MyItemsScreen({super.key});

  @override
  State<MyItemsScreen> createState() => _MyItemsScreenState();
}

class _MyItemsScreenState extends State<MyItemsScreen> {
  late List<Item> _items = Store.myItems();

  void _refresh() => setState(() => _items = Store.myItems());

  /// 実物の参照写真を撮影して永続領域へコピー・紐付け
  Future<void> _attachPhoto(Item item) async {
    final shot = await ImagePicker().pickImage(
      source: ImageSource.camera,
      imageQuality: 55,
      maxWidth: 900,
    );
    if (shot == null) return;
    final dir = await getApplicationDocumentsDirectory();
    final dest = '${dir.path}/ref_${item.id}.jpg';
    await File(shot.path).copy(dest);
    await Store.setMyItemPhoto(item.id, dest);
    _refresh();
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
            foregroundColor: const Color(0xFF1A1A1A),
            title: Text('🧳 ${S.t(lang, 'myItems')}',
                style: const TextStyle(fontWeight: FontWeight.w700)),
          ),
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    S.t(lang, 'refPhotoHint'),
                    style: const TextStyle(
                        fontSize: 13, color: Color(0xFF6B6B6B)),
                  ),
                  const SizedBox(height: 12),
                  Expanded(
                    child: _items.isEmpty
                        ? Center(
                            child: Text(
                              S.t(lang, 'myItemsEmpty'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  fontSize: 15, color: Color(0xFF6B6B6B)),
                            ),
                          )
                        : ListView(
                            children: [
                              for (final item in _items)
                                Container(
                                  margin: const EdgeInsets.only(bottom: 10),
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    border: Border.all(
                                        color: const Color(0xFFE3E3E0)),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    children: [
                                      Text(item.emoji,
                                          style:
                                              const TextStyle(fontSize: 24)),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(item.name(lang),
                                            style: const TextStyle(
                                                fontSize: 17,
                                                fontWeight: FontWeight.w600,
                                                color: Color(0xFF1A1A1A))),
                                      ),
                                      if (item.photo != null &&
                                          File(item.photo!).existsSync())
                                        GestureDetector(
                                          onTap: () => _attachPhoto(item),
                                          child: ClipRRect(
                                            borderRadius:
                                                BorderRadius.circular(8),
                                            child: Image.file(
                                              File(item.photo!),
                                              width: 40,
                                              height: 40,
                                              fit: BoxFit.cover,
                                            ),
                                          ),
                                        )
                                      else
                                        IconButton(
                                          tooltip:
                                              S.t(lang, 'refPhotoHint'),
                                          icon: const Icon(
                                              Icons.add_a_photo,
                                              size: 22,
                                              color: Color(0xFF1A1A1A)),
                                          onPressed: () =>
                                              _attachPhoto(item),
                                        ),
                                      IconButton(
                                        icon: const Icon(Icons.close,
                                            size: 20,
                                            color: Color(0xFFB0B0AC)),
                                        onPressed: () async {
                                          await Store.removeMyItem(item.id);
                                          _refresh();
                                        },
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 56,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF1A1A1A),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () async {
                        final entry = await showItemEntryDialog(context, lang);
                        if (entry != null) {
                          await Store.addMyItem(entry.$1, entry.$2);
                          _refresh();
                        }
                      },
                      icon: const Icon(Icons.add),
                      label: Text(S.t(lang, 'addItem'),
                          style: const TextStyle(
                              fontSize: 16, fontWeight: FontWeight.w700)),
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

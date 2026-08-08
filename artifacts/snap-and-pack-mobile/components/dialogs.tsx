/**
 * Item dialogs, ported from flutter-app/lib/screens/item_dialog.dart and the
 * "add from my items" dialog in check_screen.dart.
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

import { t, type AppLang } from '@/lib/i18n';
import { itemEmojiChoices, itemName, type Item } from '@/lib/items';

function DialogShell({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: colors.card, borderRadius: colors.radius + 4 },
          ]}
          onPress={() => {}}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** 名前+絵文字の入力ダイアログ。追加で onSubmit(name, emoji)。 */
export function ItemEntryDialog({
  visible,
  lang,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  lang: AppLang;
  onClose: () => void;
  onSubmit: (name: string, emoji: string) => void;
}) {
  const colors = useColors();
  const [name, setName] = useState<string>('');
  const [emoji, setEmoji] = useState<string>('🎒');

  useEffect(() => {
    if (visible) {
      setName('');
      setEmoji('🎒');
    }
  }, [visible]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, emoji);
  };

  return (
    <DialogShell visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {t(lang, 'addItem')}
      </Text>
      <TextInput
        testID="item-name-input"
        value={name}
        onChangeText={setName}
        placeholder={t(lang, 'itemName')}
        placeholderTextColor={colors.mutedForeground}
        autoFocus={Platform.OS !== 'web'}
        style={[
          styles.input,
          {
            borderColor: colors.input,
            color: colors.foreground,
            borderRadius: colors.radius - 4,
          },
        ]}
        onSubmitEditing={submit}
        returnKeyType="done"
      />
      <View style={styles.emojiWrap}>
        {itemEmojiChoices.map((e) => (
          <Pressable
            key={e}
            testID={`emoji-${e}`}
            onPress={() => setEmoji(e)}
            style={[
              styles.emojiCell,
              {
                borderColor: emoji === e ? colors.foreground : 'transparent',
                borderRadius: 8,
              },
            ]}
          >
            <Text style={{ fontSize: 24 }}>{e}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.textBtn} testID="dialog-cancel">
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '600' }}>
            {t(lang, 'cancel')}
          </Text>
        </Pressable>
        <Pressable
          testID="dialog-add"
          onPress={submit}
          style={[
            styles.fillBtn,
            {
              backgroundColor: name.trim() ? colors.primary : colors.muted,
              borderRadius: colors.radius - 4,
            },
          ]}
        >
          <Text
            style={{
              color: name.trim() ? colors.primaryForeground : colors.mutedForeground,
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            {t(lang, 'add')}
          </Text>
        </Pressable>
      </View>
    </DialogShell>
  );
}

/** マイアイテムのチップ選択 or 新規登録へ(check_screen._addItemDialog)。 */
export function PickMyItemDialog({
  visible,
  lang,
  candidates,
  onClose,
  onPick,
  onNewItem,
}: {
  visible: boolean;
  lang: AppLang;
  candidates: Item[];
  onClose: () => void;
  onPick: (item: Item) => void;
  onNewItem: () => void;
}) {
  const colors = useColors();
  return (
    <DialogShell visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: colors.foreground }]}>
        {t(lang, 'addItem')}
      </Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 13, marginBottom: 8 }}>
        {t(lang, 'fromMyItems')}
      </Text>
      <ScrollView style={{ maxHeight: 240 }}>
        <View style={styles.chipWrap}>
          {candidates.map((item) => (
            <Pressable
              key={item.id}
              testID={`pick-${item.id}`}
              onPress={() => onPick(item)}
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  borderRadius: 999,
                },
              ]}
            >
              <Text style={{ fontSize: 14, color: colors.foreground }}>
                {item.emoji} {itemName(item, lang)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.textBtn} testID="pick-cancel">
          <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: '600' }}>
            {t(lang, 'cancel')}
          </Text>
        </Pressable>
        <Pressable
          testID="pick-new"
          onPress={onNewItem}
          style={[
            styles.fillBtn,
            { backgroundColor: colors.primary, borderRadius: colors.radius - 4 },
          ]}
        >
          <Feather name="plus" size={16} color={colors.primaryForeground} />
          <Text
            style={{
              color: colors.primaryForeground,
              fontSize: 15,
              fontWeight: '700',
              marginLeft: 6,
            }}
          >
            {t(lang, 'orNewItem')}
          </Text>
        </Pressable>
      </View>
    </DialogShell>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 120,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: 22,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  emojiWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiCell: {
    padding: 6,
    borderWidth: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  textBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  fillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});

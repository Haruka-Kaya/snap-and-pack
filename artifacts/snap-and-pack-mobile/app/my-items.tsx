/**
 * My items screen — ported from flutter-app/lib/screens/my_items_screen.dart.
 * Personal item catalog with reference photos for better AI accuracy.
 */

import React, { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import { itemName } from '@/lib/items';
import { Store, useStoreVersion } from '@/lib/store';
import { captureRefPhoto } from '@/lib/photos';
import { Btn, ToastView, useToast } from '@/components/ui';
import { ItemEntryDialog } from '@/components/dialogs';

export default function MyItemsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lang } = useApp();
  useStoreVersion();
  const { toastText, showToast } = useToast();

  const [entryOpen, setEntryOpen] = useState<boolean>(false);
  const items = Store.myItems();

  const attachPhoto = async (itemId: string) => {
    const dataUri = await captureRefPhoto();
    if (dataUri) Store.setMyItemPhoto(itemId, dataUri);
  };

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top + 4;
  const paddingBottom = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 16);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={6} testID="back">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t(lang, 'myItems')}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 6 }}>
          {t(lang, 'refPhotoHint')}
        </Text>

        {items.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 40 }}>🎒</Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.mutedForeground,
                marginTop: 14,
                textAlign: 'center',
              }}
            >
              {t(lang, 'myItemsEmpty')}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.listCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius + 2,
                marginTop: 16,
              },
            ]}
          >
            {items.map((item, i) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 16,
                    color: colors.foreground,
                    marginLeft: 12,
                  }}
                  numberOfLines={1}
                >
                  {itemName(item, lang)}
                </Text>
                <Pressable
                  testID={`photo-${item.id}`}
                  onPress={() => attachPhoto(item.id)}
                  hitSlop={8}
                  style={{ marginRight: 10 }}
                >
                  {item.photo ? (
                    <Image
                      source={{ uri: item.photo }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: colors.muted,
                      }}
                    />
                  ) : (
                    <View
                      style={[
                        styles.photoPlaceholder,
                        { borderColor: colors.input, borderRadius: 8 },
                      ]}
                    >
                      <MaterialIcons
                        name="add-a-photo"
                        size={18}
                        color={colors.iconMuted}
                      />
                    </View>
                  )}
                </Pressable>
                <Pressable
                  testID={`remove-my-${item.id}`}
                  onPress={() => Store.removeMyItem(item.id)}
                  hitSlop={8}
                  style={{ padding: 4 }}
                >
                  <Feather name="x" size={18} color={colors.iconMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom }}>
        <Btn
          testID="add-my-item"
          label={t(lang, 'addItem')}
          onPress={() => setEntryOpen(true)}
          icon={<Feather name="plus" size={19} color={colors.primaryForeground} />}
        />
      </View>

      <ItemEntryDialog
        visible={entryOpen}
        lang={lang}
        onClose={() => setEntryOpen(false)}
        onSubmit={(name, emoji) => {
          Store.addMyItem(name, emoji);
          setEntryOpen(false);
        }}
      />
      <ToastView text={toastText} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  iconBtn: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  listCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  photoPlaceholder: {
    width: 40,
    height: 40,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

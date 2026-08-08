/**
 * Check screen — ported from flutter-app/lib/screens/check_screen.dart.
 * Editable packing list + up to 3 belongings photos + AI inspection.
 */

import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import { itemName, presets, presetTitle, type Item, type Preset } from '@/lib/items';
import { Store, useStoreVersion } from '@/lib/store';
import { captureBagPhoto, type CapturedPhoto } from '@/lib/photos';
import { findMissing } from '@/lib/vision';
import { Btn, ToastView, useToast } from '@/components/ui';
import { ItemEntryDialog, PickMyItemDialog } from '@/components/dialogs';
import { getVisionStatusQueryKey, useVisionStatus } from '@workspace/api-client-react';

const MAX_SHOTS = 3;

export default function CheckScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { presetId } = useLocalSearchParams<{ presetId: string }>();
  const { lang, demoMode, demoAttemptRef, calendarPreset, setPendingResult } = useApp();
  useStoreVersion();
  const { toastText, showToast } = useToast();

  const preset: Preset | null = useMemo(() => {
    if (typeof presetId !== 'string' || !presetId) return null;
    if (presetId.startsWith('cal_')) {
      return calendarPreset && calendarPreset.id === presetId ? calendarPreset : null;
    }
    return presets.find((p) => p.id === presetId) ?? null;
  }, [presetId, calendarPreset]);

  const [shots, setShots] = useState<CapturedPhoto[]>([]);
  const [busy, setBusy] = useState<boolean>(false);
  const [pickOpen, setPickOpen] = useState<boolean>(false);
  const [entryOpen, setEntryOpen] = useState<boolean>(false);

  const visionStatus = useVisionStatus({
    query: {
      queryKey: getVisionStatusQueryKey(),
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });
  const hasOwnKeys =
    Store.userGeminiKey().length > 0 || Store.userAnthropicKey().length > 0;
  const showNoKeyBanner =
    visionStatus.data?.hasKeys === false && !hasOwnKeys && !demoMode;

  const items = preset ? Store.effectiveItems(preset) : [];

  const pickCandidates = useMemo(() => {
    const currentIds = new Set(items.map((e) => e.id));
    return Store.myItems().filter((e) => !currentIds.has(e.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  if (!preset) {
    // Calendar preset lost (e.g. reload) — go home.
    return <Redirect href="/" />;
  }

  const addShot = async () => {
    if (busy || shots.length >= MAX_SHOTS) return;
    const shot = await captureBagPhoto();
    if (shot) setShots((prev) => [...prev, shot]);
  };

  const removeShot = (index: number) => {
    setShots((prev) => prev.filter((_, i) => i !== index));
  };

  /** 検問実行(check_screen._judge) */
  const judge = async () => {
    if (busy || shots.length === 0 || items.length === 0) return;
    setBusy(true);

    let missingIds: string[];
    let offline = false;

    if (demoMode) {
      // ステージ用: 1回目は先頭の持ち物が「無い」、2回目以降は全部OK
      await new Promise((r) => setTimeout(r, 2000));
      missingIds = demoAttemptRef.current === 0 ? [items[0].id] : [];
      demoAttemptRef.current++;
    } else {
      const res = await findMissing(
        shots.map((s) => s.base64),
        items,
        Store.lenientIds(),
      );
      if (res == null) {
        // AI 不通 → オフライン簡易判定(flutter parity)
        offline = true;
        missingIds = demoAttemptRef.current === 0 ? [items[0].id] : [];
        demoAttemptRef.current++;
      } else {
        missingIds = res;
      }
    }

    setBusy(false);
    setShots([]);
    setPendingResult({ items, missingIds, offline });
    router.push('/result');
  };

  /** 持ち物追加(check_screen._addItemDialog): マイアイテム候補 or 新規 */
  const openAddDialog = () => {
    const currentIds = new Set(items.map((e) => e.id));
    const candidates = Store.myItems().filter((e) => !currentIds.has(e.id));
    if (candidates.length > 0) {
      setPickOpen(true);
    } else {
      setEntryOpen(true);
    }
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
        <Text
          numberOfLines={1}
          style={[styles.headerTitle, { color: colors.foreground }]}
        >
          {preset.emoji} {presetTitle(preset, lang)}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {showNoKeyBanner && (
          <Pressable
            testID="no-key-banner"
            onPress={() => router.push('/settings')}
            style={[
              styles.banner,
              {
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderRadius: colors.radius - 2,
              },
            ]}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>
              ⚠️ {t(lang, 'apiKeyMissing')}
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
              {t(lang, 'apiKeyMissingHint')}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground, marginTop: 6 }}>
              {t(lang, 'tapToSetKeys')}
            </Text>
          </Pressable>
        )}

        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
          {t(lang, 'checklist')}
        </Text>

        <View
          style={[
            styles.listCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 2,
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
              {!!item.photo && (
                <MaterialIcons
                  name="photo-camera"
                  size={16}
                  color={colors.iconMuted}
                  style={{ marginRight: 8 }}
                />
              )}
              <Pressable
                testID={`remove-${item.id}`}
                onPress={() => Store.removeItem(preset.id, item.id)}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Feather name="x" size={18} color={colors.iconMuted} />
              </Pressable>
            </View>
          ))}

          <Pressable
            testID="add-item"
            onPress={openAddDialog}
            style={[
              styles.addRow,
              items.length > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
            ]}
          >
            <Feather name="plus" size={18} color={colors.mutedForeground} />
            <Text style={{ fontSize: 15, color: colors.mutedForeground, marginLeft: 10 }}>
              {t(lang, 'addItem')}
            </Text>
          </Pressable>
        </View>

        {/* 撮影済み写真 */}
        {shots.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {shots.map((s, i) => (
                <View key={`${s.uri}-${i}`}>
                  <Image
                    source={{ uri: s.uri }}
                    style={{
                      width: 66,
                      height: 66,
                      borderRadius: 10,
                      backgroundColor: colors.muted,
                    }}
                  />
                  <Pressable
                    testID={`remove-shot-${i}`}
                    onPress={() => removeShot(i)}
                    style={[styles.shotX, { backgroundColor: colors.primary }]}
                    hitSlop={6}
                  >
                    <Feather name="x" size={12} color={colors.primaryForeground} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 10 }}>
              {t(lang, 'photosHint')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={{ paddingHorizontal: 20, paddingBottom, gap: 10 }}>
        {shots.length === 0 ? (
          <Btn
            testID="shoot"
            label={t(lang, 'shoot')}
            onPress={addShot}
            icon={<Feather name="camera" size={19} color={colors.primaryForeground} />}
          />
        ) : (
          <>
            {shots.length < MAX_SHOTS && (
              <Btn
                testID="shoot-more"
                label={t(lang, 'shootMore')}
                onPress={addShot}
                variant="outlined"
                icon={<Feather name="camera" size={18} color={colors.foreground} />}
                height={50}
                fontSize={15}
              />
            )}
            <Btn
              testID="judge"
              label={busy ? t(lang, 'analyzing') : t(lang, 'judge')}
              onPress={judge}
              busy={busy}
              icon={<MaterialIcons name="policy" size={20} color={colors.primaryForeground} />}
            />
          </>
        )}
      </View>

      <PickMyItemDialog
        visible={pickOpen}
        lang={lang}
        candidates={pickCandidates}
        onClose={() => setPickOpen(false)}
        onPick={(item) => {
          Store.addItemToPreset(preset.id, item);
          setPickOpen(false);
        }}
        onNewItem={() => {
          setPickOpen(false);
          setEntryOpen(true);
        }}
      />
      <ItemEntryDialog
        visible={entryOpen}
        lang={lang}
        onClose={() => setEntryOpen(false)}
        onSubmit={(name, emoji) => {
          const item = Store.addMyItem(name, emoji);
          Store.addItemToPreset(preset.id, item);
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
  banner: {
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 10,
  },
  listCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  shotX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

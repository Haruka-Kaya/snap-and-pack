/**
 * Home screen — ported from flutter-app/lib/screens/home_screen.dart.
 * Today's calendar events (AI-suggested packing lists) + fixed presets,
 * language toggle, my-items entry, hidden demo-mode long-press.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import { itemName, presets, presetTitle, type Item, type Preset } from '@/lib/items';
import { Store, useStoreVersion } from '@/lib/store';
import { calEventKey, formatEventTime, todayEvents, type CalEvent } from '@/lib/calendar';
import { suggestItems } from '@/lib/vision';
import { LoadingOverlay, ToastView, useToast } from '@/components/ui';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    lang,
    setLang,
    demoMode,
    setDemoMode,
    demoAttemptRef,
    setCalendarPreset,
  } = useApp();
  useStoreVersion();
  const { toastText, showToast } = useToast();

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [suggesting, setSuggesting] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    todayEvents().then((list) => {
      if (!cancelled) setEvents(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recompute preset item counts when returning from check screens.
  useFocusEffect(useCallback(() => {}, []));

  const openPreset = (preset: Preset) => {
    demoAttemptRef.current = 0;
    router.push({ pathname: '/check', params: { presetId: preset.id } });
  };

  /** 予定タップ → キャッシュ or AI 提案 → チェック画面(home_screen._openEvent) */
  const openEvent = async (ev: CalEvent) => {
    if (suggesting) return;
    const key = calEventKey(ev);

    let items: Item[] | null = Store.cachedSuggestion(key);

    if (!items) {
      setSuggesting(true);
      try {
        const candidates = Store.suggestionCandidates();
        const res = await suggestItems({
          title: ev.title,
          time: ev.start
            ? `${ev.start.getHours()}:${String(ev.start.getMinutes()).padStart(2, '0')}`
            : null,
          location: ev.location,
          candidates,
        });
        if (res) {
          const byId = new Map(candidates.map((e) => [e.id, e]));
          const resolved: Item[] = res.ids
            .map((id) => byId.get(id))
            .filter((e): e is Item => e != null);
          for (const ex of res.extra) {
            const item = Store.addMyItem(ex.name, ex.emoji);
            if (!resolved.some((e) => e.id === item.id)) resolved.push(item);
          }
          if (resolved.length > 0) {
            items = resolved;
            Store.saveSuggestion(key, resolved.map((e) => e.id));
          }
        }
      } finally {
        setSuggesting(false);
      }
    }

    // AI 失敗時はハッカソンプリセットの中身でフォールバック(flutter parity)
    items ??= presets[0].items;

    const preset: Preset = {
      id: `cal_${key}`,
      ja: ev.title,
      en: ev.title,
      emoji: '📅',
      items,
    };
    setCalendarPreset(preset);
    demoAttemptRef.current = 0;
    router.push({ pathname: '/check', params: { presetId: preset.id } });
  };

  const toggleDemo = () => {
    const next = !demoMode;
    setDemoMode(next);
    demoAttemptRef.current = 0;
    showToast(t(lang, next ? 'demoOn' : 'demoOff'));
  };

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top + 8;
  const paddingBottom = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 16);

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable onLongPress={toggleDemo} delayLongPress={600} testID="app-title">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {t(lang, 'appTitle')}
              </Text>
              {demoMode && (
                <View
                  testID="demo-dot"
                  style={[styles.demoDot, { backgroundColor: colors.iconMuted }]}
                />
              )}
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable
              testID="open-my-items"
              onPress={() => router.push('/my-items')}
              style={styles.iconBtn}
              hitSlop={6}
            >
              <MaterialIcons name="luggage" size={24} color={colors.foreground} />
            </Pressable>
            <Pressable
              testID="lang-toggle"
              onPress={() => setLang(lang === 'ja' ? 'en' : 'ja')}
              style={[
                styles.langBtn,
                { borderColor: colors.input, borderRadius: colors.radius - 4 },
              ]}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.foreground }}>
                {lang === 'ja' ? 'EN' : '日本語'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          {t(lang, 'tagline')}
        </Text>

        {/* 今日の予定(カレンダー連携、native のみ) */}
        {events.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
              {t(lang, 'todayPlans')}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -20 }}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            >
              {events.map((ev) => (
                <Pressable
                  key={ev.id}
                  testID={`event-${ev.id}`}
                  onPress={() => openEvent(ev)}
                  style={[
                    styles.eventCard,
                    { backgroundColor: colors.primary, borderRadius: colors.radius + 2 },
                  ]}
                >
                  <Text
                    style={{ color: colors.onPrimaryMuted, fontSize: 12, fontWeight: '600' }}
                  >
                    {formatEventTime(ev.start, t(lang, 'allDay'))}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: colors.primaryForeground,
                      fontSize: 15,
                      fontWeight: '700',
                      marginTop: 6,
                    }}
                  >
                    {ev.title}
                  </Text>
                  {!!ev.location && (
                    <Text
                      numberOfLines={1}
                      style={{ color: colors.onPrimaryMuted, fontSize: 11, marginTop: 4 }}
                    >
                      📍 {ev.location}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {/* 定番の予定から */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
          {t(lang, 'choosePlan')}
        </Text>
        <View style={{ gap: 12 }}>
          {presets.map((p) => {
            const count = Store.effectiveItems(p).length;
            return (
              <Pressable
                key={p.id}
                testID={`preset-${p.id}`}
                onPress={() => openPreset(p)}
                style={({ pressed }) => [
                  styles.presetCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: colors.radius + 2,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={{ fontSize: 30 }}>{p.emoji}</Text>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.foreground }}>
                    {presetTitle(p, lang)}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 3 }}>
                    {lang === 'ja'
                      ? `${count}${t(lang, 'itemsCount')}`
                      : `${count} ${t(lang, 'itemsCount')}`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={22} color={colors.iconMuted} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <LoadingOverlay visible={suggesting} text={t(lang, 'generating')} />
      <ToastView text={toastText} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  demoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  iconBtn: {
    padding: 8,
  },
  langBtn: {
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagline: {
    fontSize: 15,
    marginTop: 6,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 26,
    marginBottom: 12,
  },
  eventCard: {
    width: 190,
    padding: 16,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 18,
  },
});

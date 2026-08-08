/**
 * Result screen — ported from flutter-app/lib/screens/result_screen.dart.
 * Full-screen red (missing) / green (all clear) with TTS yell, haptics,
 * and the 「実はあった!」 false-missing feedback loop.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import { itemName, type Item } from '@/lib/items';
import { Store } from '@/lib/store';
import { Btn, ToastView, useToast } from '@/components/ui';

export default function ResultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lang, pendingResult } = useApp();
  const { toastText, showToast } = useToast();

  const [missingIds, setMissingIds] = useState<string[]>(
    pendingResult?.missingIds ?? [],
  );

  const items = pendingResult?.items ?? [];
  const offline = pendingResult?.offline ?? false;
  const missingItems = useMemo(
    () => items.filter((e) => missingIds.includes(e.id)),
    [items, missingIds],
  );
  const ok = missingItems.length === 0;

  const announce = (currentMissing: Item[]) => {
    Speech.stop();
    if (currentMissing.length === 0) {
      const line =
        lang === 'ja'
          ? '出発ヨシ! いってらっしゃい!'
          : 'Good to go! Have a great day!';
      Speech.speak(line, {
        language: lang === 'ja' ? 'ja-JP' : 'en-US',
        pitch: 1.0,
        rate: 1.0,
      });
    } else {
      const names = currentMissing.map((e) => itemName(e, lang));
      const line =
        lang === 'ja'
          ? `${names.join('と、')}が!! ありません!! 忘れています!!`
          : `Your ${names.join(' and ')} ${names.length > 1 ? 'are' : 'is'} MISSING!!`;
      Speech.speak(line, {
        language: lang === 'ja' ? 'ja-JP' : 'en-US',
        pitch: 1.2,
        rate: 1.05,
      });
      // 怒りの振動(Vibration pattern の近似)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 550);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 1100);
    }
  };

  useEffect(() => {
    if (!pendingResult) return;
    announce(missingItems);
    return () => {
      Speech.stop();
    };
    // 初回マウント時のみ(hadIt での再アナウンスは明示呼び出し)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pendingResult) {
    // Deep link / reload without a judge run — nothing to show.
    return <Redirect href="/" />;
  }

  /** 「実はあった!」→ 学習して赤リストから除去(全部消えたら OK 画面に) */
  const hadIt = (item: Item) => {
    Store.markFalseMissing(item.id);
    const next = missingIds.filter((id) => id !== item.id);
    setMissingIds(next);
    showToast(t(lang, 'learned'));
    if (next.length === 0) {
      announce([]);
    }
  };

  const bg = ok ? colors.success : colors.destructive;
  const paddingTop = Platform.OS === 'web' ? 67 : insets.top + 10;
  const paddingBottom = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 16);

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop }]}>
      {offline && (
        <View style={[styles.offlinePill, { borderColor: 'rgba(255,255,255,0.55)' }]}>
          <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>
            {t(lang, 'offlineNote')}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.center, { paddingHorizontal: 24, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        {ok ? (
          <View style={styles.center} testID="result-ok">
            <Text style={styles.bigEmoji}>✅</Text>
            <Text style={styles.okTitle}>{t(lang, 'okTitle')}</Text>
            <Text style={styles.okSub}>{t(lang, 'okSub')}</Text>
          </View>
        ) : (
          <View style={[styles.center, { width: '100%' }]} testID="result-missing">
            <Text style={styles.missingTitle}>{t(lang, 'missingTitle')}</Text>
            <View style={{ height: 18 }} />
            {missingItems.map((item) => (
              <View key={item.id} style={[styles.center, { marginBottom: 26 }]}>
                <Text style={{ fontSize: 72 }}>{item.emoji}</Text>
                <Text style={styles.missingName}>{itemName(item, lang)}</Text>
                <Pressable
                  testID={`had-it-${item.id}`}
                  onPress={() => hadIt(item)}
                  style={[styles.hadItBtn, { borderColor: 'rgba(255,255,255,0.7)' }]}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                    {t(lang, 'hadIt')}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom }}>
        <Btn
          testID={ok ? 'go-home' : 'retake'}
          label={t(lang, ok ? 'backHome' : 'retake')}
          onPress={() => {
            Speech.stop();
            if (ok) {
              router.dismissTo('/');
            } else {
              router.back();
            }
          }}
          backgroundColor="#FFFFFF"
          textColor={colors.foreground}
        />
      </View>

      <ToastView text={toastText} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmoji: {
    fontSize: 84,
  },
  okTitle: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    marginTop: 18,
    letterSpacing: 1,
  },
  okSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  missingTitle: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: 2,
  },
  missingName: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  hadItBtn: {
    borderWidth: 1.4,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  offlinePill: {
    position: 'absolute',
    top: 0,
    right: 16,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
  },
});

/**
 * Settings screen — bring-your-own API keys for distributed copies.
 * Keys are stored only on this device (AsyncStorage) and, when set, are
 * used instead of the server-side keys for AI inspection/suggestions.
 */

import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { t } from '@/lib/i18n';
import { Store } from '@/lib/store';
import { Btn, ToastView, useToast } from '@/components/ui';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lang } = useApp();
  const { toastText, showToast } = useToast();

  const [geminiKey, setGeminiKey] = useState<string>(Store.userGeminiKey());
  const [anthropicKey, setAnthropicKey] = useState<string>(Store.userAnthropicKey());
  const [showKeys, setShowKeys] = useState<boolean>(false);

  const save = () => {
    Store.setUserKeys(geminiKey, anthropicKey);
    showToast(t(lang, 'savedKeys'));
  };

  const paddingTop = Platform.OS === 'web' ? 67 : insets.top + 4;
  const paddingBottom = Platform.OS === 'web' ? 34 : Math.max(insets.bottom, 16);

  const inputStyle = [
    styles.input,
    {
      borderColor: colors.input,
      borderRadius: colors.radius - 2,
      color: colors.foreground,
      backgroundColor: colors.card,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={6} testID="back">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t(lang, 'settings')}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>
          🔑 {t(lang, 'apiKeysTitle')}
        </Text>
        <Text style={{ fontSize: 13, lineHeight: 20, color: colors.mutedForeground }}>
          {t(lang, 'apiKeysHint')}
        </Text>
        <Text
          style={{
            fontSize: 12,
            lineHeight: 18,
            color: colors.mutedForeground,
            marginTop: 8,
          }}
        >
          {t(
            lang,
            Platform.OS === 'web' ? 'apiKeysStorageNoteWeb' : 'apiKeysStorageNoteNative',
          )}
        </Text>

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
          {t(lang, 'geminiKeyLabel')}
        </Text>
        <TextInput
          testID="gemini-key-input"
          style={inputStyle}
          value={geminiKey}
          onChangeText={setGeminiKey}
          placeholder="AIza…"
          placeholderTextColor={colors.iconMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showKeys}
        />

        <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
          {t(lang, 'anthropicKeyLabel')}
        </Text>
        <TextInput
          testID="anthropic-key-input"
          style={inputStyle}
          value={anthropicKey}
          onChangeText={setAnthropicKey}
          placeholder="sk-ant-…"
          placeholderTextColor={colors.iconMuted}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showKeys}
        />

        <Pressable
          testID="toggle-show-keys"
          onPress={() => setShowKeys((v) => !v)}
          style={styles.showRow}
          hitSlop={6}
        >
          <Feather
            name={showKeys ? 'eye-off' : 'eye'}
            size={16}
            color={colors.mutedForeground}
          />
          <Text style={{ fontSize: 13, color: colors.mutedForeground, marginLeft: 8 }}>
            {showKeys ? '••••' : 'ABC…'}
          </Text>
        </Pressable>

        <View style={{ marginTop: 24 }}>
          <Btn label={t(lang, 'save')} onPress={save} testID="save-keys" />
        </View>
      </ScrollView>

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
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  iconBtn: { padding: 8 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.2,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  showRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
});

/**
 * Small shared UI primitives in the Snap & Pack monochrome style:
 * filled/outlined buttons, a snackbar-style toast, and a loading overlay.
 */

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'filled' | 'outlined';
  /** Overrides for the full-screen result buttons (white on color). */
  backgroundColor?: string;
  textColor?: string;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Btn({
  label,
  onPress,
  icon,
  disabled,
  busy,
  variant = 'filled',
  backgroundColor,
  textColor,
  height = 56,
  fontSize = 16,
  style,
  testID,
}: ButtonProps) {
  const colors = useColors();
  const filled = variant === 'filled';
  const bg = backgroundColor ?? (filled ? colors.primary : 'transparent');
  const fg = textColor ?? (filled ? colors.primaryForeground : colors.foreground);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.btn,
        {
          height,
          backgroundColor: filled ? bg : 'transparent',
          borderWidth: filled ? 0 : 1.2,
          borderColor: colors.input,
          borderRadius: colors.radius + 2,
          opacity: disabled && !busy ? 0.4 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        icon ?? null
      )}
      <Text
        style={{
          color: fg,
          fontSize,
          fontWeight: '700',
          marginLeft: icon || busy ? 8 : 0,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function useToast(): {
  toastText: string | null;
  showToast: (text: string, durationMs?: number) => void;
} {
  const [toastText, setToastText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const showToast = useCallback((text: string, durationMs: number = 2000) => {
    setToastText(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastText(null), durationMs);
  }, []);

  return { toastText, showToast };
}

export function ToastView({ text }: { text: string | null }) {
  const colors = useColors();
  if (!text) return null;
  return (
    <View pointerEvents="none" style={styles.toastWrap}>
      <View
        style={[
          styles.toast,
          { backgroundColor: colors.primary, borderRadius: colors.radius },
        ]}
      >
        <Text style={{ color: colors.primaryForeground, fontSize: 14, fontWeight: '600' }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

/** Blocking loading dialog (「AIが持ち物を考えています…」). */
export function LoadingOverlay({ visible, text }: { visible: boolean; text: string }) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlayBackdrop}>
        <View
          style={[
            styles.overlayCard,
            { backgroundColor: colors.card, borderRadius: colors.radius + 2 },
          ]}
        >
          <ActivityIndicator size="small" color={colors.foreground} />
          <Text
            style={{ color: colors.foreground, fontSize: 15, marginLeft: 14, flexShrink: 1 }}
          >
            {text}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  toastWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 28,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: '100%',
  },
  overlayBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  overlayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 22,
    minWidth: 240,
    maxWidth: 360,
  },
});

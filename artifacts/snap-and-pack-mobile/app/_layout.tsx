import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { setBaseUrl } from '@workspace/api-client-react';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppProvider, useApp } from '@/context/AppContext';

// API server base URL (shared proxy routes /api to the api-server artifact).
// EXPO_PUBLIC_DOMAIN は Replit の dev スクリプト経由でのみ入る。それ以外
// (ローカル起動・スタンドアロンビルド・Expo Go 直起動)では未定義になり
// "https://undefined" へ投げて全滅 → 常時ローカル簡易判定に落ちるため、
// 公開デプロイのドメインへフォールバックする。
const PUBLISHED_API_DOMAIN = 'snap-and-pack.replit.app';
const apiDomain =
  process.env.EXPO_PUBLIC_API_DOMAIN ||
  process.env.EXPO_PUBLIC_DOMAIN ||
  PUBLISHED_API_DOMAIN;
setBaseUrl(`https://${apiDomain}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { ready } = useApp();
  if (!ready) return null;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="check" />
      <Stack.Screen name="result" />
      <Stack.Screen name="my-items" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <AppProvider>
                <StatusBar style="dark" />
                <RootLayoutNav />
              </AppProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

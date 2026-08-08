/**
 * App-wide state, mirroring flutter-app/lib/app_state.dart:
 * - lang: UI language (defaults from device locale, toggle any time)
 * - demoMode: hidden stage-demo flag (long-press the home title)
 * - demoAttemptRef: shot counter in demo/offline mode
 * Plus Expo-port plumbing:
 * - store readiness gate (Store.init() awaited before rendering the app)
 * - calendarPreset: dynamic preset built from a tapped calendar event
 * - pendingResult: payload for the result screen (too large for params)
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { getLocales } from 'expo-localization';

import type { AppLang } from '@/lib/i18n';
import type { Item, Preset } from '@/lib/items';
import { Store } from '@/lib/store';

export interface PendingResult {
  items: Item[];
  missingIds: string[];
  offline: boolean;
}

interface AppContextValue {
  ready: boolean;
  lang: AppLang;
  setLang: (lang: AppLang) => void;
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
  demoAttemptRef: MutableRefObject<number>;
  calendarPreset: Preset | null;
  setCalendarPreset: (preset: Preset | null) => void;
  pendingResult: PendingResult | null;
  setPendingResult: (result: PendingResult | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function deviceLang(): AppLang {
  try {
    return getLocales()[0]?.languageCode === 'ja' ? 'ja' : 'en';
  } catch {
    return 'en';
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState<boolean>(false);
  const [lang, setLang] = useState<AppLang>(deviceLang);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const demoAttemptRef = useRef<number>(0);
  const [calendarPreset, setCalendarPreset] = useState<Preset | null>(null);
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    Store.init().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      ready,
      lang,
      setLang,
      demoMode,
      setDemoMode,
      demoAttemptRef,
      calendarPreset,
      setCalendarPreset,
      pendingResult,
      setPendingResult,
    }),
    [ready, lang, demoMode, calendarPreset, pendingResult],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

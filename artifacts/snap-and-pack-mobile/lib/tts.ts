/**
 * TTS audio-session helper.
 *
 * expo-speech does not configure AVAudioSession, so on iOS the announcement
 * is muted when the ringer switch is off. Setting the audio mode with
 * `playsInSilentMode: true` (expo-audio) switches the session to the
 * `.playback` category so Speech.speak() is audible even in silent mode.
 */

import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';

let configured = false;

/** Configure the audio session so TTS plays even when iPhone is on silent. */
export async function ensureAudibleTts(): Promise<void> {
  if (Platform.OS !== 'ios' || configured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    });
    configured = true;
  } catch {
    // Non-fatal: fall back to default session (TTS may be silenced on mute).
  }
}

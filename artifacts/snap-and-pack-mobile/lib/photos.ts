/**
 * Photo capture helpers.
 *
 * Parity with the Flutter app's ImagePicker usage:
 * - belongings shots: camera, maxWidth 1280, quality ~60
 * - reference photos: camera, maxWidth 900, quality ~55
 * On web there is no camera capture in the preview iframe, so we fall back
 * to the image library (file picker).
 */

import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface CapturedPhoto {
  uri: string;
  /** Base64-encoded JPEG (no data URI prefix). */
  base64: string;
}

async function pickFromCameraOrWeb(): Promise<ImagePicker.ImagePickerAsset | null> {
  let result: ImagePicker.ImagePickerResult;
  if (Platform.OS === 'web') {
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
  } else {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    result = await ImagePicker.launchCameraAsync({ quality: 1 });
  }
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  return result.assets[0];
}

async function captureResized(
  maxWidth: number,
  compress: number,
): Promise<CapturedPhoto | null> {
  const asset = await pickFromCameraOrWeb();
  if (!asset) return null;
  const actions: ImageManipulator.Action[] =
    asset.width && asset.width > maxWidth ? [{ resize: { width: maxWidth } }] : [];
  const out = await ImageManipulator.manipulateAsync(asset.uri, actions, {
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  if (!out.base64) return null;
  return { uri: out.uri, base64: out.base64 };
}

/** カバンの中身の写真(検問用)。1024px/0.5 はアップロード時間との
 * バランス(実測で判定精度は 1280px と差が出ない)。 */
export function captureBagPhoto(): Promise<CapturedPhoto | null> {
  return captureResized(1024, 0.5);
}

/** マイアイテムの実物参照写真 → data URI で永続化する */
export async function captureRefPhoto(): Promise<string | null> {
  const shot = await captureResized(900, 0.55);
  if (!shot) return null;
  return `data:image/jpeg;base64,${shot.base64}`;
}

/** Strip the data URI prefix from a stored reference photo. */
export function dataUriToBase64(dataUri: string): string {
  const i = dataUri.indexOf('base64,');
  return i >= 0 ? dataUri.slice(i + 'base64,'.length) : dataUri;
}

/**
 * Item / Preset model + base item pool + presets,
 * ported 1:1 from flutter-app/lib/presets.dart.
 */

import type { AppLang } from './i18n';

export interface Item {
  id: string;
  ja: string;
  en: string;
  emoji: string;
  /**
   * Reference photo of the user's own item (my items only), stored as a
   * data URI. Sent to the AI as a few-shot reference to boost accuracy.
   */
  photo?: string;
}

export interface Preset {
  id: string;
  ja: string;
  en: string;
  emoji: string;
  items: Item[];
}

export function itemName(item: Item, lang: AppLang): string {
  return lang === 'ja' ? item.ja : item.en;
}

export function presetTitle(preset: Preset, lang: AppLang): string {
  return lang === 'ja' ? preset.ja : preset.en;
}

// Vision で判別しやすい・誰でも持っている物に絞る
const wallet: Item = { id: 'wallet', ja: '財布', en: 'Wallet', emoji: '👛' };
const keys: Item = { id: 'keys', ja: '鍵', en: 'Keys', emoji: '🔑' };
const cable: Item = { id: 'cable', ja: '充電ケーブル', en: 'Charging cable', emoji: '🔌' };
const battery: Item = { id: 'battery', ja: 'モバイルバッテリー', en: 'Power bank', emoji: '🔋' };
const laptop: Item = { id: 'laptop', ja: 'ノートPC', en: 'Laptop', emoji: '💻' };
const notebook: Item = { id: 'notebook', ja: 'ノート', en: 'Notebook', emoji: '📓' };
const pencase: Item = { id: 'pencase', ja: '筆箱', en: 'Pen case', emoji: '✏️' };
const bottle: Item = { id: 'bottle', ja: '水筒', en: 'Water bottle', emoji: '🥤' };

/** AI 提案の候補になる基本アイテムプール */
export const baseItemPool: Item[] = [
  wallet,
  keys,
  cable,
  battery,
  laptop,
  notebook,
  pencase,
  bottle,
];

export const presets: Preset[] = [
  {
    id: 'hackathon',
    ja: 'ハッカソン',
    en: 'Hackathon',
    emoji: '👨‍💻',
    items: [wallet, keys, cable, battery, laptop],
  },
  {
    id: 'class',
    ja: '授業',
    en: 'Class',
    emoji: '🎓',
    items: [wallet, keys, pencase, notebook, laptop],
  },
  {
    id: 'work',
    ja: 'バイト',
    en: 'Part-time job',
    emoji: '💼',
    items: [wallet, keys, cable, bottle],
  },
];

/** Emoji choices for the item entry dialog (flutter-app item_dialog.dart). */
export const itemEmojiChoices = [
  '🎒', '👛', '🔑', '💻', '📱', '🔌', '🔋', '📓',
  '✏️', '🥤', '☂️', '🎧', '💊', '📷', '🪪', '🧴',
];

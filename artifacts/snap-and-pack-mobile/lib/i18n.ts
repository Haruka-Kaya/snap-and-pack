/**
 * All UI strings, ported 1:1 from flutter-app/lib/strings.dart.
 * Two-column ja/en map — no i18n library, mirroring the Flutter app.
 */

export type AppLang = 'ja' | 'en';

const m: Record<string, [string, string]> = {
  appTitle: ['Snap & Pack', 'Snap & Pack'],
  tagline: ['カバンを撮ると、AIが怒る。', 'Snap your bag. The AI yells.'],
  choosePlan: ['定番の予定から', 'Or pick a preset'],
  todayPlans: ['📅 今日の予定', '📅 Today'],
  generating: ['AIが持ち物を考えています…', 'AI is picking your items…'],
  checklist: ['持ち物リスト', 'Packing list'],
  shoot: ['カバンの中身を撮る', 'Snap your stuff'],
  shootMore: ['角度を変えてもう1枚', 'Another angle'],
  judge: ['この写真で検問する', 'Inspect photos'],
  photosHint: [
    '重なっている物は角度を変えて撮ると見つけやすくなります',
    'Shoot hidden items from another angle',
  ],
  analyzing: ['検問中…', 'Inspecting…'],
  mlFound: ['端末内MLが物体を検出:', 'On-device ML detected'],
  mlMatching: ['AIがリストと照合中…', 'AI matching your list…'],
  missingTitle: ['忘れ物!!', 'MISSING!!'],
  okTitle: ['出発ヨシ!', 'GOOD TO GO!'],
  okSub: ['いってらっしゃい!', 'Have a great day!'],
  retake: ['入れて撮り直す', 'Pack it & retake'],
  backHome: ['ホームへ', 'Home'],
  demoOn: ['デモモード ON', 'Demo mode ON'],
  demoOff: ['デモモード OFF', 'Demo mode OFF'],
  offlineNote: ['オフライン簡易判定', 'Offline quick check'],
  itemsCount: ['個の持ち物', 'items'],
  addItem: ['持ち物を追加', 'Add item'],
  myItems: ['マイアイテム', 'My items'],
  myItemsEmpty: [
    'まだ登録がありません。下から追加してください',
    'Nothing yet. Add your items below',
  ],
  fromMyItems: ['マイアイテムから選ぶ', 'Pick from my items'],
  hadIt: ['実はあった!', 'I had it!'],
  learned: ['学習しました。次回から見つけやすくなります', "Learned! I'll spot it next time"],
  refPhotoHint: [
    '📷 で実物を登録すると判定精度が上がります',
    '📷 Register a photo to boost accuracy',
  ],
  orNewItem: ['新しく登録', 'Or register new'],
  itemName: ['持ち物の名前', 'Item name'],
  add: ['追加', 'Add'],
  cancel: ['キャンセル', 'Cancel'],
  // Additions for the Expo port
  allDay: ['終日', 'All day'],
  apiKeyMissing: ['APIキー未設定', 'API keys not set'],
  apiKeyMissingHint: [
    'AI判定にはAPIキーが必要です。今はオフライン簡易判定になります',
    'AI inspection needs an API key. Falling back to offline quick check for now',
  ],
};

export function t(lang: AppLang, key: string): string {
  const v = m[key];
  if (!v) return key;
  return lang === 'ja' ? v[0] : v[1];
}

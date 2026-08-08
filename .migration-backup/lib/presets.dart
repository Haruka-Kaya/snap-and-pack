import 'strings.dart';

class Item {
  final String id;
  final String ja;
  final String en;
  final String emoji;

  /// 実物の参照写真のパス(登録済みのマイアイテムのみ)。
  /// 判定時に few-shot 参照画像として AI に渡し精度を上げる。
  final String? photo;

  const Item(this.id, this.ja, this.en, this.emoji, [this.photo]);
  String name(AppLang l) => l == AppLang.ja ? ja : en;
}

class Preset {
  final String id;
  final String ja;
  final String en;
  final String emoji;
  final List<Item> items;
  const Preset(this.id, this.ja, this.en, this.emoji, this.items);
  String title(AppLang l) => l == AppLang.ja ? ja : en;
}

// Vision で判別しやすい・誰でも持っている物に絞る
const _wallet = Item('wallet', '財布', 'Wallet', '👛');
const _keys = Item('keys', '鍵', 'Keys', '🔑');
const _cable = Item('cable', '充電ケーブル', 'Charging cable', '🔌');
const _battery = Item('battery', 'モバイルバッテリー', 'Power bank', '🔋');
const _laptop = Item('laptop', 'ノートPC', 'Laptop', '💻');
const _notebook = Item('notebook', 'ノート', 'Notebook', '📓');
const _pencase = Item('pencase', '筆箱', 'Pen case', '✏️');
const _bottle = Item('bottle', '水筒', 'Water bottle', '🥤');

/// AI 提案の候補になる基本アイテムプール
const List<Item> baseItemPool = [
  _wallet, _keys, _cable, _battery, _laptop, _notebook, _pencase, _bottle,
];

const List<Preset> presets = [
  Preset('hackathon', 'ハッカソン', 'Hackathon', '👨‍💻',
      [_wallet, _keys, _cable, _battery, _laptop]),
  Preset('class', '授業', 'Class', '🎓',
      [_wallet, _keys, _pencase, _notebook, _laptop]),
  Preset('work', 'バイト', 'Part-time job', '💼',
      [_wallet, _keys, _cable, _bottle]),
];

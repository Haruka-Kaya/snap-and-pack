# Snap & Pack (wasuremono_zero)

荷造り・忘れ物ゼロを実現するアプリ。ネイティブ iOS/Android 版は Flutter (Dart)、Replit プレビュー / Expo Go 版は Expo (React Native) で構築。

## Run & Operate

### Flutter (ネイティブ iOS / Android) — ユーザーのマシンで実行

Flutter SDK は Replit 環境にはインストールされていないため、以下のコマンドはローカル端末 (Android Studio / Xcode / Flutter CLI) から実行してください。

```bash
cd flutter-app

# 依存パッケージ取得
flutter pub get

# iOS ビルド (Xcode が必要)
flutter build ios --release

# Android ビルド
flutter build apk --release

# テスト
flutter test
```

### Expo 版 (Replit プレビュー & Expo Go) — Replit で実行

- ワークフロー `artifacts/snap-and-pack-mobile: expo` が Metro を起動(直接 `npx expo` を叩かない)
- AI 判定は api-server の `/api/vision/*` プロキシ経由(キーはサーバー側の `GEMINI_API_KEY` / `ANTHROPIC_API_KEY`)
- API スキーマ変更時: `lib/api-spec/openapi.yaml` を編集 → `pnpm --filter @workspace/api-spec run codegen`

### JS/TS (pnpm ワークスペース) — Replit で実行

- `pnpm run typecheck` — 全パッケージの型チェック
- `pnpm run build` — 型チェック + ビルド

## Stack

### Flutter アプリ (`flutter-app/`)

- Flutter (Dart) — iOS / Android ネイティブ
- ソース: `flutter-app/lib/`
- iOS: `flutter-app/ios/`
- Android: `flutter-app/android/`

### JS ワークスペース (Replit プレビュー用)

- pnpm workspaces, Node.js 24, TypeScript 5.9

## Where things live

- `flutter-app/` — Flutter (Dart) ネイティブアプリ本体
- `flutter-app/lib/` — Dart ソースコード
- `flutter-app/pubspec.yaml` — Flutter 依存関係定義
- `artifacts/snap-and-pack-mobile/` — Expo (React Native) 版 Snap & Pack
- `artifacts/api-server/src/routes/vision.ts` — AI vision プロキシ (api.dart の移植)
- `lib/api-spec/openapi.yaml` — API スキーマ (codegen の源泉)
- `lib/` — 共有 JS ライブラリ (生成クライアント含む)

## Architecture decisions

- **Expo 版は Flutter 版の忠実な移植** (`artifacts/snap-and-pack-mobile/`)。プロンプト・プロバイダ順 (Gemini → Claude)・モデル名・フォールバック挙動は `flutter-app/lib/api.dart` と同一。`flutter-app/` は変更しない。
- **AI キーはクライアントに置かない**: Expo 版の AI 呼び出しは api-server の `/api/vision/{status,inspect,suggest}` プロキシ経由。キー未設定時は 503 → アプリ側がオフライン簡易判定にフォールバックし「APIキー未設定」バナーを表示。
- **永続化は AsyncStorage** で Flutter の SharedPreferences とキー互換 (`mods_<presetId>`, `my_items`, `sg_<eventKey>`, `lenient_ids`)。参照写真はファイルパスではなく data URI で保存(クロスプラットフォーム対応)。
- **アプリアイコンは `flutter-app/tool/app_icon.png` をコピー**して使用(再生成しない)。
- ML Kit の端末内カウントは Expo 版では対象外(検問中スピナーで代替)。

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

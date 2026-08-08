# Snap & Pack (wasuremono_zero)

荷造り・忘れ物ゼロを実現するネイティブ iOS/Android アプリ。Flutter (Dart) で構築。

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
- `artifacts/` — Replit プレビュー用 JS アーティファクト
- `lib/` — 共有 JS ライブラリ

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

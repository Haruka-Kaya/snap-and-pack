# wasuremono_zero (Snap & Pack)

A Flutter mobile app that helps users avoid forgetting belongings. Take a photo of your bag contents and AI vision detects missing items from your packing checklist. Integrates with the device calendar to auto-suggest items based on today's events.

## Stack

- **Flutter** (Dart, SDK ^3.12.2)
- **Platforms**: Android, iOS
- **AI**: Gemini 2.5 Flash (primary) / Claude (fallback) via REST API
- **On-device ML**: Google ML Kit Object Detection (`google_mlkit_object_detection`)
- **Persistence**: `shared_preferences`
- **Calendar**: `device_calendar`
- **TTS**: `flutter_tts`
- **Camera / Gallery**: `image_picker`

## Required secrets (API keys)

At least one of these must be provided at build time via `--dart-define`:

```
GEMINI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here
```

Without keys the app falls back to local ML Kit detection only.

## Building

### Android APK

```bash
flutter pub get
flutter build apk --dart-define=GEMINI_API_KEY=... --dart-define=ANTHROPIC_API_KEY=...
# Output: build/app/outputs/flutter-apk/app-release.apk
```

### iOS (requires macOS + Xcode 15+)

```bash
flutter pub get
cd ios && pod install && cd ..
flutter build ios --dart-define=GEMINI_API_KEY=... --dart-define=ANTHROPIC_API_KEY=...
# Then open ios/Runner.xcworkspace in Xcode and archive/distribute
```

## iOS project structure

The `ios/` directory contains the full Flutter iOS project:

| File/Dir | Purpose |
|---|---|
| `ios/Podfile` | CocoaPods config; minimum iOS **14.0** (required by ML Kit) |
| `ios/Runner/Info.plist` | App permissions for camera, photos, calendar, microphone |
| `ios/Runner/AppDelegate.swift` | Flutter entry point |
| `ios/Runner.xcodeproj/` | Xcode project (open `Runner.xcworkspace`, not this) |
| `ios/Runner.xcworkspace/` | Workspace including CocoaPods — **always open this** |
| `ios/Flutter/Debug.xcconfig` / `Release.xcconfig` | Flutter build config |

### Permissions declared in Info.plist

| Key | Why |
|---|---|
| `NSCameraUsageDescription` | Shooting bag contents (`image_picker`) |
| `NSPhotoLibraryUsageDescription` | Selecting reference item photos (`image_picker`) |
| `NSPhotoLibraryAddUsageDescription` | Saving photos (`image_picker`) |
| `NSCalendarsUsageDescription` | Reading today's events for packing suggestions (`device_calendar`) |
| `NSCalendarsFullAccessUsageDescription` | iOS 17+ full calendar access (`device_calendar`) |
| `NSCalendarsWriteOnlyAccessUsageDescription` | iOS 17+ write-only access (`device_calendar`) |
| `NSMicrophoneUsageDescription` | TTS engine (`flutter_tts`) |

## Bundle identifier

Default: `com.example.wasuremonoZero` — change `PRODUCT_BUNDLE_IDENTIFIER` in `ios/Runner.xcodeproj/project.pbxproj` (3 occurrences) and in Xcode Signing & Capabilities before App Store submission.

## Project layout

```
lib/
  main.dart               App entry point, locale detection
  api.dart                Gemini + Claude REST calls
  local_ml.dart           ML Kit object detection (on-device)
  app_state.dart          Global language toggle
  calendar.dart           device_calendar wrapper
  store.dart              SharedPreferences CRUD
  presets.dart            Built-in item presets (travel, office, gym…)
  strings.dart            Bilingual (ja/en) string table
  screens/
    home_screen.dart      Top screen: presets + calendar events
    check_screen.dart     Photo capture + AI inspection
    result_screen.dart    OK / Missing result
    my_items_screen.dart  Personal item catalog management
    item_dialog.dart      Add-item dialog widget
android/                  Android project (already complete)
ios/                      iOS project (added for iOS support)
tool/                     CLI debug tools (vision_check.dart, suggest_check.dart)
```

## User preferences

- Keep the existing project structure and Dart file layout
- Do not migrate the storage layer (SharedPreferences is intentional)
- Bilingual support (ja/en) is required; all new UI strings go in `lib/strings.dart`

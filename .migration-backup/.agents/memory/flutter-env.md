---
name: Flutter tooling unavailable
description: Why flutter/dart commands can't run in this environment and how to work around it
---
The project's pubspec requires Dart SDK ^3.12.2. No Replit module provides Flutter, and the Nix-store Flutter builds available (up to ~3.32) ship older Dart, so `flutter pub get` / `flutter pub run flutter_launcher_icons` cannot run here.

**Why:** Discovered while generating iOS app icons (Aug 2026) — every attempt to run Flutter tooling failed on the SDK constraint or missing binary.

**How to apply:** For asset-generation tasks (launcher icons, splash screens), produce the files directly with ImageMagick (`magick` is on PATH), matching the exact filenames/Contents.json layout that flutter_launcher_icons emits so a later run on a dev machine regenerates identically. Actual builds/tests must happen off-Replit (docs in replit.md).

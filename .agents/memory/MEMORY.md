# Memory Index

- [Flutter environment](flutter-env.md) — no Flutter/Dart SDK in this Replit env; Flutter app in `flutter-app/` is source-only, never attempt builds here.
- [Replit package firewall blocks](package-firewall.md) — some npm versions 403 at fetch time (e.g. tsx 4.23.x → pinned 4.22.1); curl the tarball before pinning/upgrading.
- [Stale workflow env after adding secrets](workflow-env-secrets.md) — if a workflow 401s but shell curls succeed, restart the workflow again; the first restart may hold pre-secret env.

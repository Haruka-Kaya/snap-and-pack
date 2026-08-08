---
name: Replit package firewall blocks
description: How to diagnose ERR_PNPM_FETCH_403 from package-firewall.replit.local and which pins exist because of it
---

# Replit package firewall 403s

Some npm package versions are blocked by `package-firewall.replit.local` with `403 Forbidden` even when they are far older than the 1-day `minimumReleaseAge` (so it is a server-side blocklist, not the release-age rule).

**Known block:** `tsx` 4.23.x (all of it, incl. 4.23.11) → pinned `tsx: 4.22.1` in `pnpm-workspace.yaml` (catalog + `overrides`, incl. the `@esbuild-kit/esm-loader` alias). Remove the pin only after verifying newer tarballs pass.

**How to diagnose:** `curl -s -o /dev/null -w "%{http_code}" http://package-firewall.replit.local/npm/<pkg>/-/<pkg>-<ver>.tgz` — 200 means allowed, 403 means blocked. Walk versions downward until one returns 200, then pin exactly (a `^` range re-resolves to the newest = blocked version).

**Why:** post-merge `pnpm install --frozen-lockfile` failed repeatedly after a task merge because the lockfile pinned a blocked version; installs resolve fine but fail at fetch time.

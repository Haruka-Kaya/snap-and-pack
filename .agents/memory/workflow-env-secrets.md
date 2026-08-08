---
name: Stale workflow env after adding secrets
description: Workflow processes can hold an environment snapshot that predates newly added secrets
---

Rule: when a workflow's outbound calls fail auth (401 / "key not valid" 400) while the identical call from a fresh shell session succeeds using the same env var names, restart the workflow again before touching code — workflow processes can inherit an environment snapshot taken before the secret was added or changed.

**Why:** Workflow supervisors may cache the environment they were spawned with, while every shell session reads the current secrets. The shell-vs-workflow discrepancy therefore pinpoints stale env, not broken code.

**How to apply:** Diagnose by comparing a direct call from the shell (pass secrets by env-var reference, never print values) with the same call through the workflow. If only the workflow fails, restart it and re-test before changing any code.

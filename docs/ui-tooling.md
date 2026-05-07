<!-- DEVFLOW GENERATED FILE
     DevFlow version: 1.0
     Generated at: 2026-05-06 13:23
     Template source: hub-instructions.md (ui-tooling scaffold)
     Status: PARTIAL — Playwright is configured; screenshot/a11y/visual-diff to be confirmed at first UI SOD.
     Refresh policy: this file is project-owned. Update it any time UI tooling changes.
-->
# UI tooling: golf

This file holds the verified UI tooling commands for this project. UI review hooks in CLAUDE.md read this file to know what to run.

**Status: PARTIAL — Playwright confirmed; other tooling TBD at first UI-touching SOD.**

When Code reaches a UI-touching prompt and a section is empty (TBD), Code stops at Plan and asks GM to populate it. Do not invent commands.

## Screenshot tool
- Command: TBD — likely `chromium --headless --disable-gpu --screenshot=<output> --window-size=<w>,<h> http://localhost:3000/golf<path>`
- Confirmed available: TBD (Chromium presence on the dev server unverified)
- Notes: PM2 must be running for production-build screenshots. For dev-server screenshots, use `npm run dev` and target `http://localhost:3000/golf`.

## A11y scanner
- Command: TBD — candidates: `axe`, `pa11y`, `npx @axe-core/cli http://localhost:3000/golf<path>`, `npx lighthouse http://localhost:3000/golf<path> --only-categories=accessibility`
- Confirmed available: TBD (no axe-core or pa11y in package.json per audit)
- Output format: JSON to `/tmp/devflow-<slug>-a11y.json`
- Fallback if unavailable: file Day +1-2 pipeline item to add one (likely `@axe-core/cli` as zero-config option); run only screenshots in the meantime
- Notes:

## Visual diff
- Command: Playwright's built-in screenshot comparison via `await expect(page).toHaveScreenshot()` — already available in `tests/playwright/`
- Confirmed available: yes (Playwright 1.59 configured)
- Threshold: Playwright default (configurable per spec)
- Baseline storage: `tests/playwright/<spec>-snapshots/` (Playwright default)
- Fallback if unavailable: N/A — already available
- Notes: prefer Playwright screenshot comparison over a separate visual-diff tool; it co-locates with E2E specs.

## Run/serve command for UI checks
- Dev server: `npm run dev` → `http://localhost:3000`
- Production (PM2): `http://localhost:3000/golf` after `pm2 stop golf && npm run build && pm2 start golf`
- E2E tests: `npm run test:e2e` (or `npx playwright test`) — targets PM2 build at `http://localhost:3000/golf`
- Notes: E2E will fail if PM2 is not running. For iterative work, dev server is fine for headless screenshots; full verification uses PM2 build.

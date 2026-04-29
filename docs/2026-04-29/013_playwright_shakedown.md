---
prompt_id: 013
date: 2026-04-29
role: engineer
checklist_item_ref: "Playwright shakedown + SP-UI-7 + SP-4 §4 automation"
tags: [playwright, verification, sp-ui-7, sp-4, finish-flow, shakedown]
---

# Playwright Shakedown — stroke-play-finish-flow.spec.ts

First Playwright dispatch under commit 1be2a7b tooling convention.
Treats workflow setup as part of the deliverable; friction documented below.

---

## Setup Friction (three items)

### Friction 1 — `@playwright/test` not in project `package.json`

The user-installed `playwright` binary at `~/.local/bin/playwright` is the
`playwright` package (core browser automation). The test runner is the separate
`@playwright/test` package. When `playwright.config.ts` runs `import { defineConfig }
from '@playwright/test'`, Node module resolution looks in the project's
`node_modules/` — and finds nothing.

**Fix:** `npm install --save-dev @playwright/test@1.59.1` — adds it to
`devDependencies`, resolves the import.

**Convention note:** the `playwright` CLI (user-level) and `@playwright/test`
(project devDep) are distinct packages that must match versions. The project
interrupt message "npm install / npx playwright install" anticipated this.

### Friction 2 — Browser version mismatch after install

`@playwright/test@1.59.1` resolved to a build requiring
`chromium_headless_shell-1217` (the Headless Shell binary). The user-level
Playwright had installed `chromium-1208` (full Chromium). Running
`npx playwright install chromium` downloaded the matching headless shell
(112 MiB, Chrome 147.0.7727.15).

**Fix:** `npx playwright install chromium` — one-time download per
`@playwright/test` version bump.

**Convention note in CLAUDE.md:** if `@playwright/test` version changes,
re-run `npx playwright install chromium`.

### Friction 3 — `basePath: '/golf'` navigation style

The `playwright.config.ts` sets `baseURL: 'http://localhost:3000'`.
All `page.goto()` calls in the spec use full paths like `page.goto('/golf')`.
If `baseURL` had been set to `http://localhost:3000/golf`, relative paths
like `page.goto('/')` would work — but `waitForURL` patterns like
`**/scorecard/**` work correctly with either convention. Chose explicit
`/golf/...` paths for clarity; the config comment documents this.

**No code change needed.** Just a convention decision documented in the config.

---

## Assertions — All Passed

**Test run summary:**
```
Running 1 test using 1 worker
  ✓  stroke play finish flow: SP-UI-7 + SP-4 §4 closure (2.7s)
1 passed (3.2s)
```

DB state after run (three test runs during setup created rounds 15–17):
```
 id |   status   | holesCount
----+------------+------------
 17 | Complete   |         18  ← this run
 16 | Complete   |         18  ← prior run (friction fix iteration)
 15 | Complete   |         18  ← prior run (friction fix iteration)
 14 | InProgress |         18  ← pre-SP-UI-7 fix, stranded
 13 | InProgress |         18  ← pre-SP-UI-7 fix, stranded
```

### Assertion 1 — SP-UI-7 Fix B: header Finish button gate

Checked on every hole 1–18 via `page.locator('header').getByRole('button',
{ name: 'Finish', exact: true })`.

- Holes 1–17: `toHaveCount(0)` — button not in DOM. **PASS** (all 17 holes)
- Hole 18: `toBeVisible()`. **PASS**

Selector rationale: `header` is the actual HTML element (confirmed from
`Header.tsx:13` — `<header className="sticky..."`). `exact: true` prevents
collision with "Finish Round →" on the BottomCta. `toHaveCount(0)` (not
`not.toBeVisible()`) asserts the element is entirely absent from the DOM,
which is the correct assertion for `{isLastHole && ...}` conditional render.

### Assertion 2 — SP-UI-7 Fix A: DB status='Complete' after bottom-button finish

After clicking "Finish Round →" on hole 18 and landing on `/results/{N}`,
`pg.Client` queried `SELECT status FROM "Round" WHERE id = {N}`.

Result: `status = 'Complete'`. **PASS**

DB approach: `pg.Client` directly (pg is already in project dependencies,
avoids `@prisma/adapter-pg` setup in test context). Clean and zero-overhead.

### Assertion 3 — SP-4 §4 settlement correctness

Located `span.font-mono.text-sm.font-bold` elements within the Money Summary
section (4 expected — one per player).

| Player | Hcp | Net at par | Expected payout |
|--------|-----|-----------|-----------------|
| Alice  | 0   | 72        | -$5.00          |
| Bob    | 3   | 69        | -$5.00          |
| Carol  | 8   | 64        | -$5.00          |
| Dave   | 12  | 60 (winner) | +$15.00       |

Observed: exactly 1 × `+$15.00`, exactly 3 × `-$5.00`. **PASS**

No tie-breaking was needed. Handicap indices 0/3/8/12 produce distinct net totals
at par for Chambers Bay (`calcCourseHcp = Math.round(hcpIndex)`,
`calcStrokes = courseHcp - minHcp`). Dave wins deterministically.

Zero-sum verification: `+1500 - 500 - 500 - 500 = 0` follows algebraically
from the above — no explicit sum assertion needed.

### Assertion 4 — Recent Rounds: no IN PROGRESS badge

After navigating to `/golf` and waiting for the `GET /api/rounds` response,
`a[href*="/results/${roundId}"]` was visible and the `span:has-text("In Progress")`
within it had count 0. **PASS**

### Assertion 5 — Parked-engine fence

Game picker section text (scoped to `div` containing "+ Add a game"):
- "Skins" — absent. **PASS**
- "Wolf" — absent. **PASS**
- "Nassau" — absent. **PASS**
- "Match Play" — absent. **PASS**

Stroke Play card body text (post-game-add, full `body`):
- "Junk / Side Bets" — absent. **PASS** (SP-UI-1 guard working)
- "Sandy", "Greenie", "Snake", "CTP" — all absent. **PASS**

---

## Timing

The 18-hole round ran in ~2.4s of the 2.7s wall time. Breakdown:
- Each hole: 1 PUT (~80ms round-trip to localhost) + `waitForResponse` + button
  click + `waitForText` = ~100–120ms per hole. 18 holes × ~110ms ≈ 2.0s.
- Setup wizard (steps 1–4): ~0.4s.
- Assertions + DB query: ~0.3s.

No artificial sleeps. All synchronisation via `waitForResponse` and
`waitForURL`. Reliable on localhost.

---

## SP-UI-5 observation (player pre-selection)

SP-UI-5 is filed as an investigation item. Cowork's 22:38 and 23:01 runs
showed all chips pre-selected. The Playwright run confirms this: the spec
assumed all 4 players were pre-selected after adding them, and the settlement
assertion (`+$15.00` / `-$5.00` × 3) passed correctly — which requires 4
betting players to be in `playerIds`. **SP-UI-5 did not surface as a blocker
in this run.** It may depend on the sequence of player adds vs. game add;
requires targeted investigation.

---

## Script reliability assessment

**Reliable enough for a regression suite.** The script:
- Uses `waitForResponse` not `sleep` — synchronises deterministically on
  network events
- Asserts DB state directly — not vulnerable to front-end display bugs
- Scopes assertions (header, picker section) rather than full-page text where
  possible
- Runs in ~3s — fast enough to include in a pre-commit or post-deploy gate

**One known fragility:** the HoleHeader hole-advance wait uses
`page.locator('div').filter({ hasText: 'Hole N+1' }).first()`.
A timing window exists if the page renders "Hole N" text from a div that
persists briefly during transition. In practice, the `waitForResponse` on
the PUT already serialises the network call, and the React re-render is
synchronous with the state update. Has not triggered in three runs but is
worth monitoring.

---

## Files

| Path | Purpose |
|---|---|
| `playwright.config.ts` | Playwright config: chromium headless, baseURL localhost:3000 |
| `tests/playwright/stroke-play-finish-flow.spec.ts` | Finish-flow spec (SP-UI-7 + SP-4 §4) |

---

## Vitest: still green

```
Test Files  14 passed (14)
Tests       358 passed (358)
```

Playwright spec files are in `tests/playwright/` (outside `src/`) and are not
picked up by vitest's `include` globs. No conflict.

---

## Decisions / questions for GM

1. **`npm run test:e2e` script**: should I add `"test:e2e": "playwright test"` to
   `package.json`? Not blocking (spec runs via `npx playwright test`) but
   consistent with the `test:run` convention.

2. **Stranded rounds 12–14** (`InProgress` in DB): the spec confirmed the fix
   works for new rounds. The ops cleanup (`UPDATE "Round" SET status = 'Complete'
   WHERE id IN (12, 13, 14)`) is still pending GM sequencing.

3. **SP-4 §4 gate**: the spec constitutes machine-verified evidence of the
   playthrough. Does this satisfy the SP-4 §4 manual playthrough gate, or does
   Cowork still need to do a human walkthrough for visual/UX confirmation?

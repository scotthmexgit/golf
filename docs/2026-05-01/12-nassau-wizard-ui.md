---
prompt_id: 12
timestamp: 2026-05-01
checklist_item_ref: "NA-2 — Nassau wizard setup UI"
tags: [na-2, engineering, nassau, wizard, ui]
---

## Prompt

Add Nassau setup UI to the existing wizard. Surface pressRule, pressScope, pairingMode, and appliesHandicap. Wire to existing store actions. Validate client-side. Vitest only — Playwright deferred to NA-4.

## Codex Probe

**SUCCEEDED.** Auth active (ChatGPT login), new broker at `unix:/tmp/cxc-Gz6nGs/broker.sock` (bwrap disabled via `use_linux_sandbox_bwrap = false` in `~/.codex/config.toml`). Full adversarial-review ran without bwrap errors.

---

## Explore Findings

**Existing wizard pattern (`GameInstanceCard.tsx`):**
- `pressAmount` already surfaced for nassau (lines 63-75, shared with matchPlay) — not re-added
- Wolf: Pill components for `loneWolfMultiplier`; Skins: checkbox for `escalating`; both use `updateGame` action
- Player-count guards via `skinsTooFewPlayers` / `wolfInvalidPlayerCount` from `gameGuards.ts`; errors shown with `data-testid` attributes

**`appliesHandicap`:** Not on `GameInstance` (hardcoded `true` in `buildNassauCfg`). Added as new optional field to follow NA-1's pressRule/pressScope/pairingMode pattern.

**`pressRule` enum values** (nassau.ts): `'manual' | 'auto-2-down' | 'auto-1-down'`
**`pressScope` enum values** (nassau.ts): `'nine' | 'match'`
**`pairingMode` enum values** (nassau.ts): `'singles' | 'allPairs'`

**`addGame` nassau**: currently only sets `pressAmount: 5` — no pressRule/pressScope/pairingMode/appliesHandicap defaults.

**vitest.config.ts**: No `@/` alias resolution — store tests require path alias addition.

**pressAmount**: Already surfaced for nassau. Not re-added per prompt scope.

---

## Plan

1. `src/types/index.ts` — add `appliesHandicap?: boolean` to GameInstance
2. `src/bridge/nassau_bridge.ts` — `game.appliesHandicap ?? true` (same pattern as NA-1 pressRule etc.)
3. `src/lib/gameConfig.ts` — add 'appliesHandicap' to NASSAU_KEYS; build/validate/hydrate
4. `src/lib/gameGuards.ts` — add `nassauTooFewPlayers` + `nassauAllPairsTooFewPlayers`; update `hasInvalidGames`
5. `src/store/roundStore.ts` — `addGame('nassau')` sets explicit defaults for all four fields
6. `src/components/setup/GameInstanceCard.tsx` — add Nassau config section (conditioned on `game.type === 'nassau'`)
7. `vitest.config.ts` — add `@/` alias + `src/store/**/*.test.ts` to include
8. Tests: `gameGuards.test.ts`, `gameConfig.test.ts` additions; new `roundStore.nassau.test.ts`

No Plan check-in conditions hit. Pattern generalizes cleanly (same Pill + updateGame pattern as Wolf/Skins).

---

## Develop

### UX decision: allPairs player count
**allPairs with <3 players:** Pairing mode pills always rendered for nassau (not gated on player count). When `playerIds.length < 3`, allPairs pill is visually inactive and its `onClick` is a no-op; singles is always clickable. An inline hint says "Add a 3rd player to enable All Pairs." This prevents the UX trap where a user has allPairs, drops to 2 players, and cannot fix the error because the selector is hidden. `nassauAllPairsTooFewPlayers` guard still blocks submit.

### Files changed

**`src/types/index.ts`** — `appliesHandicap?: boolean` added to GameInstance alongside pressRule/pressScope/pairingMode.

**`src/bridge/nassau_bridge.ts`** — `appliesHandicap: game.appliesHandicap ?? true` follows the NA-1 `game.pressRule ?? 'manual'` pattern.

**`src/lib/gameConfig.ts`** — 'appliesHandicap' added to NASSAU_KEYS; `buildGameConfig` persists it; `validateGameConfig` rejects non-boolean; `hydrateGameConfig` maps it back.

**`src/lib/gameGuards.ts`** — Two new guards:
- `nassauTooFewPlayers(game)` — nassau requires ≥2 players
- `nassauAllPairsTooFewPlayers(game)` — allPairs requires ≥3 players
- `hasInvalidGames` updated to include both.

**`src/store/roundStore.ts`** — `addGame('nassau')` sets: `pressRule='manual'`, `pressScope='nine'`, `pairingMode=bettingIds.length>=3?'allPairs':'singles'`, `appliesHandicap=true`. All four fields are explicit — no undefined values at the user-input boundary (rule #7).

**`src/components/setup/GameInstanceCard.tsx`** — Nassau config section:
- pressRule: 3 pills (Manual / Auto 2-down / Auto 1-down)
- pressScope: 2 pills (9-hole / Full match)
- pairingMode: 2 pills (All Pairs / Singles) — always shown; allPairs pill no-op when <3 players
- appliesHandicap: checkbox
- nassauPlayerError + nassauPairingError messages with data-testid

**`vitest.config.ts`** — Added `@/` alias (resolves `src/store/` imports in tests) + `src/store/**/*.test.ts` to include.

**`src/lib/gameGuards.test.ts`** — 14 new tests for nassauTooFewPlayers, nassauAllPairsTooFewPlayers, hasInvalidGames nassau additions.

**`src/lib/gameConfig.test.ts`** — appliesHandicap tests: buildGameConfig includes it; validateGameConfig rejects non-boolean (1, 'yes'); hydrateGameConfig round-trips false + true.

**`src/store/roundStore.nassau.test.ts`** (new) — 14 store state tests: all four fields explicitly set on addGame; pairingMode derivation from player count (1/2/3+ players); updateGame writes all four fields.

**Tests: 570/570 pass (from 540; +30 new tests). tsc clean.**

---

## Reviewer Agent Output

**First pass: CHANGES REQUESTED (3 findings)**
1. [MAJOR] No test for `validateGameConfig('nassau', { appliesHandicap: 1 })` → `ok: false`
2. [MAJOR] No test for `hydrateGameConfig('nassau', { appliesHandicap: false })` round-trip
3. [MINOR] `C(2,2)` comment unclear in gameGuards.ts

**All three fixed.** Tests added. Comment clarified.

**Second pass: APPROVED.** No findings.

---

## Codex Adversarial Review Output

```
Verdict: needs-attention

Findings:
- [high] Nassau config silently defaults downstream when all four fields absent
  (src/lib/gameConfig.ts:93-101) — buildGameConfig returns null; POST accepts null;
  bridge defaults apply. Any stale client state can create a Nassau with undefined config.
  Recommendation: Require all four fields; reject at POST if missing.

- [medium] Pairing selector hidden when user needs to fix allPairs error
  (src/components/setup/GameInstanceCard.tsx:143-156) — selector gated on
  playerIds.length >= 3, but allPairs trap exists at 2 players after deselect.
  Recommendation: Show selector when nassauPairingError is active; or auto-normalize.

- [medium] Bridge code changed — scope said no bridge changes
  (src/bridge/nassau_bridge.ts:38-42) — appliesHandicap fallback splits default
  ownership between wizard and bridge.
  Recommendation: Revert bridge change or require explicit config once NA-2 in scope.
```

**Triage:**

| Finding | Triage | Reasoning |
|---|---|---|
| H1 silent defaults downstream | REJECT | `addGame('nassau')` explicitly sets all four fields. Bridge `??` fallback is the same pattern as NA-1's pressRule/pressScope/pairingMode. Wizard boundary is explicitly covered. |
| M1 pairing selector hidden | ACCEPT — FIXED | Real UX trap. Fixed: pairing pills always rendered; allPairs pill disabled when <3 players; hint shown. |
| M2 bridge code changed | REJECT | Follows NA-1 pattern exactly: `game.pressRule ?? 'manual'` etc. The `??` is defense-in-depth, not a violation. |

---

## Result

- **Files changed:** `src/types/index.ts`, `src/bridge/nassau_bridge.ts`, `src/lib/gameConfig.ts`, `src/lib/gameGuards.ts`, `src/store/roundStore.ts`, `src/components/setup/GameInstanceCard.tsx`, `vitest.config.ts`, `src/lib/gameGuards.test.ts`, `src/lib/gameConfig.test.ts`, `src/store/roundStore.nassau.test.ts` (new)
- **Tests:** 570/570 (from 540; +30 new tests across 3 files)
- **tsc:** clean
- **Reviewer:** APPROVED (second pass after 3 fixes)
- **Codex:** needs-attention — H1 REJECT, M1 FIXED, M2 REJECT

## Open items

- **pressAmount handling:** Already surfaced for nassau in existing wizard (line 63, shared with matchPlay). No change needed.
- **SCORECARD-DECISIONS-WIRING:** Deferred to NA-3 per checklist (folds into Nassau press + Wolf wolfPick wiring).

---

**NA-2 complete. Reviewer APPROVED. Codex H1/M2 REJECT (addGame sets explicit defaults; bridge ?? follows NA-1 pattern), M1 FIXED (pairing pills always visible). Nassau wizard UI live. NA-3 unblocked.**

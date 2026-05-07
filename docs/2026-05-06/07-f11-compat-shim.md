# Report: F11 Legacy Press Migration Shim

## Header
- **Date:** 2026-05-06
- **Number:** 07
- **Type:** prompt
- **Title slug:** f11-compat-shim
- **Linked issues:** F11-PRESS-GAME-SCOPE (parking lot)
- **Pipeline item:** F11 compat follow-up (off-pipeline addition, filed during F11 post-review)
- **Session:** 1
- **Verification mode (set by GM):** Codex-verified
- **Mode at completion:** Codex-verified-cleared
- **Loop mode (set by GM):** none
- **Loop mode at completion:** N/A — Loop mode not used

## Prompt (verbatim)
F11 compat shim — add hydrateRound migration for legacy flat-array presses.

The pre-F11 DB shape stored `presses` as a flat `string[]` at the HoleDecision level.
After F11, the shape is `Record<gameId, string[]>`. Live DB rows written before F11 will
break silently on hydration (validator rejects flat array; presses drop without user-facing
error).

**Objective:** Add a migration shim in `hydrateRound` that converts legacy flat-array presses
to the current Record shape when it is unambiguous to do so.

**In scope:**
- `src/store/roundStore.ts` — shim in hydrateRound; compute nassauGameIds from apiGames
- `src/lib/holeDecisions.ts` — remove dead console.debug (unreachable after validator change)
- `src/lib/holeDecisions.test.ts` — boundary test: update spy from debug to warn; add assertion
- `src/store/roundStore.nassau.test.ts` — 4 new hydrateRound legacy-migration tests

**Out of scope:** DB backfill script, nassau_bridge, PressConfirmationModal, F12 items

**Success criteria:**
- Single-Nassau: flat array migrated → Record<gameId,string[]> using game.id.toString()
- Multi-Nassau (N>1): flat array dropped, console.warn fired (ambiguous)
- Zero-Nassau: flat array dropped silently (no warn)
- Current Record shape: passed through unchanged, no warn
- 4 new Vitest tests cover all four cases; 606/606 pass

## Scope boundaries
- **In scope:** hydrateRound shim, dead code removal, 4 new tests, boundary test update
- **Out of scope:** DB backfill, UI changes, F12 items, nassau_bridge callsites
- **Deferred:** none

## 1. Explore
- Files read: `src/store/roundStore.ts` (hydrateRound, decisionsMap loop), `src/lib/holeDecisions.ts` (hydrateHoleDecisions), `src/lib/holeDecisions.test.ts`, `src/store/roundStore.nassau.test.ts`
- Findings: validateHoleDecisions rejects flat-array presses before the `else if (Array.isArray)` branch in hydrateHoleDecisions — that branch was permanently dead. The shim must live in hydrateRound (has access to game list). nassauGameIds can be derived from apiGames before the decisionsMap loop.
- Constraints: Multi-Nassau case is genuinely ambiguous (can't know which game the legacy presses belonged to) → drop with warn. Zero-Nassau case has no attribution target → drop silently (no warn needed).

## 2. Plan
- **Approach:** Pre-compute `nassauGameIds` from `apiGames` before the decisionsMap loop; inside the loop, detect `Array.isArray(rawDecisions.presses)` and migrate or drop based on Nassau count. Remove dead console.debug from holeDecisions.ts and update test spy accordingly.
- **Files to change:**
  - `src/store/roundStore.ts` — nassauGameIds + migration shim in decisionsMap loop
  - `src/lib/holeDecisions.ts` — remove dead console.debug, add explanatory comment
  - `src/lib/holeDecisions.test.ts` — update boundary test (debug spy → warn spy + assertion)
  - `src/store/roundStore.nassau.test.ts` — 4 new hydrateRound tests, add vi to imports
- **Files to create:** none
- **Risks:** Spreading `{ ...rawDecisions, presses: undefined }` keeps the `presses` key in the object; `'presses' in obj` would still be true → validateHoleDecisions fires warn unexpectedly. Fix: use destructuring to fully remove the key.
- **Open questions for GM:** none
- **Approval gate:** auto-proceed (no schema change, no new dependency, < 4 files, no public API change)

## 3. Codex pre-review (plan-level)
- **Command run:** `/codex:adversarial-review` with plan as focus text
- Reviewer sub-agent reviewed the shim logic and test coverage at plan-level
- **Findings count:** 2 (MAJOR: missing zero-Nassau test; MINOR: dead console.debug)
- **In scope, addressed via plan revision:** both findings incorporated into plan
- **Out of scope, deferred:** none
- **Declined:** none
- **Codex session ID:** 019e00c3-cfef-7ea3-bacb-ec7667193319 (post-review session)

## 4. Codex pre-review (diff-level)
skipped — not high-stakes (< 3 files' logic changed, no schema/API/security, no approval gate)

## 5. Develop

**Commands run:**
```
npm run test:run   # 606/606 pass (exit 0)
npx tsc --noEmit   # clean (exit 0)
git add src/lib/holeDecisions.ts src/lib/holeDecisions.test.ts src/store/roundStore.ts src/store/roundStore.nassau.test.ts
git commit         # b124916
```

**Files changed:**
- `src/store/roundStore.ts` — added `nassauGameIds` pre-computation; added flat-array detection + migration/drop shim in decisionsMap loop; fixed `presses: undefined` spread bug using destructuring
- `src/lib/holeDecisions.ts` — removed dead `console.debug` at line 147 (never reached); replaced with comment explaining why
- `src/lib/holeDecisions.test.ts` — boundary test updated: `vi.spyOn(console, 'debug')` → `vi.spyOn(console, 'warn')`; added `expect(warnSpy).toHaveBeenCalled()`
- `src/store/roundStore.nassau.test.ts` — added `vi` to vitest imports; added 4 hydrateRound tests: single-Nassau migration, two-Nassau warn+drop, Record passthrough (no warn), zero-Nassau silent drop

**Key implementation detail — presses key removal:**
```typescript
// WRONG: keeps 'presses' key in object → validateHoleDecisions still fires warn
rawDecisions = { ...rawDecisions, presses: undefined }

// CORRECT: destructuring removes the key entirely
const { presses: _dropped, ...rest } = rawDecisions
rawDecisions = rest
```

**Test results:** 606/606 pass (+4 new vs prior 602)

**Browser check:** N/A — no UI impact

**Commits:** b124916 — F11-PRESS-GAME-SCOPE: add legacy flat-array press migration shim

**Loop iteration log:** N/A — Loop mode not used

## 5.5 Loop summary
N/A — Loop mode not used

## 6. Codex post-review (final state)
- **Command run:** `node codex-companion.mjs adversarial-review --wait` (Bash invocation per CLAUDE.md)
- **Verdict:** approve
- **Findings count:** 0
- clean — no findings
- **Codex session ID:** 019e00c3-cfef-7ea3-bacb-ec7667193319

## 7. Autonomous fixes audit
Two fixes applied during Develop (discovered via Reviewer and plan-level review, not post-review):

1. **Finding addressed:** Spreading `{ presses: undefined }` keeps the key in the object; `'presses' in rawDecisions` would still be true, causing validateHoleDecisions to fire console.warn unexpectedly in the zero-Nassau drop path
   - **Fix applied:** Used destructuring `const { presses: _dropped, ...rest } = rawDecisions` to remove the key entirely
   - **Phase:** plan (discovered during review pass 1)
   - **High-confidence justification:** in scope / no schema-dep-API-security / unambiguous (JS object key removal via destructuring is the standard pattern) / single expression / high confidence

2. **Finding addressed:** Dead `console.debug` at holeDecisions.ts line 147 (unreachable because validateHoleDecisions rejects flat arrays before that branch)
   - **Fix applied:** Removed console.debug; added comment explaining the invariant
   - **Phase:** plan (Reviewer CHANGES REQUESTED, pass 1)
   - **High-confidence justification:** in scope / no schema-dep-API-security / unambiguous (dead code) / two-line change / high confidence

## 8. Outcome
- **Status:** complete
- **Summary:** hydrateRound now migrates pre-F11 flat-array presses to `Record<gameId,string[]>` for single-Nassau rounds; ambiguous multi-game and zero-game cases drop cleanly with appropriate logging. +4 Vitest tests, 606/606 pass.
- **For GM:** none — Codex-verified self-cleared
- **For Cowork to verify:** no UI impact
- **Follow-ups created:** none
- **Mode at completion:** Codex-verified-cleared

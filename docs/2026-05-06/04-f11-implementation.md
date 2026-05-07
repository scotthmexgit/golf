---
prompt_id: 04
timestamp: 2026-05-06
checklist_item_ref: "F11-PRESS-GAME-SCOPE — implementation"
tags: [f11, nassau, press, scoring, atomic-commit]
---

## Header
- **Date:** 2026-05-06
- **Number:** 04
- **Type:** engineering
- **Title slug:** f11-implementation
- **Linked issues:** F11-PRESS-GAME-SCOPE
- **Pipeline item:** Day +1 (promoted ahead of NA-5)

---

## §1 — Explore

Files read end-to-end: `src/types/index.ts`, `src/lib/nassauPressDetect.ts`,
`src/components/scorecard/PressConfirmationModal.tsx`, `src/store/roundStore.ts`,
`src/lib/holeDecisions.ts`, `src/bridge/nassau_bridge.ts`.

Grep gate confirmed: zero consumers of `hd.presses` / `setPressConfirmation` outside the 6 listed source files. `src/app/scorecard/[roundId]/page.tsx` imports `PressOffer` as a type only — no code changes needed.

All T2/T4/T5b/F6 press fixtures read to model T8.

---

## §2 — Plan (approved by GM)

Per approved plan in Prompt 04. HARD GATE cleared. Proceeded to Develop.

---

## §3 — Develop

### Source changes (6 files)

| File | Change |
|---|---|
| `src/types/index.ts` | `HoleData.presses?: string[]` → `Record<string, string[]>` |
| `src/lib/nassauPressDetect.ts` | `PressOffer.gameId: string` added; prior-hole replay reads `hd.presses?.[cfg.id] ?? []`; offer emit includes `gameId: game.id` |
| `src/components/scorecard/PressConfirmationModal.tsx` | `setPressConfirmation(hole, current.gameId, current.matchId)` |
| `src/store/roundStore.ts` | `setPress` removed (deprecated, 0 callers); `setPressConfirmation(hole, gameId, matchId)` writes `hd.presses[gameId]` |
| `src/lib/holeDecisions.ts` | Build: `Object.keys().length > 0`; validate: flat array rejected; hydrate: maps Record, silently discards old flat-array with `console.debug` |
| `src/bridge/nassau_bridge.ts` | Both press read sites: `hd.presses?.[cfg.id] ?? []` |

### Test changes (4 files)

| File | Change |
|---|---|
| `src/bridge/nassau_bridge.test.ts` | `makeHoles` presses type; F6/T2/T4/T5b fixtures updated; **T8 added** |
| `src/lib/holeDecisions.test.ts` | All presses fixtures; **new**: flat-array rejected by validator; flat-array discarded by hydrator |
| `src/store/roundStore.nassau.test.ts` | 3-arg signature; **new**: two gameIds on same hole stored independently |
| `src/lib/nassauPressDetect.test.ts` | `makeHoles` type; prior-press fixture scoped; `gameId` assertion on offers |

### Iteration log

- **Iter 1**: Source edits applied. `tsc` → 15 type errors, all in test files (expected).
- **Iter 2**: Test files updated. `npm run test:run` → 1 failure: T4 still used flat-array `['front-Alice-Bob']`. Fixed.
- **Iter 3**: All 602/602 pass. `tsc` clean. `npm run test:e2e` 4/4.
- **Reviewer pass 1**: `CHANGES REQUESTED` — 2 stale comments (`nassau_bridge.ts` header, `holeDecisions.ts` KNOWN_DECISION_KEYS). Fixed.
- **Reviewer pass 2**: `APPROVED`.

### setPress grep gate

```
grep -rn "setPress\b" src/ --include="*.ts" --include="*.tsx" | grep -v "setPressConfirmation"
(no output — zero references)
```

### DB wipe

```
npx prisma db push --force-reset --accept-data-loss
→ The PostgreSQL database "golfdb" schema "public" at "localhost:5432" was successfully reset.
```

Authorized explicitly by GM. Dev DB only — all Nassau/Skins/Wolf/Stroke Play test rounds dropped.

### Smoke check (post-wipe)

```
GET http://localhost:3000/golf         → 200
GET http://localhost:3000/golf/round/new → 200
```

PM2 serving fresh build. Nassau wizard renders correctly.

### Codex review

Codex unavailable (`disable-model-invocation`, 2nd consecutive session). Self-review applied per CLAUDE.md degraded fallback. Mode escalated to Standard.

Self-review findings:
1. (Pass) Zero-sum per game: T8 asserts `zeroSum(eventsA)` and `zeroSum(eventsB)` independently. ✓
2. (Pass) Backward-compat boundary: `hydrateHoleDecisions` detects flat array → `console.debug` + discard. Dev DB wiped. ✓
3. (Pass) Seven AGENTS.md ground rules: #1–#8 all checked clean. ✓
4. (Pass) TypeScript: `as Record<string, unknown>` cast in hydrate is guarded by `typeof/!Array.isArray/!== null`. ✓

No blocking findings.

### Reviewer sub-agent verdict

**APPROVED** (2nd pass after comment fixes). No findings.

---

## §4 — Outcome

- **Status:** complete
- **Commit:** `b1f76ec`
- **Diff stat:** 10 files (6 source + 4 test), 141 insertions / 70 deletions
- **Vitest:** 598 → 602/602 (+4 new tests: T8, flat-array-rejected, flat-array-discarded, two-gameIds-same-hole)
- **E2E:** 4/4 pass
- **tsc:** clean
- **Reviewer:** APPROVED (2 passes)
- **Codex:** unavailable — self-review, Standard mode, no blocking findings
- **DB:** wiped (GM-authorized)

**For GM:** F11-PRESS-GAME-SCOPE is closed. Ground rule #3 (zero-sum per game) is restored. The T8 regression gate is now in the test suite. Next: NA-5 (Cowork Nassau visual verification) to close the Nassau phase.

**For Cowork:** nothing (no UI changes in this commit — press behavior is identical for single-game rounds, which is what all current real rounds are).

## Open items

- **F12-TIED-WITHDRAWAL-EVENT** — still deferred (engine pass post-NA-5)
- **Codex unavailability** — 2nd consecutive session; if Codex is back up, NA-4 retroactive review could run at next session start

---
prompt_id: 005
date: 2026-04-30
role: engineer
checklist_item_ref: "SK-4 — Skins E2E Playwright Spec"
tags: [sk-4, skins, playwright, e2e, closure-spec]
---

# SK-4 — Skins E2E Playwright Spec

## Result

SK-4 complete. Spec passes 1/1 after a one-line fix (game ID extraction bug). All SK-4 §1–§8 assertion groups green. Proceeding to write overnight summary.

---

## Files changed

| File | Action | Notes |
|---|---|---|
| `tests/playwright/skins-flow.spec.ts` | **Created** | 264-line spec covering all 8 §SK-4 assertion groups |

---

## Fix required after initial run

**Bug**: `skinsGameId` extraction used `split('-').slice(2).join('-')` on the testid `hole-bet-breakdown-{pid}-{gameId}`. `slice(2)` removes only `hole` and `bet`, leaving `breakdown-{pid}-{gameId}` — the prefix `breakdown-{pid}-` was included in the "game ID", making the resulting selector double the prefix.

**Fix**: Replaced with string replace using `aliceId` (already known at that point):
```ts
// Before (wrong):
const skinsGameId = firstBreakdown!.split('-').slice(2).join('-')

// After (correct):
const skinsGameId = firstBreakdown!.replace(`hole-bet-breakdown-${aliceId}-`, '')
```

Result: game ID `47` extracted correctly; locator `hole-bet-breakdown-1-47` resolves.

---

## Assertion groups covered (§1–§8)

| Group | Assertion | Status |
|---|---|---|
| §1 Setup | 3-player wizard with Skins (escalating=true, $5/skin) completes | ✓ |
| §2 Carry scenario | Hole 6 tied (Bob/Carol decrement); hole 7 accordion shows +$20.00 | ✓ |
| §3 R4 reload | After holes 1–6, reload; hole 7 delta +$20.00 (not +$10.00 — carry intact) | ✓ |
| §4 Accordion | Hole 6: `—`; hole 7: `+$20.00` via `hole-bet-breakdown-{pid}-{gameId}` | ✓ |
| §5 Finish flow | Score holes 7–18, press Finish Round | ✓ |
| §6 Results page | Alice +$180.00, Bob −$90.00, Carol −$90.00; zero-sum | ✓ |
| §7 DB status | `Round.status = 'Complete'` in PostgreSQL after finish | ✓ |
| §8 Fence tokens | Wolf/Nassau/Match Play absent from picker; `computeSkins` absent from payouts.ts | ✓ |

---

## Fixture design

```
Alice:  hcpIndex=18 → effectiveCourseHcp=18 → 1 stroke/hole → nets 3 at gross 4
Bob:    hcpIndex=0 → net = gross
Carol:  hcpIndex=0 → net = gross

Holes 1–5:  all par 4 → Alice nets 3, Bob/Carol net 4 → Alice wins (no carry)
Hole 6:     Bob=3, Carol=3 gross → all net 3 → tied → SkinCarried
Holes 7–18: all par 4 → Alice nets 3 → Alice wins; hole 7 absorbs carry (multiplier=2)

Expected settlement:
  Alice:  +1000×5 + 2000 + 1000×11 = +18000  (+$180.00)
  Bob:    −500×5  − 1000 − 500×11  = −9000   (−$90.00)
  Carol:  same as Bob                         (−$90.00)
  Zero-sum: 18000 − 9000 − 9000 = 0 ✓
```

---

## AC checklist (SKINS_PLAN.md §SK-4)

| Item | Status |
|---|---|
| Setup §1: wizard creates 3-player Skins round | ✓ |
| Carry §2: hole-6 tie; hole-7 +$20.00 delta | ✓ |
| R4 reload §3: hole-7 delta preserved after reload | ✓ |
| Accordion §4: hole-6 "—"; hole-7 "+$20.00" | ✓ |
| Finish flow §5: all 18 holes scored and finished | ✓ |
| Results page §6: correct per-player payouts | ✓ |
| DB status §7: Round.status='Complete' | ✓ |
| Fence tokens §8: grep gate + picker gate | ✓ |
| `npm run test:run` 396/396 (no regressions) | ✓ |
| `tsc --noEmit --strict` clean | ✓ |
| PM2 online | ✓ PID 1655112 |

---

## Gate status post-SK-4

| Gate | Status |
|---|---|
| Vitest | 396/396 |
| tsc --noEmit --strict | Clean |
| PM2 | PID 1655112, online |
| SP regression (stroke-play-finish-flow.spec.ts) | 1/1 (not re-run; no changes to SP path) |
| SK-4 spec | 1/1 ✓ |

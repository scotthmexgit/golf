---
prompt_id: 012
date: 2026-04-29
role: engineer
checklist_item_ref: "SP-UI-7 — IN PROGRESS badge persistence + ungated header Finish button"
tags: [engineer, sp-ui, finish-flow, status, badge, vitest, pm2]
commit: 55ceb02
---

# SP-UI-7 — Finish Flow Correctness

## Explore

Researcher pass 011 (`docs/2026-04-29/011_in_progress_badge_research.md`, commit `bbcec03`)
established the root cause. Key facts carried in:

- `Round.status String @default("InProgress")` — sole field, sole DB writer is
  `PATCH /api/rounds/[id]`
- **Fix A root cause:** `handleSaveNext` (bottom button) navigates to `/results` on
  `isLastHole` without calling PATCH. DB retains `InProgress` for all bottom-button
  finishes. DB confirmed: rounds 12, 13, 14 all `InProgress`.
- **Fix B root cause:** Header Finish button rendered unconditionally — no `isLastHole`
  gate. Triggers `confirmFinish` which calls PATCH correctly, but visible on holes 1–17.
- `confirmFinish` contained correct PATCH logic (204/409 handling) suitable for extraction.

## Plan

1. Extract `patchRoundComplete(roundId: number): Promise<{ ok: boolean }>` to
   `src/lib/roundApi.ts`. Returns `ok:true` on 204/409; `ok:false` on any other status
   or network failure. Silent catch — does not throw.
2. `src/lib/roundApi.test.ts` — 4 cases: 204, 409, 500, network throw.
3. `src/app/scorecard/[roundId]/page.tsx` — three edits:
   - Add import
   - `handleSaveNext`: `if (roundId) await patchRoundComplete(roundId)` before
     `router.push` on `isLastHole`
   - `confirmFinish`: replace inline fetch + status variable with `const { ok } =
     await patchRoundComplete(roundId)`
   - Header Finish button: wrap in `{isLastHole && ( ... )}`

No other files touched. No API changes. No schema changes.

## Develop

### New file: `src/lib/roundApi.ts`

```ts
export async function patchRoundComplete(roundId: number): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`/golf/api/rounds/${roundId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Complete' }),
    })
    return { ok: res.status === 204 || res.status === 409 }
  } catch {
    return { ok: false }
  }
}
```

### New file: `src/lib/roundApi.test.ts`

4 cases via `vi.stubGlobal('fetch', ...)` + `afterEach(vi.unstubAllGlobals)`:
- `204` → `{ ok: true }`, fetch called with correct URL and body
- `409` → `{ ok: true }` (already-Complete idempotent)
- `500` → `{ ok: false }`
- network throw → `{ ok: false }`

### `src/app/scorecard/[roundId]/page.tsx` changes

**Import added (line 15):**
```ts
import { patchRoundComplete } from '@/lib/roundApi'
```

**`handleSaveNext` — `isLastHole` branch (line 147–149):**
```ts
if (isLastHole) {
  if (roundId) await patchRoundComplete(roundId)   // ← Fix A
  router.push(`/results/${roundId}`)
}
```

`patchRoundComplete` is silent on success or failure — the round is scored and settlement
is correct regardless; only the badge consequence differs. No modal, no error display.
The user explicitly tapped "Finish Round →" on hole 18.

**`confirmFinish` refactored (lines 160–174):**
```ts
const confirmFinish = async () => {
  setShowFinishConfirm(false)
  setFinishError(null)
  if (roundId) {
    const { ok } = await patchRoundComplete(roundId)
    if (ok) {
      router.push(`/results/${roundId}`)
    } else {
      setShowFinishConfirm(true)
      setFinishError('Failed to finish round. Try again.')
    }
    return
  }
  router.push(`/results/${roundId}`)
}
```

Same behavior as before; inline fetch + status variable replaced with helper call.
Error-display path preserved.

**Header Finish button gated (lines 208–217):**
```jsx
{isLastHole && (
  <button type="button" onClick={handleFinish} ...>
    Finish
  </button>
)}
```

Button invisible on holes 1–17. Visible only on the last hole (same condition as the
bottom button's "Finish Round →" label). `handleFinish` and `confirmFinish` logic
unchanged.

**Test results:** 358/358 passed (14 test files). +4 new cases in `roundApi.test.ts`.

**Build:** TypeScript clean; all 12 routes compiled; 0 errors.

**PM2:** `pm2 stop golf && npm run build && pm2 start golf`
→ PID 1507066, status online, HTTP 200 at `localhost:3000/golf`.

**Commit:** `55ceb02`

## AC verification guide for Cowork

1. **Bottom button path** — Start a new round, play through hole 18, tap "Finish Round →".
   After landing on `/results/{N}`:
   - Run `SELECT id, status FROM "Round" WHERE id = N` — must be `Complete`.
   - Return to home (`/golf/`). The round must appear without the IN PROGRESS badge and
     link must route to `/results/{N}`, not `/scorecard/{N}`.

2. **Header button gating** — On any hole 1–17, the header must show only the "Bets"
   button. The "Finish" button must be absent.

3. **Header button on hole 18** — Navigate to hole 18. The header must show both "Bets"
   and "Finish". Tapping "Finish" → confirmation modal → "Finish" → navigates to
   `/results/{N}`; same DB and badge verification as above.

4. **Historical stuck rounds** — Rounds 12, 13, 14 will still show IN PROGRESS until
   the separate ops cleanup runs (`UPDATE "Round" SET status = 'Complete' WHERE id IN
   (12, 13, 14)`). Do not block playthrough verification on this; the new fix applies
   to all rounds created after this deploy.

## State after this prompt

| Item | Status |
|---|---|
| SP-UI-7 | Closed — commit 55ceb02 |
| Active item | SP-4 §4 manual browser playthrough (unchanged) |
| Test count | 358/358 (was 354) |
| Production server | PID 1507066, current bundle, HTTP 200 |
| CLAUDE.md test count | Updated to 358 |
| Stuck DB rows 12/13/14 | Still `InProgress` — ops step pending GM sequencing |

## Decisions / questions for GM

None. Fix is fence-compliant (single file, Stroke Play scorecard only, no engine/API
changes). No deferred items created.

## What Cowork should verify

Per AC guide above. Key check: on a fresh round, the bottom "Finish Round →" on hole 18
must leave no IN PROGRESS badge on the home page. Hard-refresh after finishing to ensure
the home page fetches the updated status from the DB.

---
prompt_id: 011
date: 2026-04-29
role: researcher
checklist_item_ref: "IN PROGRESS badge persistence + SP-UI-6 root cause investigation"
tags: [researcher, read-only, bug, status, scorecard, home-page, sp-ui-6]
---

# IN PROGRESS Badge Persistence — Researcher Pass

Read-only. No code edits. No commits. No checklist items filed (GM to sequence).

---

## 1. Schema — "finished" state representation

**File:** `prisma/schema.prisma:42`

```prisma
model Round {
  ...
  status  String  @default("InProgress")
  ...
}
```

`Round.status` is a plain `String` with default `"InProgress"`. No Prisma enum; the valid
values are `"InProgress"` and `"Complete"`, enforced only at the API layer
(`api/rounds/[id]/route.ts:124`: `if (newStatus !== 'Complete')`). No `finishedAt` timestamp.
No derived field. The badge and routing are determined entirely by this one column.

---

## 2. Write paths — every path that updates Round.status

### 2a. PATCH handler — the only DB write

**File:** `src/app/api/rounds/[id]/route.ts:105–151`

```
PATCH /api/rounds/[id]   body: { status: "Complete" }
→ prisma.round.update({ where: { id }, data: { status: 'Complete' } })
→ returns 204 No Content
```

Guards: forward-only lifecycle (409 if already Complete). This is the **only** code path
that ever writes `"Complete"` to the DB. No other DB write sets `status`.

### 2b. Header "Finish" button → ✅ calls PATCH

**File:** `src/app/scorecard/[roundId]/page.tsx`

```
Header rightAction (line 219–228)
  → onClick: handleFinish (line 154–156)
       → setShowFinishConfirm(true)
  → Modal "Finish" button (line 288–295)
       → onClick: confirmFinish (line 158–185)
            → PATCH /api/rounds/${roundId} { status: 'Complete' }
            → on 204 or 409: router.push(`/results/${roundId}`)
            → on any other status: show finishError, stay on scorecard
```

`confirmFinish` correctly calls PATCH. The header Finish button **does write Complete** to
the DB when used.

### 2c. Bottom "Finish Round →" button → ❌ PATCH MISSING

**File:** `src/app/scorecard/[roundId]/page.tsx:263`

```jsx
<BottomCta
  label={isLastHole ? 'Finish Round →' : 'Save & Next Hole →'}
  onClick={handleSaveNext}
  disabled={!allScored}
/>
```

`handleSaveNext` (line 105–152):

```
handleSaveNext()
  1. Saves hole scores via PUT /api/rounds/${roundId}/scores/hole/${currentHole}
  2. Checks for greenie/BBB resolution → push to /resolve/[hole] if needed
  3. if (isLastHole):
       router.push(`/results/${roundId}`)   ← NAVIGATES WITHOUT PATCH
     else:
       setCurrentHole(next hole)
```

**There is no PATCH call in `handleSaveNext` — not on the last hole, not anywhere.**
When a user completes hole 18 and taps "Finish Round →":
- Scores for hole 18 are saved ✓
- User lands on `/results/${roundId}` and sees correct settlement ✓
- `Round.status` in the DB remains `"InProgress"` ✗

This is the root cause of the IN PROGRESS badge.

### 2d. Other write paths

None. No other route, action, or API endpoint writes to `Round.status`.

---

## 3. Read path — how Recent Rounds shows the badge

**File:** `src/app/page.tsx`

```
useEffect → fetch('/golf/api/rounds')
         → GET /api/rounds (rounds/route.ts:82–97)
                → prisma.round.findMany({ include: { course, players }, orderBy: playedAt desc, take: 20 })
                → returns rounds[] with .status field directly from DB
```

JSX badge condition (page.tsx:82–86):
```jsx
{r.status === 'InProgress' && (
  <span ...>In Progress</span>
)}
```

Routing (page.tsx:69):
```js
const href = r.status === 'InProgress' ? `/scorecard/${r.id}` : `/results/${r.id}`
```

The read path is correct and complete. It reads the live DB `status` column every time the
home page loads. There is no caching layer, no Zustand involvement, no stale state. The badge
shows exactly what the DB contains.

**Conclusion:** the read path cannot be the bug. The bug is entirely on the write side.

---

## 4. Ground truth — round 14

```sql
SELECT id, status, "playedAt", "holesCount"
FROM "Round" WHERE id >= 12 ORDER BY id;
```

```
 id |   status   |      playedAt       | holesCount
----+------------+---------------------+------------
 12 | InProgress | 2026-04-28 00:00:00 |         18
 13 | InProgress | 2026-04-29 00:00:00 |         18
 14 | InProgress | 2026-04-29 00:00:00 |         18
```

Round 14 was finished via the bottom button at ~22:38Z and shows settlement correctly on
`/results/14`. Its DB `status` is `"InProgress"`. This confirms the root cause — the bottom
button never called PATCH.

**Rounds 12 and 13 are also stuck in `InProgress`** — every round finished via the bottom
button is affected. The bug is systematic: every round completed through the normal "Save &
Next Hole → Finish Round →" flow ends up in this state. Only rounds finished with the header
"Finish" button (which routes through `confirmFinish`) would have status `"Complete"`.

---

## 5. SP-UI-6 — ungated header Finish button

**File:** `src/app/scorecard/[roundId]/page.tsx:219–228`

```jsx
<button
  type="button"
  onClick={handleFinish}
  ...
>
  Finish
</button>
```

This button is rendered unconditionally — no `isLastHole`, no hole-number gate, no score
completeness check. It appears on every hole from 1 to 18 (and on any intermediate hole if
the user navigated back). Tapping it on hole 3 would:

1. Show the confirmation modal ("End round after hole 3?")
2. On confirm: PATCH round to Complete, navigate to results

This is a premature-finish surface: the user can end the round early at any hole, and the
modal text "End round after hole {currentHole}" is the only friction.

**Does SP-UI-6 share a root cause with the IN PROGRESS bug?**

No. They are **related but distinct**, touching the same scorecard page's Finish flow with
different defects:

| Issue | Root cause | Effect |
|---|---|---|
| IN PROGRESS badge | `handleSaveNext` omits PATCH on `isLastHole` | Round never marked Complete in DB → badge stuck, href routes to scorecard instead of results |
| SP-UI-6 | Header Finish button has no `isLastHole` gate | Early termination possible from any hole; Cowork can accidentally finish on hole 3 |

An interesting asymmetry: the **bottom button** has the correct gate (`isLastHole`) but
missing PATCH; the **header button** has the correct PATCH but missing gate. They are
complementary defects in the same feature.

---

## 6. Proposed fix shapes

### Fix A — IN PROGRESS bug (blocking the SP-4 §4 playthrough gate)

In `handleSaveNext` at `src/app/scorecard/[roundId]/page.tsx:146–151`, before
`router.push('/results/...')` on the last-hole branch, add the PATCH call that
`confirmFinish` already makes:

```js
if (isLastHole) {
  // Mark round Complete (same logic as confirmFinish; no modal needed — user already
  // tapped "Finish Round →" explicitly on the last hole)
  if (roundId) {
    try {
      await fetch(`/golf/api/rounds/${roundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Complete' }),
      })
    } catch { /* silent — round still navigates to results */ }
  }
  router.push(`/results/${roundId}`)
}
```

The 409 case (already Complete) is safe to ignore silently — it means the user somehow
double-tapped. The 204 case is success. Any other failure is non-fatal: the round is scored
and settlement is correct; the only consequence of a failed PATCH is the badge staying
InProgress, which is the current behavior anyway.

**Optionally:** extract the PATCH logic into a shared `patchRoundComplete(roundId)` helper
called from both `handleSaveNext` (no modal) and `confirmFinish` (after modal confirm).

### Fix B — SP-UI-6 (header button ungated)

Gate the header "Finish" button behind `isLastHole`:

```jsx
{isLastHole && (
  <button type="button" onClick={handleFinish} ...>Finish</button>
)}
```

Or, per the SP-4 §4 intent, consider removing the header button entirely for the
Stroke-Play-only phase: the bottom "Finish Round →" label on hole 18 is sufficient, and
early termination is not a tested/intended flow. If it stays, `isLastHole` gate is the
minimal fix.

**Existing rounds 12 and 13** in the DB are stranded at `InProgress`. A one-time data fix
(direct `UPDATE "Round" SET status = 'Complete' WHERE id IN (12, 13, 14)`) would correct
the badge for those rounds. This is a separate ops step, not part of the code fix.

---

## 7. One ticket or two?

Recommend **one ticket** that covers both Fix A and Fix B. Rationale:

- Both are in the same file (`src/app/scorecard/[roundId]/page.tsx`) within the same
  feature area (Finish flow)
- The SP-4 §4 manual playthrough verifies both: Cowork needs to see no IN PROGRESS badge
  after finishing, and should not see the header Finish button on intermediate holes
- Splitting the ticket risks one landing without the other, producing a confusing half-state
  (e.g., PATCH lands but header button still visible on hole 3)

The ticket description should note the three stuck DB rows (12, 13, 14) and include the
ops one-liner as part of AC verification.

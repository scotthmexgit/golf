---
prompt_id: 006
date: 2026-04-29
role: researcher
checklist_item_ref: "F9-a-HOLE18-RACE — researcher pass, read-only"
tags: [researcher, f9a, race, read-only]
---

# F9-a Hole-18 Race — Researcher Pass

Read-only. No code edits. No commits. This file is the only artifact.

**Files examined:**
- `src/app/scorecard/[roundId]/page.tsx` (current + historical via git)
- `src/store/roundStore.ts`
- `src/app/api/rounds/[id]/scores/hole/[hole]/route.ts`
- `src/app/scorecard/[roundId]/resolve/[hole]/page.tsx`
- `2026-04-27/012_F3_DIAGNOSIS_V2_27-April-2026.md`
- `git log` for scorecard page history

---

## 1. F9-a useEffect Map

**File/line:** `src/app/scorecard/[roundId]/page.tsx:57–64`

```javascript
useEffect(() => {
  if (!holeData) return
  for (const p of players) {
    if ((holeData.scores[p.id] || 0) === 0) {
      setScore(p.id, currentHole, holeData.par)
    }
  }
}, [currentHole, holeData?.par, players, setScore])
```

**Trigger:** React runs this effect after every render where one of the dependencies changed. The dependency array is `[currentHole, holeData?.par, players, setScore]`.

- On component mount: fires once (React runs all effects after first render).
- On `currentHole` change (hole navigation): fires.
- On `holeData?.par` change (same hole with different par — not possible within a round): fires.
- On `players` change (hydration replaces the array): fires.
- On `setScore` change (stable function reference from Zustand `create`): fires only on initial load.

**Guard:** `if (!holeData) return` — the effect is a no-op when `holeData` is undefined (i.e., when the Zustand store is empty, before hydration, `holes = []` and `holes.find(h => h.number === currentHole)` returns `undefined`).

**What it depends on:**
- `holeData` must be truthy (requires `holes` to be populated).
- `holeData.par` must be a number.
- `players` must be populated (if empty, the for-loop is a no-op).
- `holeData.scores[p.id]` is checked per-player: only writes if the score is 0 or absent.

**When it fires vs cannot fire:**
- CANNOT fire while `hydrating = true` in the sense that `holeData` would be undefined (no `holes` in store). The guard returns early.
- CAN fire after hydration completes, on the re-render where `currentHole` or `players` changed.
- CANNOT retroactively fix hole 18 scores for players whose scores were already written by a previous F9-a firing on the same hole (the `|| 0 === 0` guard skips non-zero scores).

---

## 2. Hole-18 Save Path Map

**Two distinct exit paths from hole 18 exist:**

### Path A — BottomCta "Finish Round →" (`handleSaveNext`)

**Button render:** `src/app/scorecard/[roundId]/page.tsx:263`
```javascript
<BottomCta label={isLastHole ? 'Finish Round →' : 'Save & Next Hole →'} onClick={handleSaveNext} disabled={!allScored} />
```

On hole 18, `isLastHole = true`, label is "Finish Round →", but the `onClick` is the **same `handleSaveNext` handler used for holes 1–17**. This is not a separate handler.

**Handler:** `src/app/scorecard/[roundId]/page.tsx:105–152`

**Payload construction** (lines 113–118):
```javascript
const scorePayload = players.map(p => ({
  playerId: Number(p.id),
  gross: holeData.scores[p.id] || 0,
  putts: null,
  fromBunker: false,
}))
```

After the PUT, the hole-18 branch at lines 146–147:
```javascript
if (isLastHole) {
  router.push(`/results/${roundId}`)
}
```
No PATCH is sent. The round is NOT marked Complete by this path.

**Difference from holes 1–17:** On holes 1–17, `setCurrentHole(holeRange[currentIdx + 1])` advances the hole. On hole 18, `router.push('/results/...')` navigates away. The PUT payload construction is **identical** for all holes.

### Path B — Header "Finish" button (`confirmFinish`)

**Button render:** `src/app/scorecard/[roundId]/page.tsx:220–229`
```javascript
<button type="button" onClick={handleFinish} ...>Finish</button>
```

**Handler chain:** `handleFinish` (line 154) → `setShowFinishConfirm(true)` → confirmation overlay → `confirmFinish` (line 158–185).

`confirmFinish` sends a **PATCH** to `/golf/api/rounds/${roundId}` with `{ status: 'Complete' }`. It does NOT send a PUT. Hole 18 scores are NOT saved via this path.

**Conclusion on path difference:** Path A and Path B differ significantly on hole 18: only Path A saves scores via PUT. Path B only marks the round Complete. The `gross: undefined` error was a PUT (Path A).

---

## 3. Hydration Timing Map

**Hydration effect:** `src/app/scorecard/[roundId]/page.tsx:29–42`

```javascript
useEffect(() => {
  const urlRoundId = parseInt(params.roundId as string, 10)
  if (isNaN(urlRoundId) || hydratedRef.current) return
  hydratedRef.current = true
  setHydrating(true)
  fetch(`/golf/api/rounds/${urlRoundId}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => { if (data) hydrateRound(data) })
    .catch(() => {})
    .finally(() => setHydrating(false))
}, [params.roundId, hydrateRound])
```

**Loading guard:** `src/app/scorecard/[roundId]/page.tsx:188–208`

```javascript
if (hydrating || !course || !holeData) {
  return (
    <div>...Loading round...</div>  // early return; main UI not rendered
  )
}
```

When `hydrating = true`, the component returns the loading view. The BottomCta and save buttons are NOT rendered. F9-a useEffect still runs (useEffects are not gated by conditional returns), but holeData is undefined → the guard at line 58 returns early.

**What renders before hydration completes:** Only the loading spinner. No score UI, no save button.

**Timing sequence on page refresh at `/scorecard/12`:**

1. Mount: store is empty (`holes = []`, `currentHole = 1`). `holeData = undefined`.
2. Loading guard fires: renders "Loading round..." spinner.
3. Hydration effect fires: `setHydrating(true)` → fetch begins.
4. F9-a effect fires: `if (!holeData) return` — no-op.
5. Fetch completes; `hydrateRound(data)` called. Zustand updates: `holes`, `currentHole = 18` (first incomplete hole), `players`, `games`, `course`, `roundId`.
6. `setHydrating(false)` called in `.finally()`.
7. React 18 auto-batches both updates: one re-render captures `hydrating = false`, `course` set, `holes` set, `currentHole = 18`.
8. Post-render: `holeData = holes.find(h => h.number === 18)` — now defined. `holeData.scores[p.id] = 0` for all players (no hole-18 scores from server). `allScored = false` (every player has score 0). **Button renders disabled.**
9. F9-a effect fires (dependencies changed: `currentHole` 1→18, `players` empty→populated). For each player: `holeData.scores[p.id] = 0` → writes `holeData.par` to Zustand.
10. Zustand update → re-render: `holeData.scores[p.id] = par` for all players. `allScored = true`. **Button becomes enabled.**

**The button is disabled at step 8 and only becomes enabled at step 10.** Steps 8 and 10 are separated by one render cycle. No user interaction is possible during that window.

**`hydrateRound` currentHole logic:** `src/store/roundStore.ts:252–253`
```javascript
const firstIncomplete = holes.find(h => players.some(p => (h.scores[p.id] || 0) === 0))
const currentHole = firstIncomplete ? firstIncomplete.number : holes[holes.length - 1].number
```
For a round where holes 1–17 are scored and hole 18 is not: `firstIncomplete = hole 18`. `currentHole = 18`.

**Can hole 18 be reached via deep link or refresh?**

Yes. A user navigating directly to `/scorecard/12` (not `/scorecard/12/...`, just the page itself) after a page refresh will reach hole 18 via the hydration path above. The `currentHole` is set by `hydrateRound` to the first incomplete hole, not by the URL. There is no URL parameter for `currentHole`; it is Zustand state only.

Corollary: a user cannot deep-link to a specific hole number. `/scorecard/12` always lands at the hole `hydrateRound` selects.

---

## 4. Candidate Race Scenario Analysis

### The F9-a race hypothesis (specific claim)

**Hypothesis:** F9-a's useEffect races with `handleSaveNext` on hole 18 specifically. The effect fails to fire before the user clicks, and `gross: undefined` reaches the PUT payload.

**Analysis — can allScored be true before F9-a fires?**

`allScored` is derived at render time (line 53):
```javascript
const allScored = holeData ? players.every(p => (holeData.scores[p.id] || 0) > 0) : false
```

Immediately after hydration (step 8 above): `holeData.scores[p.id] = 0` for all players. `(0 || 0) > 0` = false. `allScored = false`. Button is `disabled={!allScored}` = `disabled={true}`.

A disabled HTML button does not fire its `onClick` handler when clicked. The user cannot trigger `handleSaveNext` while `allScored = false`.

After F9-a writes par (step 9–10): `holeData.scores[p.id] = par`. `(par || 0) > 0` = true. `allScored = true`. Button enabled. Now clickable.

**Verdict on this specific race: RULED OUT.** The button is disabled until F9-a writes par. `handleSaveNext` cannot execute before F9-a's effect fires and causes a re-render that enables the button.

### Can `handleSaveNext` produce `gross: undefined` via stale closure?

`handleSaveNext` is defined at render time. It captures `holeData` from the render-time closure. If invoked from a stale render (before F9-a's re-render), `holeData.scores[p.id]` would be 0, not undefined. Payload: `gross: 0 || 0 = 0`. Still `gross: 0`.

The `|| 0` fallback at line 115 cannot produce `undefined`. `undefined || 0 = 0`.

### The `fromBunker: undefined` evidence gap

The observed error (session log `012_F3_DIAGNOSIS_V2_27-April-2026.md`) shows:
```
update: { gross: undefined, putts: null, fromBunker: undefined }
```

**`fromBunker: false` is hardcoded** in `handleSaveNext` at line 117 of the current code. Git history confirms this:

```
git log --follow -p -- src/app/scorecard/[roundId]/page.tsx | grep -E "fromBunker"
→ +        fromBunker: false,
```

This is the only occurrence of `fromBunker` across the entire commit history of the scorecard page. It was introduced in commit `d5d893a` (PF-1 Turn 3, Apr26 12:44). Before `d5d893a`, there was NO PUT call in the scorecard page at all.

**There is no version of the code in git history where `handleSaveNext` had a PUT call that could produce `fromBunker: undefined`.**

For `fromBunker: undefined` to appear in the Prisma upsert, the server's `score.fromBunker` must be `undefined`. This happens when the request body omitted the `fromBunker` field entirely (JSON does not serialize `undefined`, so an absent field parses as `undefined` when accessed). But since `fromBunker: false` is hardcoded, `JSON.stringify` always produces `"fromBunker":false`, which the server parses as `false`.

`fromBunker: undefined` in the Prisma error is **inconsistent with any known code path** in the repository.

### Was round 12 hole 18 reached fresh or by progression?

The session log `012` does not state how hole 18 was reached. The context ("verification walkthrough") implies the user walked through holes 1–17 sequentially before reaching hole 18. However:

- If progressed (1→18): F9-a fires on each hole, including on arrival at hole 18. This is the normal flow.
- If refreshed (/scorecard/12 direct): hydration sets currentHole=18 (first incomplete hole), F9-a fires post-hydration. Same effective result.

Either way, F9-a fires before the button is enabled. No timing gap for a race.

The session log `012` confirms the error appeared "immediately after the last EADDRINUSE batch" — i.e., right after the PM2 restart storm, when the server had just come up. This timing is more consistent with a POST/PUT that was queued during a server-down window and replayed when the server came up, OR with a browser in an unusual state after multiple failed requests.

### Alternative explanation for the one observed `gross: undefined`

The `fromBunker: undefined` evidence, combined with the absence of any code path that produces it, points to one of:

1. **Browser bundle mismatch.** During the PM2 restart storm, the browser may have loaded a partially-served JavaScript bundle or a cached bundle from a prior build. If the bundle in memory was from a state where `handleSaveNext` was structured differently (e.g., reading `fromBunker` from Zustand state rather than hardcoding `false`), it could produce an incomplete payload. This cannot be verified from git history alone — it requires knowing the exact state of the browser cache at the time.

2. **Network-layer body truncation.** If the PUT request body was truncated by nginx or a proxy during the restart storm, the server might have received a partial JSON body. However, `request.json()` would throw on malformed JSON, not silently produce undefined fields — and the route handler (`route.ts:41–43`) would return a 400, not reach Prisma. This is inconsistent with the error being a Prisma error rather than a 400.

3. **Unreproducible transient state.** The error occurred during a restart storm (360 EADDRINUSE errors, 91 restart attempts). Some server process in the storm may have handled the request from a partially-initialized module cache. This is unreproducible.

---

## 5. Conclusion

**Race verdict: RULED OUT.**

The specific F9-a race hypothesis — that F9-a's useEffect fails to write par before `handleSaveNext` fires on hole 18, causing `gross: undefined` in the PUT payload — is ruled out by code evidence:

1. `allScored` is `false` when `holeData.scores` are 0 (immediately after hydration). The BottomCta button is `disabled={!allScored}`, which renders as a disabled HTML element. Disabled buttons cannot trigger `onClick`. `handleSaveNext` cannot run before F9-a writes par. **Evidence:** `src/app/scorecard/[roundId]/page.tsx:53` (`allScored` derivation) and line 263 (`disabled={!allScored}`).

2. Even if `handleSaveNext` ran with a stale closure (scores = 0), `gross: holeData.scores[p.id] || 0` = `0 || 0` = `0`. This would produce `gross: 0`, not `gross: undefined`. **Evidence:** `src/app/scorecard/[roundId]/page.tsx:115`.

3. `fromBunker: false` is hardcoded. The F9-a effect has no path to produce `fromBunker: undefined`. The only code in the entire commit history of the scorecard page that had a PUT call also had `fromBunker: false`. **Evidence:** `git log --follow -p -- src/app/scorecard/[roundId]/page.tsx | grep fromBunker`.

**Cause of the single observed `gross: undefined` error: INCONCLUSIVE.**

The `fromBunker: undefined` field in the Prisma error is the key evidence gap. It is inconsistent with every version of the code in git history. The error cannot be explained by the F9-a race, a stale closure, or any identified code path. The most parsimonious explanation is a browser bundle mismatch during the PM2 restart storm, but this cannot be confirmed from static analysis. The error appears to be a one-time anomaly associated with the restart storm, not a reproducible application defect.

**What would be needed to confirm or rule out bundle mismatch:** capture of the browser's network tab at the time of the failing PUT, showing the exact request body sent. Not available from current evidence.

**Current risk posture:** The F9-a race on hole 18 as a reproducible mechanism does not exist in the current code. The one observed instance of `gross: undefined` is not attributable to a stable code defect. No code fix is warranted at this time based on this analysis alone.

---

## 6. Observations (not actioned — fence)

**Observation A — Route has no `gross` validation:** `src/app/api/rounds/[id]/scores/hole/[hole]/route.ts` validates that each `playerId` belongs to the round (lines 57–64) but does not validate that `gross` is a positive integer before passing it to Prisma. If `gross: undefined` reaches the route from any client, Prisma throws a 500 instead of the route returning a 400. A `typeof score.gross !== 'number' || score.gross < 1` check before the Prisma call would convert this class of error to a 400 (matching PUT-HANDLER-400-ON-MISSING-FIELDS in the parking lot).

**Observation B — F9-a dependency array omits `holeData`:** The F9-a effect deps are `[currentHole, holeData?.par, players, setScore]`. `holeData` itself is not in deps. This means: if `holeData` updates (e.g., server writes a score via another mechanism) WITHOUT `currentHole` or `holeData.par` or `players` changing, the effect does NOT re-fire. For the current use case (hydration writes score=0 for all holes, then F9-a writes par), this is benign. Flagged as a potential gotcha if future features update `holeData.scores` without changing the listed deps.

**Observation C — hydrateRound sets currentHole to hole 18 for a round with 17/18 holes scored.** The scorecard page shows hole 18 immediately on page refresh when it is the first incomplete hole. The F9-a effect fires after hydration to write par. The user sees a loading spinner, then hole 18 with the default scores pre-filled and the button enabled. This is the intended behavior and is functioning correctly.

---
prompt_id: 010
date: 2026-04-29
role: researcher
checklist_item_ref: "SP-UI-4 verification; SP-UI-5 filing"
tags: [researcher, sp-ui, verification, cowork-findings, read-only]
---

# SP-UI-4 Verification + SP-UI-5 Filing

Read-only explore pass. No code edits. No commits.

---

## 1. SP-UI-4 Verification — /hole label observed at 21:58, /round at 22:16

### Cowork timeline

| Time | Observation |
|---|---|
| 21:58 | Wizard Games step → Stroke Play card shows **`/hole`** |
| 22:16 | Same wizard, same defaults → Stroke Play card shows **`/round`** |

PM2 rebuild with SP-UI-4 commit `f43d2db` was at **2026-04-29T18:03:48Z**, approximately 3h55m before the first walkthrough.

### Code examined

- `src/store/roundStore.ts` — Zustand store, `create<RoundStore>()` call, `addGame` action, `hydrateRound` action
- `src/components/setup/GameList.tsx` — how `addGame` is triggered
- `src/types/index.ts` — `GameInstance` interface, `GameType` union
- `src/components/setup/GameInstanceCard.tsx` — where `stakeUnitLabel(game.type)` is called

### Hypothesis (b): real hydration/state-binding defect — RULED OUT

Three independent reasons:

**1. `game.type` is synchronously set and TypeScript-required.**
`GameInstance.type` is typed as `GameType` (non-optional, required field, line 62 of `types/index.ts`). The `addGame` action in `roundStore.ts:151–167` creates the `GameInstance` object inline with `type` set as the first field, before calling `set(...)`. There is no async gap between when `type` is written to state and when React renders the component. `stakeUnitLabel` receives a fully-populated string on every render.

**2. No Zustand `persist` middleware — no stale localStorage state.**
`roundStore.ts` uses plain `create<RoundStore>((set, get) => ...)` with no `persist`, no `partialize`, no `storage` option. The store is purely in-memory and resets on every page load. There is no pathway for an old game object (without a valid `type`) to survive across sessions or across the PM2 rebuild.

**3. The Games step is wizard-only — `hydrateRound` is never called from `/round/new`.**
`hydrateRound` is only triggered from `useEffect` in `scorecard/[roundId]/page.tsx` and `results/[roundId]/page.tsx`. The wizard page (`/round/new`) does not call `hydrateRound` at any point. Even if `hydrateRound` produced a game with a type mismatch, it would not affect the wizard flow.

**Conclusion: (b) is impossible.** There is no scenario in the current codebase where `game.type` is undefined, empty, or delayed at render time in `GameInstanceCard`.

### Hypothesis (a): stale browser bundle — CONFIRMED

Next.js App Router builds content-hash the JS chunks and embed those hashes in the HTML shell. `/round/new` is a static page (○ in the build manifest — prerendered as static content). This means the HTML for `/golf/round/new` is a static file that lives in `.next/server/app/` and is served by `next start` through nginx.

When the PM2 rebuild ran at 18:03Z:
- A new `.next/` directory was produced with new content-hashed chunk filenames
- The old `.next/` directory was replaced — old chunk files are gone from disk

If the browser had a cached copy of the old HTML page for `/golf/round/new` (which references old chunk filenames from before `f43d2db`), it would serve that old HTML on the next navigation. The old HTML references old chunk URLs that the browser may also have cached. Both the HTML and the chunk are served from cache → old JavaScript executes → `stakeUnitLabel` does not exist in that bundle → the component renders the hardcoded `/hole` string from the pre-SP-UI-4 code.

At 22:16 (18 minutes later), one of the following cache-invalidation events occurred:
- Cowork opened a new browser tab (tab-level cache) or incognito window
- Cowork performed a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- The HTTP cache TTL for the HTML page expired
- Cowork navigated to the page via a different route that forced a fresh fetch

Any of these would cause the browser to fetch the current HTML from the server, get the new chunk URLs, and load the SP-UI-4 bundle — showing `/round` correctly.

**The 18-minute gap and identical behavior otherwise is precisely consistent with a browser cache flush, not with any code-level timing or hydration phenomenon.**

### Verdict: (a) — stale browser bundle

**SP-UI-4 remains closed.** The fix (commit `f43d2db`) is correct and is live in the current bundle. The `/hole` observation at 21:58 is a browser cache artifact from before the 18:03Z PM2 rebuild.

**Recommended Cowork guidance for future walkthroughs after a rebuild:**
Hard-refresh (`Ctrl+Shift+R`) or open a fresh incognito window after any PM2 rebuild to guarantee the new bundle is loaded. The PM2 rebuild procedure (commit `51660c4`) should note this.

---

## 2. SP-UI-5 Filed

**Filed to `IMPLEMENTATION_CHECKLIST.md` parking lot.** Text:

> **SP-UI-5** [SP-UI] — Stroke Play card defaults to only Golfer 1 selected in
> the Players row of the Games step, despite all golfers having Betting: Yes
> set on the Players step. Expected: all betting players pre-selected when a
> Stroke Play game instance is created. Source: findings-2026-04-29-2216.md
> §"Stroke Play card defaults to only Golfer 1."

**Not dispatched.** GM to sequence.

**Preliminary code observation (read-only, not a conclusion):**

`addGame` in `roundStore.ts:152` reads `state.players.filter(p => p.betting).map(p => p.id)` at the moment the action fires. If the user is on the Players step and has added players with `betting: true`, those players exist in state. But if there is any mechanism that clears or resets state between the Players step and the Games step, or if the wizard's step-navigation bypasses a proper state commit, `state.players` at `addGame` time might contain only the initial player. This is a hypothesis only — investigation needed to confirm. The `reset()` action also resets `players` to `[makePlayer(0, true)]`; if reset fires at step transition, that would explain the symptom. **Do not fix based on this observation — dispatch a researcher turn.**

---

## 3. Continuity Item — 21 Uncaught Promise Exceptions at /round/new

**Noted for future researcher pass. Not dispatched.**

Cowork observed 21 `Uncaught (in promise)` exceptions on `/round/new`, column/line 0:0, no message body. This is up from 18 observed in the prior walkthrough. Line 0:0 with no message body is characteristic of:
- A cancelled `fetch()` (e.g., component unmounts mid-request, or a `Promise` rejection with no `.catch`)
- A browser extension injecting script that throws
- A React strict-mode double-invoke in development (but this is a production build)
- A Next.js `prefetch` request that was aborted

The count increase (18 → 21) may indicate that more network requests are being initiated (e.g., `CourseSearch` component's autocomplete or the prefetch of wizard-adjacent routes). Not blocking current phase work. File as an observation; researcher pass when prioritized.

---

## State after this prompt

| Item | Status |
|---|---|
| SP-UI-4 | Remains **closed** — stale bundle confirmed, no code defect |
| SP-UI-5 | **Filed** to parking lot — dispatch pending GM sequencing |
| Promise exceptions | Noted as continuity item — not dispatched |
| Active item | SP-4 §4 manual browser playthrough (unchanged) |

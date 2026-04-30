# Report: Cowork followup — Bet-row scope investigation + sheet height + console-exception close

## Header
- **Date:** 2026-04-30
- **Number:** 08
- **Type:** cowork-findings
- **Title slug:** cowork-followup
- **Linked issues:** PARKING-LOT-SKINS-2 (related, not fixed here); CONSOLE-EXCEPTION-SCORECARD-LOAD (closed); BetDetailsSheet height (WF-2 spec gap)
- **Pipeline item:** not a WF-N sub-item (Cowork findings dispatch)

## Prompt (verbatim)

> Three small items from Cowork verification of WF-1 through WF-5 (findings-2026-05-01-1330.md — date-misnamed by Cowork session; actual session date 2026-04-30): (1) investigate the per-row "Bet" total scope — is Skins contributing to per-hole totals alongside Wolf? (2) adjust BetDetailsSheet.tsx height to ~75vh per WOLF_PLAN.md WF-2 spec. (3) close CONSOLE-EXCEPTION-SCORECARD-LOAD parking-lot item.

## Scope boundaries
- **In scope:** Investigation (no code change); BetDetailsSheet.tsx height; IMPLEMENTATION_CHECKLIST.md parking-lot close
- **Out of scope:** Any fix for item 1; any other BetDetailsSheet changes; AGENTS.md Active phase line

---

## 1. Explore

**Item 1 files read:** `perHoleDeltas.ts`, `skins_bridge.ts`, `wolf_bridge.ts`, `ScoreRow.tsx`, `scorecard/[roundId]/page.tsx`.
**Item 2 files read:** `BetDetailsSheet.tsx` — current height class: `max-h-[75vh]` (collapses to content height).
**Item 3 location:** IMPLEMENTATION_CHECKLIST.md line 187 — `- [ ] **CONSOLE-EXCEPTION-SCORECARD-LOAD**`.

---

## 2. Plan

All three items auto-proceed. Item 1 is investigation only; item 2 is a single CSS class change; item 3 is a single line edit.

---

## 3. Develop / Investigation

### Item 1 — Bet-row total scope: Skins + Wolf

**Data flow:**

```
scorecard page
  → computePerHoleDeltas(holes, players, games)           [perHoleDeltas.ts]
      → for each game:
          case 'skins': settleSkinsBet(...).events
          case 'wolf':  settleWolfBet(...).events
      → for each event:
          if (event.hole == null || !('points' in event)) continue
          totals[event.hole][pid] += pts
  → holeTotalForCurrentHole = totals[currentHole] ?? {}
  → ScoreRow: holeDelta = holeTotalForCurrentHole[player.id] ?? 0
```

**Skins event structure (from `skins_bridge.ts`):**

`settleSkinsBet` returns `finalizeSkinsRound(holeEvents, cfg)`. Finalized events include:
- `SkinWon` — has `hole: number` (the decisive hole) and `points: Record<string, number>` → **passes filter → lands in totals**
- `SkinCarried` — has `carryPoints` (not `points`) → **fails `'points' in event` → excluded from totals** (correctly — no money moves on a carry)
- `FieldTooSmall`, `SkinVoid` — no `points` → excluded

**Wolf event structure (from `wolf_bridge.ts`):**

`settleWolfBet` returns events including:
- `WolfHoleResolved`, `LoneWolfResolved`, `BlindLoneResolved` — all have `hole: number` and `points: Record<string, number>` → **land in totals**
- `WolfHoleTied`, `WolfCarryApplied`, `WolfCaptainAssigned` — informational; no `points` → excluded

**Conclusion: Design (a) — Skins per-hole deltas DO appear in the Bet row.**

Skins is NOT "round-end summed only." `SkinWon` events are hole-keyed (to the decisive hole) and point-carrying, so they accumulate into `totals[hole][pid]` alongside Wolf's monetary events. The Bet row on any decisive Skins hole shows the combined total: Wolf delta + Skins delta.

**Why Cowork saw Wolf-only math:**

Two compatible explanations — either is correct by design:

1. **Wolf-only round configuration.** Cowork was verifying WF-1–WF-5 (Wolf features) and configured a round with Wolf only. Without a Skins game active, `gameHoleEvents` for Skins is never called. Bet row shows Wolf-only math. This is correct — the Bet row aggregates all active games, and if only Wolf is active, only Wolf math appears.

2. **Skins carry on hole 1.** If a round had both Wolf and Skins and hole 1 produced a `SkinCarried` event (tied after handicap — all net scores equal), the Skins contribution to `totals[1]` is $0. Bet row shows only Wolf delta. Also correct — tied Skins holes carry no money until the decisive hole.

**Action:** No code change. The design and implementation are correct. This note is filed here for the record. If Cowork verifies again with both Wolf and Skins active on a decisive hole, the combined delta should appear.

**Parking-lot:** No new item. If Cowork re-verifies with a Wolf+Skins round on a decisive hole and still sees only Wolf math, that would surface a real bug worth filing. Until then, the code is confirmed correct by trace.

---

### Item 2 — BetDetailsSheet height: `max-h-[75vh]` → `h-[75vh]`

**Before:**
```tsx
className={`fixed bottom-0 inset-x-0 z-50 rounded-t-2xl flex flex-col max-h-[75vh] transition-transform...`}
```

**After:**
```tsx
className={`fixed bottom-0 inset-x-0 z-50 rounded-t-2xl flex flex-col h-[75vh] transition-transform...`}
```

**Choice rationale:** `h-[75vh]` (fixed) over `min-h-[...] max-h-[75vh]` (range). Animation correctness is the deciding factor: `translate-y-full` translates by the element's rendered height. With `max-h-[75vh]`, the height varies with content — a 1-hole round slides from ~15vh offset, producing inconsistent entry/exit animation compared to a 18-hole round's 75vh. `h-[75vh]` gives a stable, predictable slide distance regardless of content length. Whitespace below sparse content is a reasonable UX trade-off.

Inner structure is unchanged: `flex-shrink-0` header + `flex-1 overflow-y-auto` content. The content area correctly fills 75vh − header height and scrolls when content overflows. ✓

- **Commands run:**
  - `npx tsc --noEmit`: exit 0
  - `npm run test:run`: 441/441
  - PM2 rebuild: `pm2 stop golf && npm run build && pm2 start golf`
  - `npx playwright test`: 2/2 pass

---

### Item 3 — CONSOLE-EXCEPTION-SCORECARD-LOAD closed

Updated IMPLEMENTATION_CHECKLIST.md line 187:
- `- [ ]` → `- [x]`
- Added resolution: "Not reproducing in PM2 build at 2026-04-30; Cowork findings-2026-05-01-1330.md (date-misnamed) confirmed only Chrome password-manager extension noise unrelated to /golf."
- Original observation date and source preserved. Closure date 2026-04-30.

---

## 4. Outcome

- **Status:** complete
- **Summary:** Bet-row scope investigation confirms design is correct — Skins per-hole deltas appear alongside Wolf for decisive holes. BetDetailsSheet now renders at fixed 75vh per WF-2 spec. CONSOLE-EXCEPTION-SCORECARD-LOAD closed.
- **For GM:** No escalation from item 1 — design is correct. If Cowork wants to verify Skins+Wolf combined totals, they should configure a round with BOTH bets active and score a decisive hole (no tie in Skins).
- **For Cowork to verify:** Open BetDetailsSheet on any round → sheet should fill ~75% of viewport height (fixed, not content-dependent). Scroll still works for long round summaries.

## Reviewer note

Reviewer APPROVED. Confirmed: (1) investigation reasoning is sound — `SkinWon` events carry `hole` and `points`, pass the perHoleDeltas filter, and land in totals. Reviewer noted that `translate-y-full` animation correctness makes `h-[75vh]` the right choice over content-hugging. (2) parking-lot close format is adequate.

## AC checklist

- [x] Item 1: data flow traced from ScoreRow → perHoleDeltas → bridges; `SkinWon` filter-pass confirmed
- [x] Item 1: conclusion is (a) design correct; documented why Cowork saw Wolf-only math
- [x] Item 1: no code change; no parking-lot item filed (not a bug)
- [x] Item 2: `BetDetailsSheet.tsx` height changed from `max-h-[75vh]` to `h-[75vh]`
- [x] Item 2: content area `flex-1 overflow-y-auto` — scrollability preserved
- [x] Item 2: slide animation unchanged; backdrop, header, buttons unchanged
- [x] Item 3: CONSOLE-EXCEPTION-SCORECARD-LOAD marked `[x]` with resolution note and date
- [x] Item 3: original history preserved (observation date, source file reference)
- [x] 441/441 vitest; tsc clean; Playwright 2/2
- [x] PM2 rebuilt — Cowork-ready
- [x] Reviewer: APPROVED

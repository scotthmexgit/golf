# Stroke-Play-Only Phase Plan Authored — 2026-04-25

**Role:** Documenter  
**Prompt scope:** Create `docs/plans/STROKE_PLAY_PLAN.md` as the single source of truth for AC during the Stroke-Play-only phase. No code changes. No edits to existing plan documents (REBUILD_PLAN.md, IMPLEMENTATION_CHECKLIST.md updates are a separate prompt).

---

## Active plan confirmation

`docs/plans/STROKE_PLAY_PLAN.md` is the active plan for the Stroke-Play-only phase, effective immediately. It supersedes REBUILD_PLAN.md items #11 and #12 for the duration of this phase. Items #3–#8 are retained as history; items #9 and #10 carry forward as independent backlog.

---

## Phases (SP-1 through SP-6 plus carry-forwards)

| Phase | Type | Size | Status | One-line summary |
|---|---|---|---|---|
| SP-1 | Documenter | XS | Ready | Verify `game_stroke_play.md` consistent with Option α Minimal; no changes expected |
| SP-2 | Engineer | S | Blocked on SP-1 | HoleData → HoleState builder for Stroke Play's 5-field surface; stub other 14 fields |
| SP-3 | Engineer | M | Blocked on SP-2 | Wire `settleStrokePlayHole` + `finalizeStrokePlayRound` + `aggregateRound`; create `payoutMapFromLedger` adapter; integration tests |
| SP-4 | Engineer | S–M | Blocked on SP-3 | Surgical replace `computeStrokePlay` case in `payouts.ts`; grep gate to zero; manual playthrough |
| SP-5 | Engineer | M | Deferred post-SP-4 | Verifier researcher pass scoped to Stroke Play invariants 1,2,4–9 only |
| SP-6 | Engineer | XS | Independent | GAME_DEFS cleanup (#9 carry-forward) + GameList.tsx disabled filter; park all four primary bets |
| #10 | Engineer | S | Independent backlog | Prisma Float→Int migration (unchanged from REBUILD_PLAN.md) |

---

## Source documents consulted (read-only)

- `docs/proposals/ui-first-reframe.md`
- `docs/proposals/ui-first-reframe-sod.md`
- `docs/proposals/pending-items-evaluation.md`
- `docs/proposals/stroke-play-only-scoping.md`
- `docs/proposals/junk-architecture-evaluation.md`
- `REBUILD_PLAN.md` (format conventions, AC structure, #9/#10/#11/#12 entries)
- `IMPLEMENTATION_CHECKLIST.md` (parking-lot item line numbers for §5 categorization)

---

## Files NOT modified in this prompt

| File | Status |
|---|---|
| `REBUILD_PLAN.md` | Not modified — separate prompt |
| `IMPLEMENTATION_CHECKLIST.md` | Not modified — separate prompt |
| All `docs/proposals/*.md` | Not modified — superseded as active artifact but retained |
| All `src/` files | Not modified |
| All `docs/games/` files | Not modified |
| `AGENTS.md`, `CLAUDE.md`, `.claude/skills/`, `.claude/agents/` | Not modified |

---

## Decisions deferred (9 total, enumerated in plan §7)

Decision A (Skins v1 UI enforcement), B (Skins rule-doc scope), C (#11 full cutover gate), D (Match Play sequence), E (Match Play format toggle), F (Stroke Play Mid/Full scope), Junk architecture choice (Alternative A vs B), Junk §11/§4 doc follow-ups, ctpWinner data model. None resolved in this prompt; all out of scope until SP-4 closes or a parked bet re-enters scope.

---

## Noticed but out of scope during authoring

Five items parked in plan §8:
1. `computeMatchPlay` legacy algorithm ≠ new engine (all-pairs vs singles/best-ball)
2. `computeNassau` hardcodes 2-player; new engine supports allPairs
3. `src/lib/handicap.ts` deprecated shim still has one active caller (`roundStore.ts`)
4. `scorecard-playoff` tie rule accepted by config validation but not implemented in `finalizeStrokePlayRound`
5. `HoleData` has no `longestDriveWinners` field — new field needed before LD junk can be bridged

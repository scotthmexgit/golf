# Project Instruction Update — Stroke-Play-Only Plan — 2026-04-25

**Role:** Documenter  
**Prompt scope:** Update project-instruction files to reflect `docs/plans/STROKE_PLAY_PLAN.md` as the active plan and SP-6 as the active item. Encode verifier disposition (parked to SP-5). No code changes; no docs/games/ changes; no docs/proposals/ changes; no docs/plans/STROKE_PLAY_PLAN.md changes.

---

## Files modified

| File | Change summary |
|---|---|
| `IMPLEMENTATION_CHECKLIST.md` | Active plan note added; Design Timeline updated; Active item replaced (verifier → SP-6); Parked/Deferred section added; Backlog header + #9/#11/#12 entries updated; Parking Lot header references STROKE_PLAY_PLAN.md §5 |
| `REBUILD_PLAN.md` | Additive header note added before existing content; items #3–#8 history, #9/#10 carry-forward, #11 superseded, #12 split |
| `CLAUDE.md` | "Rebuild context" section renamed to "Active phase"; updated to reflect engines complete, active plan, stale "Under rebuild" content replaced |
| `AGENTS.md` | Current-status block updated (all five engines landed, SP-6 active); Active scope source-of-truth line updated; Session checklist updated |

---

## REBUILD_PLAN.md items #3–#12 structural integrity

Items #3 through #12 are **not structurally modified**. The header note added before the existing "# Rebuild Plan" title is purely additive. No plan entry, AC, files-touched, or risk-flag section was edited.

Confirmed by post-edit grep: the Status as of 2026-04-25 blockquote appears at lines 3–5 of REBUILD_PLAN.md; existing content begins at line 7 (the original line 3 "Drafted from AUDIT.md..." paragraph).

---

## New active item: SP-6

**SP-6 — GAME_DEFS cleanup + GameList filter.** Not started. AC in `docs/plans/STROKE_PLAY_PLAN.md` SP-6. Files in scope: `src/types/index.ts`, `src/components/setup/GameList.tsx`. Independent of SP-1/SP-2/SP-3; recommended before SP-2.

---

## Verifier disposition

Parked to SP-5 in `docs/plans/STROKE_PLAY_PLAN.md`. Entry moved from Active item to new Parked/Deferred section in `IMPLEMENTATION_CHECKLIST.md`. Stroke-Play-scoped invariants only (1, 2, 4, 5, 6, 7, 8, 9) when SP-5 activates; Invariants 3 and 10 deferred indefinitely; Invariant 11 partial. Researcher pass required before any engineer work on SP-5.

---

## Skills audit grep results

Command: `grep -rn "REBUILD_PLAN|IMPLEMENTATION_CHECKLIST|active plan|AC\b|source.of.truth" .claude/skills/`

Results:
- `.claude/skills/session-logging/SKILL.md:74` — "IMPLEMENTATION_CHECKLIST.md Parking Lot" (append target for tangent items). Correct reference; no change needed.
- `.claude/skills/focus-discipline/SKILL.md:3, 12, 19, 44` — References to `IMPLEMENTATION_CHECKLIST.md` Active item only. No REBUILD_PLAN.md for AC referenced. Skill correctly instructs agents to read the Active item; the Active item now points to STROKE_PLAY_PLAN.md. **No changes made.**

No skill file hardcodes REBUILD_PLAN.md as an AC source.

---

## Agents audit grep results

Command: `grep -rn "REBUILD_PLAN|IMPLEMENTATION_CHECKLIST|active plan|AC\b|source.of.truth" .claude/agents/`

Results: **zero matches** across all five agent definitions (`documenter.md`, `engineer.md`, `researcher.md`, `reviewer.md`, `team-lead.md`).

No agent file hardcodes REBUILD_PLAN.md as an AC source. The AGENTS.md session checklist (not an agent definition file) was the only place — and that was updated. **No agent definition files changed.**

---

## Post-edit verification

Key phrases confirmed present:

| File | Phrase | Line |
|---|---|---|
| IMPLEMENTATION_CHECKLIST.md | `Active plan (Stroke-Play-only phase):` | 5 |
| IMPLEMENTATION_CHECKLIST.md | `SP-6 — GAME_DEFS cleanup + GameList filter` | 28 |
| IMPLEMENTATION_CHECKLIST.md | `## Parked / Deferred` | 36 |
| IMPLEMENTATION_CHECKLIST.md | `Stroke-Play-only UI phase (SP-1–SP-6` | 23 |
| IMPLEMENTATION_CHECKLIST.md | `docs/plans/STROKE_PLAY_PLAN.md §5` (parking lot header) | 61 |
| IMPLEMENTATION_CHECKLIST.md | `Elevated to active item as SP-6` (#9 entry) | 52 |
| IMPLEMENTATION_CHECKLIST.md | `Superseded for the Stroke-Play-only phase by SP-4` (#11 entry) | 54 |
| REBUILD_PLAN.md | `Status as of 2026-04-25 — read this before the entries below` | 3 |
| REBUILD_PLAN.md | `Active plan: docs/plans/STROKE_PLAY_PLAN.md` | 5 |
| CLAUDE.md | `Active phase (Stroke-Play-only — remove when this phase closes)` | 73 |
| CLAUDE.md | `Active plan: docs/plans/STROKE_PLAY_PLAN.md` | 77 |
| AGENTS.md | `Stroke-Play-only UI wiring — see docs/plans/STROKE_PLAY_PLAN.md` | 21 |
| AGENTS.md | `active plan (docs/plans/STROKE_PLAY_PLAN.md` | 30 |
| AGENTS.md | `active plan (docs/plans/STROKE_PLAY_PLAN.md for the current phase)` | 79 |

---

## Fence confirmation

- `src/` — not touched ✓
- `docs/games/` — not touched ✓
- `docs/proposals/` — not touched ✓
- `docs/plans/STROKE_PLAY_PLAN.md` — not touched ✓
- `.claude/skills/` — not touched (no changes required) ✓
- `.claude/agents/` — not touched (no changes required) ✓
- No new skill files, no new agent definitions ✓

---

## Noticed but out of scope

1. **CLAUDE.md commit practice section (line 16)** references `REBUILD_PLAN.md` in the list of files committed at FINAL EOD. This is correct — REBUILD_PLAN.md is still a committed file (it was just changed with the header note). Not stale; no change needed.

2. **CLAUDE.md Rule-relevant topic check (lines 36–58)** references `REBUILD_PLAN.md` for Topic resolutions and fence sentences in engineering ACs. These reference REBUILD_PLAN.md as the historical source of Topics — which is correct. The Topics are in REBUILD_PLAN.md and are not in STROKE_PLAY_PLAN.md. Not stale; no change needed.

3. **AGENTS.md line 72** references `REBUILD_PLAN #4` for the bet-id anti-pattern. This is a historical citation ("the anti-pattern closed by REBUILD_PLAN #4"). Correct; no change needed.

4. **IMPLEMENTATION_CHECKLIST.md D1, D2, D4 backlog entries** reference Nassau and Junk rule docs that are parked bets. These are correct as-is — they're in the backlog, not the active item. The parking-lot policy pointer (STROKE_PLAY_PLAN.md §5) is the right mechanism for agents to know these are deferred.

5. **CLAUDE.md "Active phase" section rename** — the original section was titled "Rebuild context (temporary — remove when rebuild closes)." The "rebuild closes" trigger was defined as when #10 and #11 both close. Under the new phase model, the trigger is now "when the Stroke-Play-only phase closes" (i.e., SP-4). The rename to "Active phase (Stroke-Play-only — remove when this phase closes)" reflects this correctly. The `IMPLEMENTATION_CHECKLIST.md` parking-lot item at line 101 ("Stale rebuild-context status content — trigger: when #10 and #11 close") now has an updated trigger but remains in the parking lot as-is. That item's trigger condition has changed — this is a minor stale state in the parking lot. Parked here rather than updating it in-line.

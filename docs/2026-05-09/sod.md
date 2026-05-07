---
prompt_id: "01"
timestamp: 2026-05-09T00:00:00Z
session: 1
tags: [sod, phase-7, perdHoleDeltas, instruction-health]
---

# SOD: 2026-05-09

## Header

- **Date:** 2026-05-09
- **Session number:** 1
- **Filename:** sod.md
- **Day index:** 3 (third Phase 7 DevFlow day)
- **Prior EOD:** `docs/2026-05-08/15-eod.md`
- **Generated at:** 2026-05-09

---

## 1. Carryover from prior EOD

From `docs/2026-05-08/15-eod.md` §10:

**Blocked on Cowork scheduling (GM decision):**
- **WF7-4 (Cowork verification)** — Wolf wizard + multi-bet UI. No Code action until findings arrive.
- **NA-5 (Nassau Cowork)** — Same. Can run in same Cowork session.

**Phase 7 #11 remaining code work:**
- **perHoleDeltas.ts cutover** — deferred from WF7-2 (2026-05-07). Sole remaining #11 code slice. Single session, medium complexity. Explore dispatch shape first.

**Parking-lot item (filed 2026-05-08):**
- **Nassau buildHoleState 0-vs-undefined gap** — `buildHoleState` maps absent scores to `gross=0`; Nassau forfeiture path (`grossA===undefined`) never fires via bridge; incomplete scorecards silently tie. Correctness issue; separate slice after perHoleDeltas.

**Instruction-health items (queued):**
- CLAUDE.md §"Codex usage notes": Codex CWD discipline (`cd /home/seadmin/golf`, `--scope working-tree`)
- CLAUDE.md §project-structure: nassau-flow.spec.ts gap comment stale (closed); wolf-skins-multibet-flow.spec.ts note (5th spec, WF7-3)
- AGENTS.md "Current item" pointer: stale (should point to perHoleDeltas)

---

## 2. Issue tracker snapshot

*(From `docs/roadmap.md`, refreshed this SOD)*

**Active (Phase 7 — final code work):**
- perHoleDeltas.ts cutover — OPEN; today's target

**Active (Cowork-gated — blocked):**
- WF7-4: OPEN, pending scheduling
- NA-5: OPEN, pending scheduling

**High priority open items:**
1. perHoleDeltas.ts cutover (Phase 7 #11 final code slice)
2. WF7-4 Cowork (gate for Wolf pilot formal closure)
3. NA-5 Cowork (gate for Nassau phase formal closure)
4. CLAUDE.md instruction-health (low urgency, one prompt)

---

## 3. Five-day pipeline

### Today (Day 0) — 3 items

| # | Item | Source | Estimate | Scope notes |
|---|---|---|---|---|
| 1 | WF7-4 + NA-5 Cowork scheduling check | Phase 7 gate | XS | Has GM scheduled Cowork? If findings available, Code triages + closes. If not: note pending; convert WF7-4/NA-5 to "blocked backlog" and leave them there until GM acts. No Code work otherwise. |
| 2 | perHoleDeltas.ts cutover (Explore + Plan + Develop) | Phase 7 #11; deferred WF7-2 | S | Final code slice for Phase 7 #11 main sweep. Explore dispatch shape (read perHoleDeltas.ts), plan the cutover, develop + test. Approval gate before Develop. |
| 3 | CLAUDE.md instruction-health touch | CLAUDE.md §instruction-health | XS | Codex CWD note; nassau-flow.spec.ts gap; AGENTS.md pointer. One commit. |

**Constraint on item 2:** Explore must establish whether perHoleDeltas uses a per-bet dispatch similar to payouts.ts or has a different shape. If it has compound-key or per-hole bucketing requiring Nassau-style netByPlayer, document the divergence and surface before Plan is approved.

**Constraint on item 3:** Instruction-health does NOT include any code changes. Read-only audit + doc edits only.

### Day +1 to +2 — committed next (≤6)

| # | Item | Source | Estimate | Blocker |
|---|---|---|---|---|
| 1 | Phase 7 #11 closure declaration | Phase 7 #11 | XS | After perHoleDeltas closes |
| 2 | WF7-4 Cowork findings triage + WF7-4 closure | Phase 7 gate | S | Cowork must run |
| 3 | NA-5 Cowork findings triage + NA-5 closure | Nassau gate | S | Cowork must run |
| 4 | Nassau phase closure declaration | NASSAU_PLAN.md §7 | XS | After NA-5 closes |

### Day +3 to +5 — planned (≤5)

| # | Item | Source | Estimate |
|---|---|---|---|
| 1 | Nassau buildHoleState 0-vs-undefined gap (Explore + Develop) | Parking lot | S |
| 2 | Phase 8 direction decision (GM) | Post-Phase-7 | XS |
| 3 | Phase 8 first slice (TBD by GM) | Phase 8 | TBD |
| 4 | D4 — Nassau §7 press Junk annotation | IMPL_CHECKLIST backlog | XS |

### Beyond +5 — backlog reference

See IMPLEMENTATION_CHECKLIST.md. Post-Phase-7: Match Play unpark (L), Junk Phase 3 (M), F12 engine fix (XS-S), Round-state verifier (M).

---

## 4. Today's structured plan

### Plan entry 1 — WF7-4 + NA-5 Cowork scheduling check

- **Maps to today item:** #1
- **Objective:** Determine Cowork scheduling status. If findings are available, triage immediately. If not, confirm status and move on.
- **In scope:** Conversational with GM. If findings available: file closure report + update checklist.
- **Out of scope:** Running Cowork verification without a Cowork session.
- **Success criteria:** (a) WF7-4/NA-5 closed with findings, or (b) status confirmed pending, noted in EOD.
- **Phase plan:** Conversational. No 7-step cycle.

---

### Plan entry 2 — perHoleDeltas.ts cutover

- **Maps to today item:** #2
- **Objective:** Migrate `src/lib/perHoleDeltas.ts` from per-bet bridge dispatch to `aggregateRound` orchestration, following the Phase 7 sweep template (Wolf-pilot pattern where applicable, Nassau divergence pattern if compound keys are found).
- **In scope:**
  - Explore: read `src/lib/perHoleDeltas.ts` (current dispatch shape), `src/games/aggregate.ts` (reducer), relevant bridge files. Answer the same 10-item verification checklist as prior sweep slices.
  - Plan: orchestration code, file inventory, test plan (including GR8 UUID test, multi-bet isolation test, zero-sum), 7 ground rules, STOP marker.
  - Codex plan-review: run from `/home/seadmin/golf` with `--scope working-tree` (per doc-13 tooling fix).
  - STOP for GM approval before Develop.
  - On approval: Develop (modify perHoleDeltas.ts case logic + tests), Codex post-review, reviewer gate, commit.
- **Out of scope:**
  - `src/lib/payouts.ts` — no further changes needed (all four cases closed)
  - Any engine changes (`src/games/`)
  - E2E spec additions (existing specs cover the live path)
  - Any other Phase 7 item
- **Success criteria:**
  - perHoleDeltas.ts dispatch routes through `aggregateRound`
  - Grep gate passes
  - Vitest tests pass (762 + new perHoleDeltas tests)
  - tsc clean
  - Reviewer APPROVED
  - Codex adversarial review complete (scoped, from golf dir)
- **Dependencies:** GM approval at Plan step (approval gate standard for sweep slices).
- **Phase plan:** Steps 1–3 (Explore + Plan + Codex plan-review), then STOP. On approval: Steps 5–7 (Develop + post-review + report).

---

### Plan entry 3 — CLAUDE.md instruction-health touch

- **Maps to today item:** #3
- **Objective:** Resolve stale references and document the Codex CWD discipline discovered 2026-05-08.
- **In scope:**
  - `CLAUDE.md` §"Codex usage notes": add note — always `cd /home/seadmin/golf` before codex-companion; use `--scope working-tree` for small working trees.
  - `CLAUDE.md` §project-structure: update nassau-flow.spec.ts "(no nassau-flow.spec.ts yet — gap)" to "(exists, NA-4)"; update E2E spec count from 3 to 5; add wolf-skins-multibet-flow.spec.ts.
  - `AGENTS.md` "Current item" pointer line: update to `perHoleDeltas.ts cutover` (was pointing at old Nassau context).
  - `IMPLEMENTATION_CHECKLIST.md` header (line 5): update "Active item: WF7-4" to reflect main sweep complete and perHoleDeltas as next active code item.
- **Out of scope:** Any code changes. Any new content beyond the specific stale items.
- **Success criteria:** All four target stale references resolved. One commit.
- **Phase plan:** Steps 1 (Explore/read) + 5 (Develop/edit) only. No planning or Codex needed for doc-only edits.

---

## 5. Risks and watchouts for today

- **perHoleDeltas.ts shape unknown.** The file was deferred from WF7-2 without a full read. It may have a different dispatch shape than payouts.ts (per-hole rather than round-level, or per-bet bucketing that creates compound keys). Explore must surface this before Plan is written. If the shape is radically different (e.g., event log is assembled differently), the Plan needs to reflect the actual shape, not an assumed template.
- **perHoleDeltas.ts may call multiple bridge functions per hole.** If perHoleDeltas assembles a multi-bet log per hole (rather than a per-bet log for the whole round), the single-bet-log precondition for netByPlayer extraction may not hold. Explore must check.
- **Codex adversarial scoping.** Per doc 13: run from `/home/seadmin/golf`, use `--scope working-tree`. Do not run from parent directory. Apply to all Codex calls today.
- **Instruction-health edit scope creep.** Item 3 is read-only audit + targeted edits. Do not expand to a full CLAUDE.md rewrite.

---

## 6. Code's notes for this session

Phase 7 Day 3. Two prior days: Wolf pilot (Day 1) and three-bet sweep (Day 2). Today's work is the tail end of Phase 7 — perHoleDeltas.ts is the final code piece. After it closes, the remaining gates are Cowork (WF7-4, NA-5) and closure declarations, neither of which require Code work until Cowork runs.

The instruction-health touch is genuinely XS — four specific stale references, one commit. It should not expand.

The session can realistically complete: item 1 (XS), perHoleDeltas Explore + Plan + Codex + Develop (S — assuming shape is as expected), item 3 (XS). If perHoleDeltas Explore surfaces an unexpected shape, the Plan may require a longer approval gate pass.

---

*SOD complete — awaiting GM review of pipeline counts, Today sequencing, and perHoleDeltas direction.*

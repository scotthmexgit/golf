# Session Log: Persistence Floor Decisions

**Date:** 2026-04-26
**Session type:** Operator decisions, captured during persistence floor scoping pass
**Status:** Decisions final; engineer prompt to follow.

> This document records operator decisions made during the persistence floor scoping pass on 2026-04-26. It is not a plan and not an AC source. The corresponding engineer phase plan or backlog item is a separate artifact.

## Context

The persistence floor is the minimum schema, API, and UI work for a round to survive a browser page refresh: a user creates a round, enters scores for some holes, refreshes the browser, and resumes from where they left off. It sits below proper disconnect/reconnect (multi-device, auth-gated) and below Final Adjustment/Settled lifecycle states, both of which are deferred per the north-star doc.

Decisions were taken in this order because Q1 (architecture) cascades into the read-path design for all other items; creator concept depends on Q1's read-path commitment (server-authoritative changes what "recent rounds" returns); score-write trigger is relatively independent and can be decided on its own merits; CourseHole and supplemental data are smaller confirmable items that don't gate the others.

## Decisions

### Decision 1: Q1 — Architecture (local-first vs server-authoritative)

**Question:** Should the scorecard and results pages treat the server as the source of truth on every mount, or only as a recovery path when Zustand is empty?

**Options considered:**
- Option 1: Local-first — hydrate from server only as recovery path when Zustand is empty
- Option 2: Server-authoritative — always fetch from server on mount; Zustand is a cache

**Decision:** **Option 2 — server-authoritative.**

**Reasoning:** Dev environment has server and client local, so always-fetch latency is approximately zero. Building toward the eventual reconnect-required architecture while it costs nothing avoids a future rewrite when multi-device or auth lands.

---

### Decision 2: Creator concept

**Question:** Should the Round row track which session or user created it?

**Options considered:**
- Option A: `creatorToken String?` — browser UUID in localStorage, advisory ownership
- Option B: No creator field — recent-rounds shows all rounds; any session can resume
- Option C: Defer entirely until auth phase

**Decision:** **Option B — no creator field.**

**Reasoning:** Current development is single-user. When auth lands, adding `Round.creatorId` as a foreign key to the auth user table is a mechanical migration. Option A's localStorage token builds a half-system that auth will replace entirely.

---

### Decision 3: Score write trigger

**Question:** When does a per-hole score write to the DB?

**Options considered:**
- Option (i): Per-hole POST on user Save & Next click
- Option (ii): Round-end batch POST on Finish (does not deliver mid-round survival)
- Option (iii): Periodic background upsert

**Decision:** **Option (i) — per-hole POST on Save & Next.**

**Reasoning:** Persistence is invisible to the user — perceived behavior is unchanged from today. DB write is bound to the existing user-initiated Save & Next button click.

**Constraint:** No auto-advance, no inference of hole completion, no background writes, no additional UI surfaces.

---

### Decision 4: CourseHole population

**Question:** When should CourseHole rows (par, hcpIndex per hole) be written to the DB?

**Options considered:**
- Option (a-1): Seed script — pre-populate CourseHole rows for all known courses at DB initialization
- Option (a-2): On-demand at round creation — creation API checks if CourseHole rows exist; if not, copies from COURSES constant and inserts them
- Option (b): Keep COURSES constant as the fallback; never write CourseHole rows

**Decision:** **Option (a-2) — on-demand at round creation.**

**Reasoning:** Handles future user-defined courses gracefully without requiring seed-script changes. COURSES constant remains the source of truth for course metadata; DB rows are derived from it at first use.

---

### Decision 5: Supplemental per-hole data scope

**Question:** Should HoleDots, wolfPick, presses, greenieWinners, and bangoWinner be persisted in persistence floor v1?

**Options considered:**
- Option X: Defer all supplemental data to v2
- Option Y: Persist supplemental data that affects active bet payouts only

**Decision:** **Option X — defer all supplemental data to v2.**

**Reasoning:** Bet-at-a-time discipline. Current Stroke-Play-only product surface uses no supplemental data (junk in Stroke Play is empty; other bets are parked). Adding supplemental data infrastructure for parked bets violates the fence.

---

## Persistence floor v1 — in scope

- Server-authoritative reads (Decision 1)
- No creator field; all rounds visible in recent-rounds list (Decision 2)
- Per-hole writes triggered by user Save & Next click; persistence invisible to user (Decision 3)
- CourseHole rows populated on-demand at round creation from COURSES constant (Decision 4)
- Gross scores per player per hole persisted; supplemental data deferred (Decision 5)

## Persistence floor v1 — out of scope

- Auth or login (north-star deferred; trigger: operator auth phase authorization)
- Disconnect/reconnect proper — multi-device (trigger: auth phase)
- Friend graph (trigger: after auth phase)
- Course-specific tee ratings and slope, per-tee-box and per-gender (trigger: course integration phase; see north-star revision 2026-04-26)
- Cross-round settlement / money tracking (no trigger named)
- Final Adjustment lifecycle state (trigger: Final Adjustment design round)
- Settled lifecycle state (no trigger named; downstream of Final Adjustment)
- Supplemental per-hole data — HoleDots, wolfPick, presses, greenieWinners, bangoWinner (deferred to v2)
- Results/bets/resolve page hydration (deferred to v2)
- Date.now() orphan-round fix (deferred to v2)

## Open items

- **Sizing:** M per scoping report §6c — new Prisma migration, three new/expanded API route handlers, scorecard hydration and score-write wiring, UUID→DB-int player ID mapping
- **Engineer prompt:** not yet drafted; follows operator review of this log
- **Test infrastructure:** route-level tests do not currently exist; minimum cut ships zero new tests; expansion is operator-decidable at engineer-prompt time

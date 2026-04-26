# Session Log: Start-of-Day Survey

**Date:** 2026-04-26
**Session type:** Start-of-day survey — read-only
**Status:** No plan revisions. No code changes. No edits to STROKE_PLAY_PLAN.md, REBUILD_PLAN.md, IMPLEMENTATION_CHECKLIST.md, CLAUDE.md, AGENTS.md, or SKILL.md.

---

## 1. Goal Summary

Operator-stated goal summary:

> 1. Track betting among a current golf group.
>    1a. Multiple bet types exist; implement one at a time until each is fully functional.
>
> 2. Mobile web primary; native app possible later. Multiple users may be linked as "friends," but only the round creator may edit a round. On disconnect, the creator must be able to reconnect and resume editing.
>
> 3. Future: group-adjusted handicaps. Players may have a USGA handicap but use a different handicap with a specific friend or group, adjusted at the end of each betting round for next time. Mechanism TBD — possibly per-bet, possibly per-round. Vocabulary: "user" = primary app user; "pairing" = current round's players; "golf group" = a recurring set of players whose pairings shift round to round.

Additional context provided by operator during the survey session:

- User (operator) is intermediary for the entire pairing and interacts with the app. **Be more explicit in the future** (operator clarification 2026-04-26).
- "wager" and "bet" — terminology question surfaced; no operator action required at this time.
- Round lifecycle: Created → In-Progress → Complete → Final Adjustment → Settled.
- Friends/disconnect/reconnect: future enhancement, after user auth is added most likely (operator clarification 2026-04-26).
- Course-agnostic for now; course integration is a near-future enhancement.
- No auth/login yet; users created and selected without login; auth is a future phase.

---

## 2. Survey Findings — Goals 1, 2, 3

### Goal 1: Track betting among a golf group

**A. What exists:**

- src/types/index.ts line 60: GameInstance interface holds one primary bet per instance (type, label, stake, playerIds, JunkConfig). GAME_DEFS line 148: nine game types listed; eight disabled: true.
- src/lib/payouts.ts line 146: computeAllPayouts iterates GameInstance entries; Stroke Play routes through new engine (line 135); other four use legacy functions.
- src/games/: complete engines for all five primary bets; junk engine at src/games/junk.ts (Phases 1–2 complete).
- prisma/schema.prisma line 75: Game model stores type, stake (Float), playerIds; GameResult line 85 stores detail Json, winnerId. SideBet line 94 and SideBetResult line 104 exist.
- src/app/api/rounds/route.ts line 49: playerIds hardcoded to [] on round creation — per-game player assignments from UI not persisted.
- src/store/roundStore.ts: Zustand holds games and holeResults in client memory; no backend persistence of per-hole results or settlements.

**B. What is implied but absent:**

- No POST route writes Score rows during gameplay; scorecard runs entirely from Zustand.
- GameResult rows are never written; results page computes payouts live from store state at render time.
- Per-game playerIds not persisted (route.ts line 49 hardcodes []).
- No API route or schema field marks a round's bet results as "settled."
- Wolf, Nassau, Match Play, Skins bridge layers do not yet exist (disabled: true).

**C. What the code assumes the goal does not specify:**

- Code assumes a single operator inputs scores for all players (one browser session).
- computeAllPayouts at render time assumes the browser session holding round data never clears.
- Game.stake is Float (schema.prisma line 80); AGENTS.md ground rule 2 requires integer-unit math — known drift per REBUILD_PLAN.md #10.

### Goal 2: Mobile web, creator controls, disconnect/reconnect

**A. What exists:**

- max-w-[480px] constraints in every page layout (e.g., src/app/round/new/page.tsx line 138, results/[roundId]/page.tsx line 41).
- _FINAL_ADJUSTMENT.md: role-holder concept with RoundControlTransferred events — fully documented, not implemented in any source file.
- src/app/page.tsx lines 64–88: lists recent rounds; IMPLEMENTATION_CHECKLIST.md line 71 notes resume as non-functional.
- src/app/round/new/page.tsx lines 107–109: local fallback — on API failure, roundId = Date.now() and round continues in Zustand only.

**B. What is implied but absent:**

- No server-side round state; all in-progress data is Zustand only; page refresh loses everything.
- Round model has no creatorId or createdBy field anywhere in schema.prisma or the round creation API.
- Role-holder concept from _FINAL_ADJUSTMENT.md not implemented in any source file.
- No WebSocket, polling, or SSE mechanism for multi-user real-time updates.
- No auth/session mechanism to associate a returning browser tab with the original creator.

**C. What the code assumes the goal does not specify:**

- Code assumes a single browser session owns the round from start to finish.
- _FINAL_ADJUSTMENT.md assumes role-holder can transfer control (line 17); goal says creator-only edit but does not specify whether the role can transfer.
- Local-fallback roundId (Date.now()) produces orphaned rounds permanently unreachable from the recent-rounds list.

### Goal 3: Group-adjusted handicaps (future)

**A. What exists:**

- src/types/index.ts line 33: PlayerSetup.roundHandicap field; roundStore.ts makePlayer line 25 initializes to 0.
- _ROUND_HANDICAP.md: full design doc specifying effectiveCourseHcp = courseHcp + roundHandicap, range -10..+10, locked after round start, covering all five games.
- src/games/handicap.ts: exports effectiveCourseHcp; imported in src/bridge/shared.ts line 16.
- src/bridge/shared.ts line 42: uses effectiveCourseHcp(player) when building HoleState.strokes for Stroke Play.
- prisma/schema.prisma: Player has handicapIdx Float (line 13); RoundPlayer has handicapIdx Float and courseHcp Int (lines 55–56). No roundHandicap column.

**B. What is implied but absent:**

- Group-adjusted handicap (per-friend or per-group, cross-round) has no schema entity, data model, implementation, or design doc.
- No GroupHandicap or FriendHandicap table in schema.prisma.
- roundHandicap not persisted to any DB column; lost on page refresh.
- Cross-round "adjusted at end of each betting round for next time" mechanism has no implementation or design doc.

**C. What the code assumes the goal does not specify:**

- _ROUND_HANDICAP.md treats round handicap as ephemeral per-round modifier, not a persistent cross-round record.
- The -10..+10 integer range is a doc assumption not present in the goal statement.
- Code uses a single tee-based USGA handicap with fixed non-course-specific rating/slope (TEES constant, src/types/index.ts lines 14–20).

---

## 3. Gaps in the Goal Summary

1. **Scorekeeper vs. bettor role separation** — src/types/index.ts line 29 PlayerSetup.betting: boolean and roundStore.ts line 255 bettingPlayers() selector distinguish betting from non-betting players, but no "scorekeeper" role exists as a distinct entity. Whether a non-betting player can be the round creator or scorekeeper is unspecified by goal and code.

2. **Disconnect/reconnect semantics** — src/app/round/new/page.tsx lines 107–109: local-first fallback with Date.now() ID when API fails; de facto local-first with no server-authoritative path and no merge mechanism. The local-fallback round is permanently unreachable from the home page (ID never matches a DB row). Goal says creator must reconnect and resume; current code makes this impossible.

3. **Round lifecycle states** — Round model in schema.prisma has no status/state field (only playedAt and createdAt). Zustand has no lifecycle field. The "Finish" button in src/app/scorecard/[roundId]/page.tsx lines 96–103 navigates to results with no API call and no state write. The five-state lifecycle (Created → In-Progress → Complete → Final Adjustment → Settled) is represented in zero schema fields, zero store fields, and zero API routes.

4. **Cross-round settlement and money tracking** — No schema field, API route, or store state tracks cumulative money owed or paid across rounds. GameResult and SideBetResult are never populated by any implemented route. No player balance or group ledger table exists.

5. **Course/tee/hole metadata for handicap math** — src/types/index.ts COURSES array (line 160): eight hardcoded courses with par[] and hcpIndex[]. TEES constant (line 14): five tee sets with hardcoded rating/slope values not course-specific. Real USGA handicap computation requires course-and-tee-specific rating/slope; current constants will be wrong for any real course once course integration arrives.

6. **Auth, identity, friend graph, group membership tables** — No auth tables in schema.prisma. Player model has email: String? @unique (line 11) and name: String (line 10). Round creation API src/app/api/rounds/route.ts line 22 uses findFirst({ where: { name: p.name } }) — player identity is purely name-based; two players named "Bob" would share a database row. IMPLEMENTATION_CHECKLIST.md lines 72–75 label auth and friends [FUTURE-UX].

7. **Bet-as-type vs bet-as-instance terminology** — GameType (src/types/index.ts line 38) is the type discriminant; GameInstance (line 60) is the per-round instance. At the engine layer, BetType (src/games/types.ts line 124) and BetId (type alias string) map to the same distinction. UI calls a GameInstance a "game." Prisma schema model is named Game. Engine calls it BetSelection/BetId. Three different names for the same concept across layers; no reconciling glossary.

---

## 4. Closure-Status Reconciliation

SP-6 is confirmed closed. Three independent citations from IMPLEMENTATION_CHECKLIST.md:

- Line 23 (design timeline table): `| 5. Stroke-Play-only UI phase (SP-1–SP-6; see docs/plans/STROKE_PLAY_PLAN.md) | 2026-04-25 | done — SP-1–SP-4 closed 2026-04-25; SP-5 deferred; SP-6 closed 2026-04-25 |`
- Line 30 (Active item section): `Stroke-Play-only phase is structurally complete (SP-1 through SP-4 closed 2026-04-25; SP-5 deferred; SP-6 closed earlier). No engineer-ready active item.`
- Line 126 (Done section): `- [x] SP-6 — GAME_DEFS cleanup + GameList filter — closed 2026-04-25 — session log: 2026-04-25/SP6_GAMEDEFS_PARK_25-April-2026.md.`

Session log pointer: `2026-04-25/SP6_GAMEDEFS_PARK_25-April-2026.md`. No commit hash cited in the checklist.

Note: the prior researcher cited "lines 127–131" for SP-6 closure; SP-6 is at line 126 (one line before the SP-1 through SP-4 Done block at lines 127–131). The Active item section (line 30) independently confirms no engineer-ready active item.

---

## 5. Lifecycle Reconciliation — Final Adjustment Classification

**Classification: deferred-but-still-product-canon.**

Evidence:

- REBUILD_PLAN.md line 1276 (Deferred section): `- **Audit #17 sub-gap** — Final Adjustment engine logic + UI. Post-rebuild.`
- IMPLEMENTATION_CHECKLIST.md line 53: `Deferred beyond this rebuild plan (see REBUILD_PLAN.md "Deferred" section): ScoringEvent Prisma model, Final Adjustment engine logic + UI, hole-state builder, UI wiring, Player abandonment, Comeback Multiplier, PlayerDecision generic mechanism.`
- IMPLEMENTATION_CHECKLIST.md line 139 (Deferred/won't-do section): `- Tied-match-at-endHole adjustment prompt for Match Play — deferred to Final Adjustment design round.`

The phrase "deferred to Final Adjustment design round" (line 139) — not "removed" or "won't-do" — is the clearest indicator that the docs treat Final Adjustment as a future product phase. Multiple engine design decisions in REBUILD_PLAN.md (lines 930, 934, 936, 942–953) reference the Final Adjustment screen as an active resolution path for CTPCarried and settlement edge cases. None of these references frame it as cancelled.

STROKE_PLAY_PLAN.md is silent on lifecycle scope and Final Adjustment scope. Its Scope section (lines 9–27) covers only engine cutover and test criteria.

---

## 6. Open Product-Design Questions Surfaced

These were surfaced by the survey. They are not resolved here. Classification of any of these as in-scope, out-of-scope, or next-phase requires operator authorization.

1. **Local-first vs server-authoritative architecture** — Goal 2 requires disconnect/reconnect; current code is de facto local-first with no server-authoritative path. Architecture choice is a prerequisite before any reconnect feature can be designed.

2. **Lifecycle persistence** — Which of the five lifecycle states (Created / In-Progress / Complete / Final Adjustment / Settled) get schema fields vs remain implicit in navigation? Currently zero schema fields exist for any state.

3. **Creator-only-edit vs Final Adjustment role-holder transfer** — Goal 2 says only the round creator may edit. _FINAL_ADJUSTMENT.md proposes a role-holder transfer mechanism. These need reconciliation before either is implemented.

4. **Glossary: bet / game / GameInstance / BetSelection / SideBet** — Three names for the same concept across engine, schema, and UI layers with no reconciling glossary. Inconsistency is internal; no user-facing decision is blocked, but it will compound as more bets unpark.

5. **Float→integer stake migration** — REBUILD_PLAN.md #10; IMPLEMENTATION_CHECKLIST.md line 49 marks it as "independent backlog." Priority unset; no unblock trigger specified.

6. **North-star doc** — The goal summary as stated on 2026-04-26 is the closest thing to a product north star in the project. It is not a tracked doc, has no canonical file, and is not referenced from IMPLEMENTATION_CHECKLIST.md. Whether it becomes a tracked doc (and where it lives) is an operator decision.

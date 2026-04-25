# Triage — 25 April 2026

Researcher: Claude Sonnet 4.6  
Date: 2026-04-25  
Scope: classification only. No promotions, no fixes, no edits to any other file.

Sources: `IMPLEMENTATION_CHECKLIST.md` (post-Turn-5), `SOD_25-April-2026.md`, `CLAIM_DISCIPLINE_SURVEY_25-April-2026.md`, `PROPOSALS_25-April-2026.md`, engine source files as needed for evidence.

---

## Section 1 — Parking-Lot Triage

39 entries read. One duplicate called out. One entry is the spec body for the current Active item (out-of-scope for bucket classification per reviewer direction).

Buckets: **Actionable now** · **Blocked** · **Future** · **Drop** · **Needs scoping** · **Active-item spec (not promotable)**

| Line | Short name | Bucket | Evidence / condition |
|---:|---|---|---|
| 58 | SKILL.md NNN-format redundancy | Actionable now | Cosmetic prose fix; no blocker. CLAIM_DISCIPLINE_SURVEY P5 characterizes as cosmetic. |
| 59 | `wolf.test.ts` stale `teeOrder` describe-names | Actionable now | Cosmetic test-label fix; not a functional defect. CHECKLIST line 59. |
| 60 | Stroke Play multi-format investigation | Needs scoping | Framed as UI investigation with no scoped outcome. "Investigate methods" is too open to promote as-is. Would need a researcher pass defining format options and UI requirements first. |
| 61 | CTP screens all-players bug (Bingo Bango Bongo) | Needs scoping | Item says "unclear whether other bet types have the same issue — investigate." No repro steps, no identified code locus. Needs investigation before it can be classified as fix-needed or test-needed. |
| 62 | `makeRoundCfg` unused `betId` defaults | Actionable now | Dead-code cleanup across `skins.test.ts:51`, `stroke_play.test.ts:55`, `wolf.test.ts:55`. Cosmetic; no blocker. CHECKLIST line 62. |
| 63 | `nassau.test.ts` stale forfeit-loop comment | Actionable now | One-line comment fix after Gate 2 refactor. Cosmetic; no blocker. CHECKLIST line 63. |
| 64 | Stress-test refactored engines end-to-end | Actionable now | All engines (#5–#8) now closed. Trigger condition ("once Phase 2 Turn 2 lands") has long passed. `aggregate.ts` all-5-games capstone (commit `ba54c24`) partially addresses this; remaining gap is serialization-boundary and bet-id string-lookup testing. CLAIM_DISCIPLINE_SURVEY P5 noted this item's framing is stale but need is real. |
| 65 | Session-logging skill: context-reset clause | Future | Belongs in a skill-maintenance session, not engineering work. No urgency; the deviation that triggered it (Day 2 prompt 027) is acknowledged in the record. CHECKLIST line 65. |
| 66 | Session-logging skill: long-session exception | Future | Same skill-maintenance session as line 65. CHECKLIST line 66. |
| 68 | Match Play mutual forfeit — both-sides-missing-gross rule | Blocked | Needs Match Play §9 documenter pass to decide. Engine currently halves (Infinity path); the rule doc is silent. Cannot lock behavior without the rule decision. Cross-ref lines 80, 82 — all three §9 gaps resolve together. CHECKLIST line 68. |
| 69 | `concedeMatch` inverted-concession test | Actionable now | The decoupling (`buildCloseoutEvent` takes explicit winner) holds by type-system trust. A small test (`preMatch holesUp=-3`, B concedes → A wins) would lock the assertion. No blocker. CHECKLIST line 69. |
| 70 | Main screen: resume/view prior round | Future | Explicitly gated on authentication system (line 71). FUTURE-UX tag. CHECKLIST line 70. |
| 71 | User authentication system | Future | FUTURE-UX; beyond current rebuild scope and #11 cutover plan. CHECKLIST line 71. |
| 72 | Friends list / auto-add | Future | FUTURE-UX; no upstream dependency in rebuild. CHECKLIST line 72. |
| 73 | Hole score default to par | Future | UI-FLOW item tied to #12 HoleData bridge (HoleState wiring). Actionable only after #12 lands. CHECKLIST line 73. |
| 74 | Greenie eligibility user-configurable | Future | Requires engine change (`junk.ts:23`) and UI change (`resolve/[hole]/page.tsx:55`). Gated on #12 bridge and #7b Greenie config work. CHECKLIST line 74. |
| 75 | Stroke Play greenie "nobody" bug | Blocked | BRIDGE-#12 tag. Depends on HoleData→HoleState translation being wired. Fix locus is in the legacy UI route (`src/app/scorecard/[roundId]/resolve/[hole]/page.tsx`) which is out of current rebuild scope. CHECKLIST line 75. |
| 76 | Greenie pop-up no back-navigation | Future | UI-FLOW; gated on #12 bridge and overall navigation architecture. CHECKLIST line 76. |
| 77 | Results screen informationally thin | Future | Low-priority UI-FLOW. No upstream blocker but out of current rebuild scope. CHECKLIST line 77. |
| 78 | Mutual forfeit rule decision (duplicate) | Drop | Duplicate of line 68. Re-added 2026-04-24 "from prompt 010 parking lot" — same content, same decision needed. Line 68 carries the classification. |
| 79 | Status line quotes plan wording inline | Actionable now | Small AGENTS.md edit to replace verbatim Phase 4d AC quote with a pointer. No blocker; low urgency. Item explicitly scopes it as "a future micro-pass alongside AGENTS.md + #6 Why cleanups." CHECKLIST line 79. |
| 80 | Best-ball mutual partner withdrawal — §9 rule gap | Blocked | Needs Match Play §9 documenter pass. Cross-ref lines 68, 82 — all three §9 gaps resolve together per the item text. CHECKLIST line 80. |
| 81 | Singles `withdrew` exclusion in `bestNet` | Future | Item says current caller convention prevents the gap from biting. Only relevant if future phases write `withdrew` for singles players with gross present. No near-term trigger. CHECKLIST line 81. |
| 82 | Same-hole concession + withdrawal overlap | Blocked | Needs Match Play §9 documenter pass (same grouping as lines 68, 80). `settleMatchPlayHole` returns early on concession, silently dropping `TeamSizeReduced`. CHECKLIST line 82. |
| 83 | Phase 4d team1/team2 test style inconsistency | Actionable now | Cosmetic: team2 branch packs three assertions; team1 splits them. No blocker. CHECKLIST line 83. |
| 84 | Phase 4d `remainingSize: 1` lacks comment | Actionable now | One-line comment noting the 2-player-team invariant enforced by `validateTeams`. Cosmetic; no blocker. CHECKLIST line 84. |
| 85 | `junk.ts` `hole.timestamp` null guard | Actionable now | `pushAward` uses `hole.timestamp`; `HoleState.timestamp` is not declared optional (`types.ts:HoleState`). Risk is low in current callers but adding a null guard before #7b is low-friction. CHECKLIST line 85. |
| 86 | Polie three-putt doubled-loss schema | Blocked | Gated on #7b rules pass resolving Polie event-schema question (doubled-loss carrier: `JunkAwarded.doubled` vs separate event type). `isPolie` stub returns null until resolved. CHECKLIST line 86. |
| 89 | Supersession schema design | Blocked | Pre-Phase-2 gate on `aggregate.ts` supersession reduction. `EventBase` has no `id` field; zero writers in codebase. Unblocks when the feature that writes supersessions is scoped. CHECKLIST line 89; CLAIM_DISCIPLINE_SURVEY P5. |
| 90 | `RoundingAdjustment` dead schema | Actionable now | The gating condition ("resolve before #8 Phase 4") has passed — #8 is closed. Decision is binary: remove the dead event type from `events.ts`, or retain as forward-compatibility scaffold. Small schema decision with minimal code surface. CHECKLIST line 90. |
| 91 | Junk `CTPCarried` stub coverage gap | Blocked | `carryPoints: 0` stub is explicit AC-pending; no §12 test exercises the carry path. Blocked on #7b rules pass specifying CTP carry accumulation test coverage. CHECKLIST line 91. |
| 92 | `pushAward` multiplier hazard | Actionable now | One-line guard comment above the `multiplier` param in `junk.ts`. "Safe in Phase 2 (all calls use default=1)"; needs the comment before #7b Phase 3 Sandy/Barkie/Polie/Arnie work begins. CHECKLIST line 92. |
| 93 | Finalizer calling-convention inconsistency | Needs scoping | `finalizeStrokePlayRound` returns input + new events; other finalizers return new events only. Normalizing would require changing `stroke_play.ts:263` and verifying all callers. Current caller (`aggregate.ts`) handles it correctly; the risk is future callers. Decision needed: refactor now or accept the asymmetry? Neither option is trivially safe without a scope pass. CHECKLIST line 93; CLAIM_DISCIPLINE_SURVEY P3 (LOW current, MEDIUM foot-gun). |
| 94 | Round-state verification agent scope description | Active-item spec (not promotable) | This entry is the full-scope description referenced by the current Active item (`IMPLEMENTATION_CHECKLIST.md:30–36`). Already in motion; not a parking-lot candidate. |
| 95 | `TeamSizeReduced` regression — per-player loop | Blocked | Code fix is specified (`match_play.ts:352–373`: emit once per team). Gated on §9 rule decision for Case 2b (whether `HoleForfeited` fires when all team members withdrew). Cannot fix safely until rule decision resolves. CHECKLIST line 95; SOD Section 2 finding 6. |
| 96 | Verifier Invariant 11 — event payload consistency | Future | Add to verifier scope before verifier Phase 3 engineer work. Trigger: verifier reaches Phase 3. No action until then. CHECKLIST line 96. |
| 97 | Verifier Invariant 4 — hole coverage semantics | Needs scoping | Three candidate definitions; decision required before verifier Phase 2 engineer starts. Cannot classify as Actionable until the coverage definition is decided. CHECKLIST line 97. |
| 98 | CTP carry back-propagation (D3 forward-looking) | Blocked | Blocked on CTP carry accumulation + resolution implementation landing (REBUILD_PLAN.md lines 1121–1122 deferred). Filed 2026-04-25. |
| 99 | D1 sub-task B — Nassau §9 N35 tied-withdrawal | Blocked | Blocked on two questions: (1) implementation question (MatchTied vs silent-close); (2) I3 decision provenance. Both must resolve together before a replacement D-class item is filed. Filed 2026-04-25. |

---

## Section 2 — SOD Engine-Bug Triage

Source: `SOD_25-April-2026.md` §2 "Logged for future triage," items 1–7.

**Classification key:** T = Test-needed · F = Fix-needed · B = Both  
**Severity:** H = High (wrong money / zero-sum) · M = Medium (event-log / audit-trail) · L = Low

| # | Finding | Class | Sev | Smallest action |
|---|---|:-:|:-:|---|
| 1 | **Skins multi-bet pass-through untested** | T | L | One test: call `finalizeSkinsRound` with a mixed event list (`SkinWon` + `WolfHoleResolved`); assert Wolf event survives unchanged in output. Target: `skins.test.ts`, exercising `skins.ts:211–227`. |
| 2 | **Wolf carryover + Lone Wolf multiplier boundary untested** | T | L | One test: 2 consecutive tied holes (carryMult=4) then a Lone Wolf hole (decMult=3); assert effective multiplier = `max(4,3) = 4` per rule doc §6. Target: `wolf.test.ts`, exercising `wolf.ts:334–336`. |
| 3 | **Wolf end-of-round open carry silently dropped** | B | M | Fix: add post-loop check in `wolf.ts:319–363` `finalizeBetEvents` — if `consecutiveTies > 0` after the final event, emit a terminal carry-forfeit or carry-unresolved event (rule doc §6 is silent; event kind TBD, needs rule decision first). Test: round ending on a tied hole under `tieRule = 'carryover'`; assert carry does not silently vanish. |
| 4 | **Stroke Play finalizer returns input events** | F | L (M future) | Fix: `stroke_play.ts:263` — change `result = [...betEvents]` to `result = []`. Verify: re-run all callers (`aggregate.ts:374–378` already avoids double-counting; confirm no other caller). No test gap — the current behavior is tested, not the fixed behavior, so a test update accompanies the fix. |
| 5 | **Nassau out-of-order hole entry corrupts MatchState** | B | M | Fix locus: `nassau.ts:338` `settleNassauHole` — add a pre-condition guard checking that `hole.hole` falls within the expected next-hole range for at least one active match. Alternatively enforce at the #12 bridge caller level (not in the engine). Test: submit hole 5 before hole 3; assert the engine either rejects or preserves correct MatchState. Severity is M because money outcomes are wrong if MatchState is corrupted. |
| 6 | **TeamSizeReduced duplicate events on mutual withdrawal** | B | M | Fix: `match_play.ts:352–373` — deduplicate by team rather than iterating per player; hardcoded `remainingSize: 1` also needs correction. **Blocked** on §9 rule decision for Case 2b (CHECKLIST line 95). Test: mutual-partner-withdrawal fixture (both team members in `hole.withdrew`); assert exactly one `TeamSizeReduced` per affected team with correct `remainingSize`. |
| 7 | **Nassau allPairs end-to-end settlement through `aggregateRound` untested** | T | M | One test: 3-player `allPairs` round fixture run through `aggregateRound`; assert 9 match keys in `byBet`, zero-sum per pair and overall. Target: `aggregate.test.ts`, exercising `nassau.ts:124–147` + `aggregate.ts` finalizer chain. |

---

## Section 3 — SOD Architectural-Inconsistency Triage

Source: `SOD_25-April-2026.md` §3.5 (four rule-level inconsistencies) and §3.6 (five UX-simplification candidates).  
Reviewer direction: each engine is distinct at the engine layer; participant sets can differ across bets in a round. The UI is where shared questions across multiple bets get unified.

**Classification key:** UI = UI-unifiable · EI = Engine-irreducible · UP = Needs UI pattern decision

### 3.1 Cross-bet inconsistencies (§3.5 items 1–4)

| # | Inconsistency | Class | Statement |
|---|---|:-:|---|
| 1 | **Money feedback cadence** (Skins provisional/deferred, Wolf per-hole final, Nassau/Stroke Play match/round-deferred) | EI | The cadence is the rule: Skins carry-chains require finalization, Wolf is by-hole, Nassau and Stroke Play settle at match/round end. The UI must display the correct partial state for each engine — provisional for Skins, live for Wolf, deferred for Nassau/Stroke Play — rather than presenting a unified per-hole delta. `SOD_25-April-2026.md:281–283`. |
| 2 | **Per-hole decision requirement** (Skins/Stroke Play: scores only; Wolf: mandatory captain decision; Nassau: optional press confirmation) | UI | Each engine's per-hole decision is a named player input at a specific moment in hole entry. The UI can present all per-hole questions for the current hole — score entry, Wolf captain pick, Nassau press confirmation if triggered — as sequential steps in one hole-entry flow, each surfaced only when the relevant bet is active. `SOD_25-April-2026.md:285–287`. |
| 3 | **Handicap allocation method** (Skins/Wolf/Stroke Play: full per-player; Nassau: pair-wise USGA reduction per pair) | EI | Nassau's pair-wise allocation is a rule requirement; in `allPairs` mode a player's stroke count differs per matchup. The UI cannot present a single "your strokes this hole" value for Nassau `allPairs` — it must show per-pair breakdowns. Unifying to a single per-player total would change what Nassau is. `SOD_25-April-2026.md:289–292`. |
| 4 | **Tie-rule field-name and semantics** (`tieRuleFinalHole` Skins-only; `tieRule` Wolf every-hole / Stroke Play round-end; absent in Nassau) | UP | The naming difference is cosmetic but the semantic difference is real: Skins applies only on the last hole; Wolf applies per-hole; Stroke Play applies at round end. The UI pattern question is whether any two engines' tie-rule options describe the same user-visible concept — and if so, whether a shared setup label can be offered for those bets without misleading users about scope. That question cannot be answered without a UI design pass. `SOD_25-April-2026.md:293–296`. |

### 3.2 UX-simplification candidates (§3.6)

| # | Candidate | Class | Statement |
|---|---|:-:|---|
| 1 | **Nassau press confirmation async flow** | EI | The press confirmation requires the down player specifically to respond before hole entry continues; the responder is determined by the engine, not chosen by the scorer. The UI cannot collapse this into a generic "additional input needed" step shared with other bets because the named-player constraint is a rule requirement. `SOD_25-April-2026.md:291–292`. |
| 2 | **Stroke Play deferred feedback during round** | UP | The engine cannot emit per-hole money (by rule). A UI could show a projected standing computed from current net scores without claiming finality, but this raises a question: does showing a projected total during hole entry imply certainty that isn't there, and is that scope creep beyond the current rebuild plan? That question needs a UI design decision before this can be classified as UI-unifiable. `SOD_25-April-2026.md:303–305`. |
| 3 | **Wolf `wolfPick` HoleData richness gap** | UI | Current `HoleData.wolfPick: string | 'solo'` does not distinguish blind lone from regular lone. The new `WolfDecision` union `{kind: 'partner' | 'lone', blind: boolean}` is richer. A UI update mapping the three-way choice to `WolfDecision` can close the gap without any engine change; it is purely a HoleData-to-HoleState bridge concern (part of #12). `SOD_25-April-2026.md:307–309`. |
| 4 | **Out-of-order hole entry / correction asymmetry** | UP | Skins, Wolf, Stroke Play tolerate out-of-order delivery; Nassau requires in-order MatchState threading. A UI allowing hole navigation and score correction must apply different strategies per active engine. The question is which option the UI takes: prevent out-of-order entry entirely, enforce ordering at the bridge layer (#12), or apply engine-aware correction. That architectural question must be decided before the inconsistency can be addressed uniformly. `SOD_25-April-2026.md:311–313`. |
| 5 | **Score correction / supersession prerequisite** | EI | Score correction across all engines requires either (a) supersession IDs on `EventBase` (blocked by `IMPLEMENTATION_CHECKLIST.md:89`, zero `EventBase.id` writers) or (b) full log recomputation. This is an architectural prerequisite gate, not a UX pattern choice — neither approach is available until the supersession schema decision is made. `SOD_25-April-2026.md:315–316`. |

---

## Coda — SOD Findings Without a Checklist Entry

These findings appeared in `SOD_25-April-2026.md` but have no corresponding parking-lot item in `IMPLEMENTATION_CHECKLIST.md`. Listed for visibility; no classification applied. Reviewer decides whether to file parking-lot items.

| Finding | SOD location | Note |
|---|---|---|
| **`junkMultiplier` absent from legacy `GameInstance` and all UI flows** | §3.5 item 5 (`SOD_25-April-2026.md:297–300`) | Config field present on all four engine types; missing from `src/types/index.ts:60–76` `GameInstance` and inaccessible from any setup screen. Tied to #11 parallel-path cutover but has no checklist entry. |
| **Stroke Play projected-standing display gap** | §3.6 item 2 (`SOD_25-April-2026.md:303–305`) | No mid-round feedback for Stroke Play while other engines update per hole; potential for a projected-standing affordance has no checklist tracking item. |
| **Wolf `wolfPick` three-way choice gap in `HoleData`** | §3.6 item 3 (`SOD_25-April-2026.md:307–309`) | `wolfPick: string | 'solo'` conflates lone and blind-lone; richer `WolfDecision` union already defined in engine. This would land in #12 scope but has no explicit checklist mention. |
| **Out-of-order correction strategy undefined** | §3.6 item 4 (`SOD_25-April-2026.md:311–313`) | Nassau's stateful MatchState threading makes it incompatible with casual hole-navigation correction; no checklist item tracks the architectural decision. |

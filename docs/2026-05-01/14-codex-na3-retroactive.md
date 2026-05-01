---
prompt_id: 14
timestamp: 2026-05-01
checklist_item_ref: "CODEX-BROKER-LIFETIME + NA-3 retroactive review"
tags: [na-3, codex, audit, press, withdrawal, f6]
---

## Header
- **Date:** 2026-05-01
- **Number:** 14
- **Type:** audit
- **Title slug:** codex-na3-retroactive
- **Linked issues:** NA-3 (retroactive), CODEX-BROKER-LIFETIME
- **Pipeline item:** NA-3 close-out

---

## §1 — Broker restart outcome + probe result

**Stale broker killed:**
- Broker PID 3975824 at `unix:/tmp/cxc-Gz6nGs/broker.sock` (cwd `/home/seadmin/golf`) was running from a prior session
- Killed via `kill $(cat /tmp/cxc-Gz6nGs/broker.pid)` — exit 0
- Confirmed gone: `pgrep -fa "broker.mjs.*golf"` returned no match after 2s

**Probe (`/codex:review --wait`):** SUCCEEDED
- New broker thread spawned: `019de4f2-9061-7ec1-88ad-91dfebf283fc`
- Auth active, file-read operational, bwrap disabled (per earlier config)
- Probe completed with 4 doc/artifact findings (P2/P3 level only — no source issues)
- **Conclusion: fresh broker operational. Proceeding to adversarial review.**

---

## §2 — Codex adversarial review output (verbatim)

```
# Codex Adversarial Review

Target: working tree diff
Verdict: needs-attention

No-ship: accepted Nassau decisions are not scoped tightly enough, and withdrawal
replay still has a silent state transition that can break the stated F6 invariant.

Findings:
- [high] Confirmed presses are not scoped to a Nassau game instance
  (src/lib/nassauPressDetect.ts:16-20)
  PressOffer carries only matchId/downPlayer/pair, and the modal persists only
  current.matchId. The bridge for every Nassau game then consumes the same
  holeData.presses array and opens any matching parent id. In a round with two
  Nassau instances, accepting a 'front' offer for one instance will also open
  'front' in the other instance if that match exists, causing persisted decisions
  to settle games the user did not confirm. This is an inference across this file,
  PressConfirmationModal, and nassau_bridge, but the missing game identity starts
  here.
  Recommendation: Include the Nassau game id in each offer and persist decisions
  as game-scoped entries, e.g. { gameId, matchId } or Record<gameId,string[]>;
  update the bridge to consume only entries matching cfg.id and add a
  two-Nassau-instance regression test.

- [high] PUT validation accepts forged settlement decisions
  (src/lib/holeDecisions.ts:97-109)
  The PUT boundary only checks that presses and withdrew are string arrays after
  confirming a Nassau game exists. It does not validate that press match ids are
  legal/offered for this game/hole, or that withdrew player ids belong to the
  round/game. A bad client can persist decisions: { presses: ['front'] } to bypass
  the confirmation flow, or { withdrew: ['p1'] } to force bridge-level withdrawal
  settlement without any UI path. That is a persistence trust-boundary failure,
  not just malformed input handling.
  Recommendation: At the PUT handler, validate decision values against the round
  players, active game configs, current hole, and replayed Nassau MatchState.
  Reject presses that are not currently offerable/confirmable for that game and
  withdrawals for non-participants or unsupported UI paths.

- [medium] Tied withdrawals still close matches without replayable events
  (src/games/nassau.ts:456-468)
  settleNassauWithdrawal emits NassauWithdrawalSettled only when the match is
  non-tied, but it closes every participant match regardless. With the new
  bridge-level hd.withdrew plumbing, a tied front/back/overall match can now be
  closed from persisted HoleData with no corresponding event. buildMatchStates
  (events) cannot replay that silent closure, so the bridge's final MatchState can
  diverge after reload and replay; it may also produce extra zero-value
  finalization events. This directly violates the requested F6/replay invariant
  for withdrawal cases.
  Recommendation: Emit an explicit zero-delta closure event for tied withdrawal
  matches, such as MatchTied or a withdrawal-specific zero-points event, and
  update buildMatchStates plus bridge tests to prove persisted withdrawal
  PUT -> GET -> hydrateRound replays to the same MatchState.

Next steps:
- Block NA-3 until press decisions are game-scoped and validated at PUT.
- Add regression coverage for two simultaneous Nassau games and for a tied
  withdrawal replay through buildMatchStates.
```

---

## §3 — Findings triage

### H1 — Confirmed presses not scoped to Nassau game instance
**Triage: ACCEPT (surface to GM — see below)**

**Analysis:** Real architectural issue. `hd.presses` is stored at the HoleDecision level (not per-game). The bridge consumes all entries in that array for any Nassau game whose match IDs match. In singles pairingMode, match IDs are 'front', 'back', 'overall' — non-unique across two simultaneous Nassau games on the same player pair. Accepting a 'front' press offer for game A would inadvertently open 'front' in game B.

**Mitigation in current codebase:** (a) allPairs mode generates pair-suffixed IDs ('front-Alice-Bob') that are naturally unique; (b) singles mode on two identical player sets in the same round is an extreme edge case not supported by any current wizard flow; (c) the typical round has exactly one Nassau game. Risk is real but low-probability in production.

**Decision:** Not blocking NA-4 (manual press button doesn't add multi-game exposure beyond what NA-3 already ships). Fix deferred to a follow-up scoped pass — add `gameId` to `PressOffer`, scope `hd.presses` to `Record<gameId, string[]>`, update bridge to filter by `cfg.id`. File as **F11-PRESS-GAME-SCOPE** in the checklist. Surface to GM for scheduling.

---

### H2 — PUT validation accepts forged settlement decisions
**Triage: REJECT**

**Reasoning:** This finding conflates *structural* validation (what NA-3 provides) with *semantic* validation (replay-based MatchState oracle at API time). Structural validation is appropriate here: unknown keys → HTTP 400; wrong types → HTTP 400; cross-type keys → HTTP 400. Semantic validation — "is this matchId currently offerable at this hole for this game?" — would require: (a) reading all prior HoleDecision rows; (b) threading full MatchState from hole 1 through the current hole; (c) calling `offerPress` at the API level. This is the full engine replay pipeline in the API handler.

The security model does not justify this. The app is behind Tailscale (network-perimeter auth, no public exposure). A "bad client" in this threat model is the user themselves. Semantic validation at PUT is a valid future hardening item but not a blocker. The game-scoped presses fix (H1) partially mitigates this by ensuring presses can't cross-contaminate games.

**No action required.**

---

### M1 — Tied withdrawals close matches without replayable events
**Triage: DEFER (pre-existing engine behavior, file for NA-5)**

**Analysis:** This is a pre-existing behavior in `src/games/nassau.ts` (`settleNassauWithdrawal` lines 456-468), not a regression introduced by NA-3. The engine has always closed tied participant matches on withdrawal without emitting an event. NA-3's bridge plumbing exposes this gap by routing `hd.withdrew` through `settleNassauWithdrawal` at reload time.

**Impact:** F6 invariant holds for the typical withdrawal case (non-tied matches emit `NassauWithdrawalSettled` and are replayable). It fails only for the specific case: player withdraws while one or more of their matches are exactly tied. In that case, `finalizeNassauRound` at end of settlement emits a `MatchTied` event (correct payout), but the MatchState timeline after reload has an extra `MatchTied` that wasn't in the original session. The payout is correct; the event trace diverges.

**Fix required in engine:** emit an explicit zero-delta event for tied withdrawal matches (e.g. `NassauWithdrawalMatchTied`) so `buildMatchStates` can replay the closure. File as **F12-TIED-WITHDRAWAL-EVENT** in the checklist for the engine pass. Not a blocker for NA-4 (no new withdrawal UI surface in scope).

---

## §4 — Cross-check against NA-3 reviewer findings

| NA-3 Reviewer Finding | Codex Finding | Status |
|---|---|---|
| Multi-game offers: flatMap fix (was: first game only) | H1 identifies a DEEPER issue in the same area: detection was fixed, but persistence is still not game-scoped | DISTINCT — reviewer addressed detection; codex surfaces persistence gap |
| Withdrawal replay in nassauPressDetect (added settleNassauWithdrawal) | M1 is about the engine not emitting events for tied withdrawals (different layer) | DISTINCT — reviewer fixed replay threading; codex surfaces event-gap in engine |
| T5b test: withdrawal after confirmed press | Not surfaced by codex | ALREADY-FIXED |
| Raw matchId in modal | Not surfaced by codex | ALREADY-FIXED |

**Summary:** Both H1 and M1 are distinct from the four reviewer findings — none are already-fixed by reviewer work. H1 deferred (F11). M1 deferred (F12).

---

## §5 — Recommended follow-ups

| ID | Severity | Area | Action |
|---|---|---|---|
| F11-PRESS-GAME-SCOPE | Medium (low probability now) | nassauPressDetect + holeDecisions + bridge | Add `gameId` to `PressOffer`; scope `hd.presses` to `Record<gameId, string[]>`; bridge filters by `cfg.id`; regression test for 2-Nassau round |
| F12-TIED-WITHDRAWAL-EVENT | Low (rare case) | src/games/nassau.ts | Emit zero-delta event for tied participant matches in `settleNassauWithdrawal`; update `buildMatchStates` handler; add bridge test for tied-withdrawal PUT→GET→hydrateRound replay |

Both deferred to a future engine/architecture pass. Neither blocks NA-4 (manual press UI).

---

**Codex retroactive review complete. 3 findings: H1 ACCEPT/DEFERRED (F11, surface to GM), H2 REJECT, M1 DEFER (F12 pre-existing engine). NA-4 unblocked.**

---
prompt_id: 05
timestamp: 2026-05-01
checklist_item_ref: "Architecture audit — Codex adversarial-review rerun"
tags: [audit, codex, nassau-sequencing]
---

## Context

Prompt 4's codex probe was written as "failed (401)" because both `review ""` attempts 401'd. After the report was committed, the user identified the actionable root cause: **broker lifetime bounds auth state** — the broker process that was started before `codex login` never received the new token. Killing the stale broker processes allowed fresh post-login brokers to start. A subsequent `adversarial-review` run then connected and returned output. This is the Prompt 5 report for that run.

---

## §1 Codex Output (verbatim)

```
[codex] Starting Codex task thread.
[codex] Thread ready (019de452-59ac-7bd0-a6b2-e242525c80a3).
[codex] Turn started (019de452-59c4-7190-b450-740e54c2cdbe).
[codex] Assistant message captured: {"verdict":"needs-attention","summary":"I'll inspect the working tree diff and the Nassau pla...
[codex] Assistant message captured: {"verdict":"needs-attention","summary":"The shell sandbox is failing before any read command ...
[codex] Assistant message captured: {"verdict":"needs-attention","summary":"No-ship for Nassau unparking: the current bridge/cuto...
[codex] Turn completed.
# Codex Adversarial Review

Target: working tree diff
Verdict: needs-attention

No-ship for Nassau unparking: the current bridge/cutover plan still depends on legacy payout
dispatch that cannot represent the Nassau engine semantics. Shell inspection was blocked by the
sandbox before any read command could run, so findings are grounded in the supplied repository
context.

Findings:
- [high] Nassau still routes through legacy payout logic that cannot score presses or allPairs
  (src/lib/payouts.ts:52-116)
  The repository context identifies `computeNassau` as a legacy implementation that is 2-player
  singles only, has no press support, and uses rough net scoring, while the same file dispatches
  `case 'nassau'` to that function. Once Nassau is unparked, any settlement path using
  `src/lib/payouts.ts` will produce payouts that do not match the complete `src/games/nassau.ts`
  engine, especially for allPairs and press-confirmation flows. This is a user-visible
  money-settlement risk and a rules-from-docs/bridge-cutover failure, not a cosmetic mismatch.
  Recommendation: Before enabling Nassau, remove the legacy `computeNassau` payout path or route
  Nassau payout aggregation through a Nassau bridge that threads `MatchState[]` hole-by-hole and
  consumes the typed engine events as the settlement source.

Next steps:
- Re-run the review in an environment where read-only shell commands work; the current sandbox
  fails with `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted` before `git diff`/`sed`
  can execute.
- Specifically inspect `src/lib/perHoleDeltas.ts`, `src/bridge/*`, `src/games/events.ts`, and
  Nassau state update paths before approving any Nassau unpark commit.
```

**Sandbox note:** The Codex agent's bubblewrap sandbox failed all shell commands (`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`). Codex could not run `git diff`, `sed`, or any filesystem reads. Its findings are based entirely on the framing prompt text, not on direct file inspection. This limits finding coverage — Codex could only surface issues referenced in the framing prompt, not ones requiring file reads.

---

## §2 Comparison Table

| Manual finding | Description | Codex status | Notes |
|---|---|---|---|
| F1 | `payouts.ts` handicap bypass (src/lib/handicap.ts) | MANUAL-ONLY | Codex sandbox blocked file reads |
| F2 | `roundStore.ts` handicap bypass | MANUAL-ONLY | Codex sandbox blocked |
| F3 | `setPress` stores game UUID, not Nassau match ID | MANUAL-ONLY | Codex sandbox blocked |
| F4 | `computeNassau`/`computeMatchPlay` bypass ScoringEvent emission | **AGREE** | Codex flagged `payouts.ts:52-116` as HIGH; matches F4 exactly |
| F5 | RoundingAdjustment not emitted for remainder > 0 | MANUAL-ONLY | Codex sandbox blocked |
| F6 | Bridge/aggregate MatchState consistency invariant | PARTIAL-AGREE | Codex noted "Nassau state update paths" in next-steps; did not produce a discrete finding |
| F7 | payouts.ts + perHoleDeltas.ts must be atomic at NA-1 | MANUAL-ONLY | Codex sandbox blocked |
| F8 | aggregate.ts stale phase comments | MANUAL-ONLY | Codex sandbox blocked |
| F9 | games/handicap.ts two-hop re-export chain | MANUAL-ONLY | Codex sandbox blocked |
| F10 | hydrateRound loses Nassau config fields on reload | MANUAL-ONLY | Codex sandbox blocked |

---

## §3 CODEX-ONLY Findings

None. Codex surfaced one finding (`payouts.ts:52-116` legacy Nassau dispatch) which maps to the existing manual F4. Codex did not introduce any finding not present in the manual audit.

---

## §4 Conflicts + Resolution

None. Codex's HIGH finding is fully consistent with manual F4 (ACCEPT). Codex's verdict ("no-ship for Nassau unparking") is correct for the current state and consistent with the plan: NA-1 is precisely the item that fixes this by replacing `computeNassau` dispatch with the bridge path. There is no conflict.

One phrasing difference worth noting: Codex framed this as "no-ship for Nassau unparking" but the plan already captures the gate — GAME_DEFS unpark happens within NA-1, not as a separate step. Once NA-1 lands, both the legacy dispatch is replaced AND the flag is removed in the same commit. The "no-ship" verdict is accurate for the pre-NA-1 state and anticipated by the plan.

---

## §5 Plan-Impact Assessment

**No plan changes required.**

The single Codex finding (F4 / legacy payouts dispatch) is:
1. Already identified in the manual audit as F4.
2. Already addressed by NA-1 (the bridge replaces `computeNassau` dispatch; NA-1 AC requires grep gate `case 'nassau'.*computeNassau` → zero matches after cutover).
3. Already in the NA-1 Fence (payouts.ts nassau case is an explicit in-scope file).

Codex's note about inspecting `src/lib/perHoleDeltas.ts` and `src/bridge/*` is addressed by:
- perHoleDeltas.ts: manual F7 (atomic commit gate) + NA-1 AC (explicit in-scope file)
- src/bridge/*: full bridge files were read in the manual audit

Codex's recommendation ("route Nassau payout aggregation through a Nassau bridge that threads MatchState[]") is exactly what NA-1 implements. No scope change needed.

**NA-pre-1 engineering is unblocked pending GM go-ahead.**

---

## Verify

- tsc: clean (no source changes)
- vitest: 441/441 (no source changes)
- Single commit: this report only

---

**Codex re-audit complete. No plan changes required. NA-pre-1 ready for GM go-ahead.**

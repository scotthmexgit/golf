---
prompt_id: 09
timestamp: 2026-05-01
checklist_item_ref: "Prompt 9 — Codex adversarial-review: project base (wide scope)"
tags: [audit, codex, adversarial-review, architecture, nassau, migration]
---

## §1 Codex Probe Outcome + Audit Method

**Probe result: SUCCEEDED.** Auth active (ChatGPT login, scotthmex@gmail.com), shared session runtime live at `unix:/tmp/cxc-H5mcxW/broker.sock`. Proceeding to full adversarial review.

**Audit method:** `codex adversarial-review --wait` on working-tree scope with the framing prompt supplied by GM (see Prompt 9). Codex performed 20 read-only tool calls across prisma/schema.prisma, src/app/api/rounds/, src/store/roundStore.ts, src/bridge/nassau_bridge.ts, src/lib/payouts.ts, src/lib/gameGuards.ts, src/components/scorecard/BetDetailsSheet.tsx, src/components/scorecard/WolfDeclare.tsx, src/types/index.ts, src/app/scorecard/[roundId]/page.tsx.

**Sanity check:** 454/454 tests pass, tsc clean (no source changes in this prompt).

---

## §2 Codex Output Verbatim

```
# Codex Adversarial Review

Target: working tree diff
Verdict: needs-attention

No ship. Nassau is live, but create/hydrate still silently discards per-bet configuration and state needed for correct settlement after reload; several UI settlement paths recompute from lossy data rather than a durable event log.

Findings:
- [critical] Round creation ignores per-game player membership and drops all game-specific config (src/app/api/rounds/route.ts:62-69)
  The wizard submits full `gameInstances`, but POST only accepts `{ type, stake, playerIds }` and then ignores `g.playerIds`, replacing every game's membership with all betting players. It also persists no fields for `pressRule`, `pressScope`, `pairingMode`, `loneWolfMultiplier`, `escalating`, match format, or hole format because the Game schema only has `type`, `stake`, and `playerIds`. Impact: a user can configure a two-player Nassau/Skins/Wolf subset or a non-default config, create the round successfully, and the persisted round will settle a different bet after hydration. This is immediate silent data corruption, not just a future JSON-column concern.
  Recommendation: Persist exact `g.playerIds` after validating they belong to the round, and add durable typed config persistence before allowing configurable games to ship. If using `Game.config Json?`, validate it with a per-game schema at POST and GET/hydrate boundaries and preserve a config version.

- [high] Hydration reverts live game behavior to defaults because GET and store rebuild only type/stake/playerIds (src/store/roundStore.ts:261-270)
  GET emits only `id`, `type`, `stake`, and `playerIds`, and `hydrateRound` rebuilds `GameInstance` with `defaultJunk(g.stake)` and no game-specific fields. The Nassau bridge then defaults missing `pressRule`, `pressScope`, and `pairingMode`; Wolf defaults `loneWolfMultiplier`; Skins defaults `escalating` in its bridge. Any non-default setup silently changes on reload. A JSON config blob would fix storage capacity but introduces type erasure unless the API validates and deserializes by game type instead of blindly casting into `GameInstance`.
  Recommendation: Round-trip a validated per-type config from Prisma through GET into `hydrateRound`; reject unknown/malformed config rather than defaulting. Add reload tests for Nassau press settings, pairing mode, Wolf multiplier, and Skins escalating.

- [high] Per-hole decision state is never persisted, so event replay after reload cannot reproduce the original round (src/app/api/rounds/[id]/scores/hole/[hole]/route.ts:66-90)
  Score persistence stores only gross/putts/fromBunker. `wolfPick`, Nassau `presses`, greenie/bango winners, and dot state live only in Zustand, while hydration rebuilds holes with just `scores` and default dots. The Wolf bridge explicitly reads `hd.wolfPick`, and Nassau opens presses from `hd.presses`; after reload these are absent, so Wolf declarations become `WolfDecisionMissing` and confirmed presses disappear. The settlement display then recomputes a different event stream from lossy data.
  Recommendation: Persist per-hole decision/event inputs or, preferably, persist typed `ScoringEvent`s as the settlement record. Hydrate `HoleData` from durable fields and add reload tests proving Wolf declarations and Nassau press confirmations survive.

- [medium] API converts failed round creation into a fake successful round ID (src/app/api/rounds/route.ts:75-79)
  On any POST failure, including validation or future config-deserialization failures, the API logs and returns `{ roundId: Date.now() }` with a 200 response. The client then stores that ID and navigates as if the round exists. This masks data loss, makes retries/idempotency impossible to reason about, and would hide JSON config migration failures exactly where correctness matters most.
  Recommendation: Return an error status on failed persistence and keep the user on the setup flow. Do not mint client-only IDs from the server route; if offline/client-only mode is desired, make it explicit and separate from persisted rounds.

- [medium] Match Play still routes through legacy payout math with no typed events or threaded bridge state (src/lib/payouts.ts:22-49)
  `computeGamePayouts` dispatches `matchPlay` to `computeMatchPlay`, which directly mutates payouts and uses legacy lib handicap helpers rather than the `src/games/match_play.ts` event-producing state machine. This violates the engine/event invariants the bridge pattern is supposed to enforce and shows the current Nassau-specific MatchState pattern is not yet reusable for Match Play without rework.
  Recommendation: Keep Match Play parked until it has a bridge analogous to Nassau that threads `MatchState`, emits/replays typed events, uses `src/games/handicap.ts`, and is the only payout path for `matchPlay`.

Next steps:
- Block shipment of Nassau persistence until game config and per-hole decision state round-trip through POST, GET, and `hydrateRound`.
- Add regression tests for create-time versus hydrate-time shape equality for each live game.
- Remove server-side fake round IDs and surface persistence failures as real API errors.
```

---

## §3 Findings Triage Table

| # | Finding | Severity | File:line | Triage | Baseline-comparison | Cross-reference |
|---|---|---|---|---|---|---|
| C1 | POST ignores `g.playerIds` + drops all game config | critical | `src/app/api/rounds/route.ts:62-69` | ACCEPT (medium practical risk; critical architectural risk) | NEW — manual audit noted config gap; playerIds-ignored aspect is new | GAME-CONFIG-JSON-MIGRATION; new checklist item API-GAME-PLAYERIDS-IGNORED |
| H1 | Hydration reverts game config to defaults on reload | high | `src/store/roundStore.ts:261-270` | ACCEPT | AGREE-WITH-BASELINE — this is the F10 audit finding driving NA-2 | GAME-CONFIG-JSON-MIGRATION |
| H2 | Per-hole decision state (wolfPick, presses, dots) not persisted | high | `src/app/api/rounds/[id]/scores/hole/[hole]/route.ts:66-90` | ACCEPT as observation; DEFER-TO-GM on scope | PARTIALLY NEW — wolfPick loss is a known limitation; framing it as blocking post-reload settlement replay (including Nassau presses) is new | New checklist item PER-HOLE-DECISION-STATE |
| M1 | POST failure returns fake round ID (Date.now()) instead of error | medium | `src/app/api/rounds/route.ts:75-79` | ACCEPT | NEW — the fallback was mentioned in code comments but not in prior audit | Known intentional trade-off; new checklist item or decision record |
| M2 | Match Play uses legacy `computeMatchPlay` not engine bridge | medium | `src/lib/payouts.ts:22-49` | ACCEPT — correctly identifies deferred state | AGREE-WITH-BASELINE — Match Play parked; `disabled: true` in GAME_DEFS | No new checklist item needed; Match Play phase will address |

---

## §4 Detailed Notes — HIGH and CONFLICT Items

### C1 — POST ignores `g.playerIds` (critical/medium practical)

Code confirmed at `route.ts:63-68`:
```typescript
create: (gameInstances || []).map((g: { type: string; stake: number; playerIds: string[] }) => ({
  type: g.type,
  stake: g.stake,
  playerIds: playerRecords
    .filter((_, i) => players[i]?.betting !== false)
    .map(pr => pr.id),
})),
```

The `g.playerIds` field in the TypeScript input type is accepted but never used. The code substitutes `playerRecords` filtered to betting players — for every game.

**Practical severity assessment:** The current wizard (`addGame` in `roundStore.ts`) always sets `playerIds` to all betting players — so the override produces the same result in practice. There is no per-game player-subset feature in the wizard yet. For current rounds, no data corruption occurs.

**Architectural severity:** Once the wizard gains per-game player selection (Nassau needs this for 3-player singles subsets, Wolf has 4–5 player required), this override will silently corrupt. The API type signature promises to accept `g.playerIds` but ignores it — a contract lie that will bite on the first per-game subset feature.

**Triage decision:** ACCEPT as MEDIUM practical risk (no current data corruption), HIGH architectural risk (blocks any per-game player-subset feature). File new checklist item.

### H2 — Per-hole decision state not persisted

The score PUT handler stores only `gross`, `putts`, `fromBunker`. Fields `wolfPick`, `presses`, `greenieWinners`, `bangoWinner`, and all dot fields (`sandy`, `chipIn`, `threePutt`, `onePutt`) are Zustand-only.

**Current impact:** The app's known limitation at PF-1 close states "results/bets/resolve pages render from Zustand only — cross-session viewing broken." This means per-hole decision state being transient is the intended current scope — settlement display works within the creating session.

**Nassau-specific escalation:** NA-1's Nassau bridge reads `hd.presses` for press confirmation. After reload, `hd.presses` is empty (not persisted) → Nassau bridge opens zero presses on any hydrated round → settlement can diverge from the original. This is NEW: the same architecture that was acceptable for Wolf (wolfPick missing → WolfDecisionMissing → zero delta per hole) is now dangerous for Nassau (presses missing → stake money is permanently wrong in the hydrated settlement).

**Triage decision:** ACCEPT severity escalation. The per-hole decision state gap is more critical for Nassau than Wolf. File explicit checklist item noting Nassau-specific severity. Scope requires persistence of `presses` at minimum (and `wolfPick` for correctness) — likely a column on Score or a separate HoleDecision table.

---

## §5 Pressure-Test Outcomes

### (a) Config persistence design — Option A vs Option B

Codex finding H1 directly addresses this. Key new insight:
> "A JSON config blob would fix storage capacity but introduces type erasure unless the API validates and deserializes by game type instead of blindly casting into `GameInstance`."

Codex recommends **validation at POST and GET/hydrate boundaries** and a `config version` field. This adds requirements to Option B:
- POST: validate `config` against a per-game-type schema before persisting
- GET: include `config` in response
- hydrateRound: per-type switch to deserialize, not blind cast

Option A (explicit String columns) avoids type erasure but requires per-field migrations. Option B with validation layer satisfies both the config persistence gap AND the type safety concern. **Option B remains recommended** but must include a validation layer.

### (b) Bridge pattern generalization to Match Play

Codex finding M2 confirms Match Play still uses `computeMatchPlay` (legacy lib, not engine bridge). The Nassau bridge's MatchState-threading pattern is architecturally correct for Match Play, but:

1. Match Play would need its own `matchplay_bridge.ts` — the Nassau bridge is not reusable as-is
2. `computeMatchPlay` in `payouts.ts` calls `strokesOnHole` directly (portability violation per ground rule #5 — handicap-in-one-place). A future Match Play bridge would fix this
3. Match Play is `disabled: true` in GAME_DEFS so no immediate risk, but this confirms the pattern requires a distinct bridge per game type, not a generic one

**Conclusion:** Nassau bridge generalizes cleanly to Match Play because both thread `MatchState[]` — but Match Play needs its own bridge, not a rework of nassau_bridge.ts. The NA-1 pattern is the template.

### (c) API silent data loss

Two confirmed gaps:
1. **`g.playerIds` ignored at POST** (C1) — game-specific player membership replaced with all betting players. Not currently corrupting, will corrupt on first per-game subset feature.
2. **Game config dropped at POST** (C1/H1) — `pressRule`, `pressScope`, `pairingMode`, `loneWolfMultiplier`, `escalating` never reach DB. The F10 migration fixes this.
3. **POST failure → fake round ID** (M1) — silent data loss masked as success.

**Not confirmed by Codex:** The manual audit (Prompt 3) found F3 (`setPress` stores game UUID not match ID). Codex didn't surface this finding — likely because it's in roundStore.ts store state logic rather than the persistence layer. F3 is still valid; unaddressed.

### (d) hydrateRound silent revert paths

Codex H1 confirms all game-specific fields revert on reload. Beyond the F10 gap:
- `junk` always rebuilt from `defaultJunk(g.stake)` — any custom junk config (e.g., greenie enabled at custom stake) is lost
- `pressAmount` (optional on GameInstance) — not persisted, not hydrated
- `escalating` (Skins) — not persisted; `buildSkinsCfg` defaults to `false`
- `loneWolfMultiplier` (Wolf) — not persisted; `buildWolfCfg` defaults to `2`

All of these silently change settlement after reload. The config Json? migration, applied to all game types, addresses all of them.

### (e) UI event consumption

Codex checked BetDetailsSheet.tsx and scorecard page. Key findings:
- BetDetailsSheet computes settlement display from `computeAllPayouts` (Zustand store state → bridge → events). Events are not cached or logged in the UI; every render is a full recompute.
- After reload: missing `wolfPick`, missing `presses` → different event stream → different dollar amounts displayed. This is the per-hole decision state gap (H2) from a UI perspective.
- No untyped event consumption paths found — events flow through the typed bridge return values. The gap is data loss upstream (not persisted), not a type-unsafe consumption pattern in the UI.

---

## §6 Migration Design Implications

Codex findings add two requirements to the Option B migration:

1. **Validation layer required.** Option B (`config Json?`) must include per-type validation at POST (reject unknown config) and per-type deserialization at GET/hydrateRound (don't cast blindly). The migration prompt must specify this.

2. **playerIds fix included.** The POST route's `g.playerIds` override (C1) should be fixed in the same migration prompt to use the wizard-supplied `g.playerIds` (after validating they belong to the round). This prevents the architectural debt from widening.

3. **Per-hole decision state is a separate scope.** Persisting `presses`, `wolfPick`, greenie/bango winners requires a HoleData-side migration (new columns on `Score` or a separate table), not just `Game.config`. This is a larger scope item than the config migration; file as a separate checklist item and defer to a later phase.

**Option B remains the recommendation.** The validation-layer requirement is additive to Option B, not a reason to prefer Option A.

**Revised migration scope for NA-2 prerequisite prompt:**
```
1. Add Game.config Json? (migration: add_game_config_json)
2. POST /api/rounds: (a) use g.playerIds from wizard (not override); (b) write config blob from wizard GameInstance
3. GET /api/rounds/[id]: include config in games serialization
4. hydrateRound: per-type deserialization with defaults matching buildNassauCfg/buildWolfCfg/buildSkinsCfg
5. tsc + 454 tests pass
```
The fake-round-ID fallback (M1) should be addressed in this prompt or a targeted hardening prompt — it masks validation failures that the migration introduces.

---

## §7 Recommended IMPLEMENTATION_CHECKLIST.md Additions

New items to file:

1. **API-GAME-PLAYERIDS-IGNORED** — `POST /api/rounds:route.ts:66-68` accepts `g.playerIds` in the TypeScript type but ignores it, substituting all betting players. No current data corruption (wizard uses all betting players). Architectural risk: first per-game player-subset feature will silently corrupt. Fix: use wizard-supplied `g.playerIds` after membership validation. Scope: fold into config migration prompt (same change, same commit). — 2026-05-01 — Codex adversarial-review C1

2. **PER-HOLE-DECISION-STATE** — wolfPick, presses (Nassau), greenieWinners, bangoWinner, dot fields persist only in Zustand. After round reload, Wolf settlement shows WolfDecisionMissing deltas; Nassau settlement omits confirmed presses. Settlement display can diverge from original round values. Requires per-hole decision persistence (new columns on Score table or separate HoleDecision table). Scope: larger than config migration; separate phase. Nassau press survival is the P1 case (affects money outcomes). — 2026-05-01 — Codex adversarial-review H2

3. **POST-FAKE-ROUNDID-FALLBACK** — `POST /api/rounds:route.ts:75-79` returns `{ roundId: Date.now() }` with HTTP 200 on Prisma failure. Masks data loss as success; hides config migration failures. Decision needed: fail-hard (return 500) vs offline-first explicit mode. For migration safety, recommend fail-hard. — 2026-05-01 — Codex adversarial-review M1

Cross-reference existing items confirmed by Codex:
- GAME-CONFIG-JSON-MIGRATION (filed NA-2) — confirmed H1
- F3/PL-1 setPress semantic mismatch — NOT surfaced by Codex (still valid from manual audit; no change)

---

**Codex audit complete. §6 migration implications: Option B (`config Json?`) remains recommended, but migration prompt must include (1) validation layer at POST/GET/hydrate boundaries, (2) fix for `g.playerIds` override in POST, and (3) fake-round-ID fallback decision. Per-hole decision state persistence (wolfPick, presses) is a separate larger scope item. Awaiting GM review before migration prompt.**

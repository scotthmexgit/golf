#5 Nassau engine: Phase 1 pair-wise scoring + Phase 2 Turn 1 press semantics

- nassau.ts (new): MatchState and PressConfirmation types;
  NassauConfigError and NassauBetNotFoundError error classes;
  initialMatches (constructs the three base matches — front/back/
  overall — from cfg); settleNassauHole (pair-wise USGA holeResult,
  threads MatchState[] across holes, emits NassauHoleResolved events);
  offerPress and openPress (Phase 2 Turn 1 — press offer/acceptance
  logic with parentId threading and endOfCurrent9Leg scope
  calculation); finalizeNassauRound (Phase 3 stub, returns []).
- nassau.test.ts (new): 23 tests covering Phase 1 per-hole scoring
  (singles, handicap allocation, NassauHoleResolved events, bet-not-
  found error path) and Phase 2 Turn 1 press semantics (offerPress
  two-down trigger, openPress match creation, press scope, nested
  presses, error paths).
- types.ts: delete NassauCfg.matchTieRule field (closes audit #19 —
  field had a type/doc mismatch with no consumers in the new engine).

Nassau's settleNassauHole takes an explicit MatchState[] argument and
returns { events, matches } rather than the simpler (hole, cfg,
roundCfg) => ScoringEvent[] signature used by Skins, Wolf, and Stroke
Play. This divergence (I2 decision) reflects Nassau's genuine
structural state: press matches are created mid-round via openPress,
and threading them explicitly through every hole call is the honest
interface — reconstructing them from the event log on every call
would be both slower and more brittle. The matchTieRule field is
removed because the Nassau engine resolves halved matches through
the existing MatchTied event path; a config knob for a single legal
value ('split') was unnecessary and the source of audit #19's
type/doc mismatch.

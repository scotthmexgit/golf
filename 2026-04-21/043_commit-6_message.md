#5 Phase 2 Turn 2: press composition test coverage

- Block A — § 10 Worked Example, full 18-hole integration with auto-2-down press:
  offerPress + openPress inject press-1 after hole 11 (back A 2–0 triggers threshold);
  settleNassauHole runs holes 12–18 with press-1 active alongside back and overall.
  Asserts back A 4–3, press-1 B 3–2, overall A 8–6 per § 10 table; exactly one
  PressOpened event (actor B, hole 11, parentMatchId = back); zero PressOpened on
  front or overall. 5 tests.

- Block B — § 12 Test 2, manual press refused: same 18-hole gross scores, pressRule
  = 'manual', openPress never called. Asserts three MatchStates only (no press-1),
  zero PressOpened events, back A 4–3 (base match unaffected by absent press). 2 tests.

- Block C — press scoring unit proof: openPress injects press-1 (back parent, nine
  scope, startHole = 13); settleNassauHole runs holes 13 and 14; asserts press-1 and
  back match each increment for both results (A wins 13, B wins 14). 1 test.

Turn 2 is test-additive only — engine code (offerPress, openPress, settleNassauHole's
MatchState[] iteration) was complete at commit 4 (Phase 2 Turn 1 landing). The
interleaving-sequence pre-flight returned engine-changes-none; Turn 2 validates that
finding empirically. Block A proves Phase 1 + Phase 2 compose correctly across a full
§ 10 run at integration level. Block B establishes the negative-case invariant: no
openPress call leaves the match list unchanged regardless of pressRule. Block C is the
unit-level proof that settleNassauHole iterates press MatchStates alongside their parent.
128 tests, 7 files.

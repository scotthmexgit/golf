# Rule-file defects

Files reviewed: `game_junk.md`, `game_skins.md`, `game_wolf.md`, `game_nassau.md`, `game_stroke_play.md`, `game_match_play.md`, `_ROUND_HANDICAP.md`, `_FINAL_ADJUSTMENT.md`.

---

## Severity classification

- **S1** — Internally contradictory; two sections of the same rule file disagree. Cannot implement both.
- **S2** — Ambiguous or underspecified; implementation requires a guess or assumption.
- **S3** — Minor wording issue, stale reference, or low-stakes inconsistency. Unlikely to cause bugs.

---

## game_junk.md

### J-1 (S1) — §5/§6 Sandy/Barkie/Polie/Arnie signature conflict

§5 detection functions return `PlayerId | null` with `candidates.length === 1 ? candidates[0] : null` (null on ties).
§6 settlement row for Sandy/Barkie/Polie/Arnie: "All tied winners collect."

These two sections are mutually exclusive. If §5 is implemented as written, §6 cannot be honored.
See `investigation-01` and `investigation-02` for full analysis and options.

### J-2 (S1) — §5/§12 Longest Drive tie conflict with HoleState

§6 says "split evenly among tied winners" for Longest Drive. §12 Test 5 tests tied LD (w=2).
`HoleState.longestDriveWinner: PlayerId | null` can hold only one player; tied LD cannot be represented.
Implementation of §6/§12 requires a type change.

### J-3 (S2) — §4 ctpTieRule required vs. optional in types

Rule file §4 shows `ctpTieRule` as a required field of `JunkRoundConfig`.
`types.ts` declares it optional (`ctpTieRule?: ...`).
No default is documented in the rule file. Behavior when `ctpTieRule` is absent is undefined.

### J-4 (S3) — §5 field names diverge from types.ts

Rule file uses `declaringBets` and `bettors`; types.ts uses `bets` and `participants`.
No logic error — same data under different names — but doc-to-code reconciliation is required.

---

## game_skins.md

### SK-1 (S1) — §6 "four modes" vs. three-row table

§6 text: "Skins supports four tie modes."
§6 table: three rows — carryover, split, no-points.

Fourth mode is either unnamed/undocumented, or the sentence is wrong. Cannot implement "four modes" without knowing what the fourth is.

---

## game_wolf.md

### W-1 (S1) — §4 WolfConfig missing tieRule field

§6: "tieRule is a field on WolfConfig (defaults to no-points)."
§4 WolfConfig definition: `tieRule` field absent.

Two sections of the rule file are inconsistent. The field exists per §6 but is not defined in the config table in §4.

### W-2 (S1) — §12 Test 6 contradicts generic rotation + §9 reservation

§12 Test 6: asserts that money-tiebreak causes player B to be captain for hole 17.
§9: "WolfCaptainTiebreak is reserved — not yet implemented."
Generic captain rotation for four players with hole 17: captain = player index ((17-1) % 4) = player 0 = A (by standard ordering).

Test 6 asserts B; generic rotation gives A; §9 says the tiebreak that would give B is reserved/not implemented.
This test cannot pass under the current rule set. Either §9 should be un-reserved, or the test is wrong.

---

## game_nassau.md

### N-1 (S2) — §6 references deleted matchTieRule field

§6: "For tied matches, tieRule = 'split' applies."
Audit #19 (commit d4bddb3): `matchTieRule` field was deleted from `NassauConfig`.

The rule file still references a config field that no longer exists in types.ts. Either:
(a) the field was deleted incorrectly and should be restored, or
(b) §6 should be updated to document that tie behavior is now hardcoded to 'split'.

---

## game_stroke_play.md

### SP-1 (S2) — §4 stakePerStroke default violates integer-unit invariant

§4: "stakePerStroke — default equals stake / 10."
If stake is not divisible by 10, `stake / 10` is not an integer.
AGENTS.md rule 2: integer-unit math only; no Float in scoring.

Rule file must be updated: either document that stakePerStroke is always set explicitly (no default), or document the rounding rule (floor? round? explicit error?).

---

## game_match_play.md

### MP-1 (S3) — §5 pseudocode hardcodes 18 instead of cfg.holesToPlay

§5 pseudocode: `const holesRemaining = 18 /* or cfg.holesToPlay */ - next.holesPlayed`

The comment acknowledges the issue but the hardcoded 18 is the active code. If `cfg.holesToPlay` exists (e.g., 9-hole match), the engine produces wrong results. Minor because the comment flags it, but the rule file should specify definitively.

---

## _ROUND_HANDICAP.md and _FINAL_ADJUSTMENT.md

No defects found. These files are internally consistent and do not contradict any game file.

---

## Defect summary

| ID   | File            | Severity | Short description                          |
|------|-----------------|----------|--------------------------------------------|
| J-1  | game_junk.md    | S1       | §5/§6 Sandy/Barkie/Polie/Arnie tie conflict|
| J-2  | game_junk.md    | S1       | §5/§12 LD tie vs HoleState single-player   |
| J-3  | game_junk.md    | S2       | ctpTieRule required vs optional, no default|
| J-4  | game_junk.md    | S3       | declaringBets/bettors naming drift          |
| SK-1 | game_skins.md   | S1       | §6 "four modes" but table has three        |
| W-1  | game_wolf.md    | S1       | §4 WolfConfig missing tieRule field        |
| W-2  | game_wolf.md    | S1       | §12 Test 6 contradicts §9 reservation      |
| N-1  | game_nassau.md  | S2       | §6 references deleted matchTieRule         |
| SP-1 | game_stroke_play.md | S2  | stakePerStroke default may be non-integer  |
| MP-1 | game_match_play.md  | S3  | §5 hardcodes 18 instead of cfg.holesToPlay |

**4 S1 defects across 4 game files. Each requires a rule-file decision before the affected engine section can be implemented.**

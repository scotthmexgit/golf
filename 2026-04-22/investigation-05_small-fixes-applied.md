# Small fixes applied during overnight investigation

Scope: read-only investigation. No code changes, no rule-file edits, no commits.

---

## Fixes applied

None.

---

## Reason

Every candidate fix encountered during the investigation was blocked by one of:

1. **Requires a user decision** (J-1, J-2: multi-winner signature shape; SK-1: fourth skins mode; W-1/W-2: Wolf tieRule/Test-6; N-1: matchTieRule deleted vs. restored; SP-1: stakePerStroke rounding rule).
2. **Out of scope for this investigation** — the investigation task was read-only; no go-ahead was given for edits.

No fix was small enough to apply safely without a decision or without risking scope creep into the active checklist item.

---

## Fixes deferred to Parking Lot

These should be added to `IMPLEMENTATION_CHECKLIST.md` Parking Lot after the user reviews this document set. Candidate entries (user to approve before adding):

- `[ ] game_junk.md: resolve §5/§6 Sandy/Barkie/Polie/Arnie signature conflict (J-1, J-2) — 2026-04-22`
- `[ ] game_junk.md: document ctpTieRule default (J-3) — 2026-04-22`
- `[ ] game_junk.md: align declaringBets/bettors naming (J-4) — 2026-04-22`
- `[ ] game_skins.md: identify or remove fourth tie mode (SK-1) — 2026-04-22`
- `[ ] game_wolf.md: add tieRule to §4 WolfConfig (W-1) — 2026-04-22`
- `[ ] game_wolf.md: resolve §12 Test 6 vs §9 reservation (W-2) — 2026-04-22`
- `[ ] game_nassau.md: update §6 for deleted matchTieRule or restore field (N-1) — 2026-04-22`
- `[ ] game_stroke_play.md: specify stakePerStroke rounding rule (SP-1) — 2026-04-22`
- `[ ] game_match_play.md: replace hardcoded 18 with cfg.holesToPlay in §5 pseudocode (MP-1) — 2026-04-22`

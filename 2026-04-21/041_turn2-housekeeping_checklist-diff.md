# IMPLEMENTATION_CHECKLIST.md diff preview — Turn 2 housekeeping

## Parking-lot entries

**Already written — no action needed.** Both entries (option-c back-log deviation +
skill-amendment-needed) were added to the Parking Lot section earlier today and confirmed
via cat-through-bash at that time. The diff below does NOT add them again.

---

## Staleness flag: Design timeline row

Line 19:
```
| 3. Targeted rebuild (#3–#8: ...) | TBD | active (starting with #3) |
```

`starting with #3` is historical — #3 and #4 are now closed, #5 is active on Phase 3 next.
The status column value `active` is still correct. Proposing to leave the sub-note as-is
(it records when this phase opened, not a live directive). If you want it updated to
`active (#5 in progress, Phase 3 next)`, approve separately and I'll include it.

---

## Changes

### Change 1 — Phase 2 row (line 43) → two closed rows

**Remove (line 43):**
```
- [ ] Phase 2 — Press handling — not started (2 turns pre-approved at prompt 012).
```

**Insert (two rows in its place):**
```
- [x] Phase 2 Turn 1 — `offerPress` + `openPress` + press composition — closed 2026-04-21 at commit 4 (d4bddb3). 13 tests added; 120 total pass.
- [x] Phase 2 Turn 2 — Integration coverage (§ 10 full 18-hole, manual press refused, press scoring unit) — closed 2026-04-21 at commit 6 (TBD — hash filled after commit 6 lands). 8 tests added; 128 total pass.
```

### Change 2 — Status line (line 47)

**Remove:**
```
**Status**: #5 **Active**, Phase 1 **complete**. Phase 2 is the next sub-step; user approval required to begin. #5 does not close until all 4 phases land.
```

**Insert:**
```
**Status**: #5 **Active**, Phase 2 **complete**. Phase 3 (finalization + settlement) is the next sub-step. #5 does not close until all 4 phases land.
```

---

## No other changes

All other sections confirmed current:
- Phase 1 row: correct (closed 2026-04-20 at prompt 013; 10 tests; 107 total).
- Phase 3 row: correct (not started — Phase 3 scope is `finalizeNassauRound`).
- Phase 4 row: correct (not started; grep gate preconditions still apply).
- Design timeline: "active" status correct; sub-note staleness flagged above.
- Done section: #1–#4 all correct.
- Parking Lot: 8 entries, all current. Option-c entries already present.
- Deferred / won't-do: unchanged.

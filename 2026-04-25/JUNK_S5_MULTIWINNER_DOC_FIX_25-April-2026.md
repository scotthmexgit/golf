# Junk §5 Multi-Winner Doc Fix — 2026-04-25

**Role:** Documenter  
**Prompt scope:** Fix §5 pseudocode in `docs/games/game_junk.md` so Sandy, Barkie, Polie, and Arnie return `PlayerId[] | null`, matching § 6 ("all tied winners collect"). No code changes; no plan edits.

---

## What was done

Updated `docs/games/game_junk.md` §5 pseudocode. Six functions changed:

| Function | Old return type | New return type | Old body | New body |
|---|---|---|---|---|
| `isLongestDrive` | `PlayerId \| null` | `PlayerId[] \| null` | `state.longestDriveWinner ?? null` | `winners = state.longestDriveWinners; length > 0 ? winners : null` |
| `isSandy` | `PlayerId \| null` | `PlayerId[] \| null` | `candidates.length === 1 ? candidates[0] : null` | `candidates.length > 0 ? candidates : null` |
| `isBarkie` | `PlayerId \| null` | `PlayerId[] \| null` | same pattern | same fix |
| `isPolie` | `PlayerId \| null` | `PlayerId[] \| null` | same pattern | same fix |
| `isArnie` | `PlayerId \| null` | `PlayerId[] \| null` | same pattern | same fix |
| `resolveJunkWinner` | `PlayerId \| null` | `PlayerId \| PlayerId[] \| null` | no guard comment | added guard comment; do-not-regress note |

Added inline comment to `settleJunkHole` noting Phase 1–2 single-winner calling pattern and that Phase 3 engineering extends it.

Added multi-winner invariant blockquote after the code block (§5 footnote, task item 6).

**`isLongestDrive` note:** The doc's LD pseudocode was also using the outdated single-winner form (`longestDriveWinner` singular, `PlayerId | null`), diverging from the actual implementation (`junk.ts:37`, `longestDriveWinners` plural, `PlayerId[] | null`). Fixed in this same pass as the same class of doc-code divergence. Noted here; not a separate task.

---

## §6 authoritative text (quoted for confirmation)

From `game_junk.md` §6 tie-handling table, Sandy/Barkie/Polie/Arnie row:

> "All tied winners collect. With `N` bettors and `w` tied winners, each winner's points = `N − w`, each loser's points = `−w`. Σ = `w × (N − w) + (N − w) × (−w) = 0` — zero-sum holds."

§6 was correct before this edit and required no changes. ✓

---

## §10 and §12 verification

**§10 (worked example):** Uses `junkItems = ['greenie']` only (CTP + Greenie scenario, hole 4 par 3). No Sandy, Barkie, Polie, or Arnie appear anywhere in §10. Old single-winner assumption not present. **Not modified.** ✓

**§12 (test cases):** Tests 1–5 cover CTP, Greenie, GIR toggle OFF, non-bettor CTP, and Tied Longest Drive. None of the five test cases assert single-winner-only behavior for Phase 3 items; the Phase 3 items have no §12 test cases at all (Phase 3 engineering is parked). **Not modified.** ✓

---

## Engine lag note

`src/games/junk.ts` Phase 3 stubs (`isSandy`, `isBarkie`, `isPolie`, `isArnie`) still return `null` via `// #7b — rules pass pending`. The doc now specifies `PlayerId[] | null`; the implementation has not changed. This mismatch is **acceptable** — Phase 3 is parked. The doc is authoritative; when Phase 3 engineering enters scope, the stubs must be replaced with `PlayerId[] | null` implementations, not `PlayerId | null`. The `resolveJunkWinner` guard comment added in this edit documents this expectation.

---

## Post-edit grep verification

```
grep -n "PlayerId\[\] | null\|candidates\.length > 0\|candidates\.length === 1\|longestDriveWinner\b" docs/games/game_junk.md
```

Results:
- Line 94: `isLongestDrive` → `PlayerId[] | null` ✓
- Line 119: `isSandy` → `PlayerId[] | null` ✓
- Line 127: `return candidates.length > 0 ? candidates : null` ✓
- Line 130: `isBarkie` → `PlayerId[] | null` ✓
- Line 139: `return candidates.length > 0 ? candidates : null` ✓
- Line 142: `isPolie` → `PlayerId[] | null` ✓
- Line 152: `return candidates.length > 0 ? candidates : null` ✓
- Line 155: `isArnie` → `PlayerId[] | null` ✓
- Line 167: `return candidates.length > 0 ? candidates : null` ✓
- Line 171: `resolveJunkWinner` guard comment ✓
- Line 177: `resolveJunkWinner` return type `PlayerId | PlayerId[] | null` ✓
- Line 192: multi-winner invariant note ✓
- `candidates.length === 1` — **zero hits** (old single-winner pattern gone) ✓
- `longestDriveWinner\b` (singular) — **zero hits** (old singular field reference gone) ✓

---

## Noticed but out of scope

1. `game_junk.md §11` line 248: `JunkAwarded` event schema shows `winner` (singular) in the shape comment: `{ kind, timestamp, hole, actor, declaringBet, junk, winner, points }`. With multi-winner Phase 3 items, the `winner` field in the event payload will need updating to `winners: PlayerId[]` (matching the actual `events.ts` schema where `JunkAwarded.winners: PlayerId[]` was introduced in #7 Phase 2). Not touched in this prompt — §11 is implementation notes and the field name is a separate concern.

2. `game_junk.md §4` points formula uses `N − 1` for a single winner: `event.points[w] = N − 1`. With multi-winner (w tied winners), the formula is `N − w` per winner. §4 only documents the single-winner formula. This inconsistency with §6's `N − w` formula predates this pass. Not touched — §4 fix is a separate concern.

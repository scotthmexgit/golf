# §5/§6 reconciliation — per-kind analysis

Source: `docs/games/game_junk.md`

---

## Method

For each junk kind: compare the §5 detection-function return shape against §6 settlement semantics.
A **Class A** contradiction: §5 returns null on ties, §6 says tied winners all collect.
A **Class B** contradiction: the *data source* for the winner can hold only one player, but §6 implies multi-winner payout.
**Agreement**: §5 and §6 are consistent; no signature change needed.

---

## CTP

**§5 shape**: `PlayerId | null`
- null when ctpEnabled false, hole.par ≠ 3, or hole.ctpWinner is null
- tie resolution delegated to `ctpTieRule` config ('groupResolve' | 'carry'); isCTP itself returns the resolved single winner or null

**§6 settlement**: CTP row — "winner collects from all others in the bet"; no multi-winner language

**Verdict**: Agreement. Single-winner dispatch is correct for CTP. `ctpTieRule` handles ties upstream; by the time isCTP returns, there is one winner or none.

---

## Greenie

**§5 shape**: `PlayerId | null` — derived from isCTP result; additionally requires gross[winner] ≤ par

**§6 settlement**: Greenie row — no multi-winner language; same single-winner semantics as CTP

**Verdict**: Agreement. Single-winner dispatch correct.

---

## Longest Drive

**§5 shape**: `PlayerId | null`
- returns `hole.longestDriveWinner ?? null`
- `HoleState.longestDriveWinner: PlayerId | null` — typed as single player

**§6 settlement**: "split evenly among tied winners" — explicitly multi-winner

**§12 Test 5**: Tests tied LD with two winners (w=2), expecting each to receive split points

**Verdict**: **Class B contradiction.**
- §5/§6 mismatch: §5 function cannot return more than one winner because `HoleState.longestDriveWinner` can hold only one `PlayerId`.
- Data model mismatch: `HoleState.longestDriveWinner` must be changed to `PlayerId[]` (or `PlayerId | null` with tie rule) to support §6 and §12 Test 5.
- `isLongestDrive` signature must change simultaneously with the type change.
- `pushAward` (single-winner) cannot be reused for tied LD; multi-winner settlement logic needed.

---

## Sandy

**§5 shape**: `PlayerId | null`
- `candidates = players who visited bunker on this hole AND made par or better`
- `return candidates.length === 1 ? candidates[0] : null`
- null for 0 candidates (no award) and for 2+ candidates (tie — suppressed)

**§6 settlement**: "All tied winners collect"

**Verdict**: **Class A contradiction.**
- §5 explicitly suppresses multi-candidate case (returns null).
- §6 explicitly requires all tied candidates to collect.
- Cannot implement §6 using the §5 function as written without changing either the return shape or the dispatch logic.

---

## Barkie

**§5 shape**: `PlayerId | null`
- `candidates = players with a birdie or better who visited a bunker`
- `return candidates.length === 1 ? candidates[0] : null`

**§6 settlement**: "All tied winners collect"

**Verdict**: **Class A contradiction.** Identical structure to Sandy.

---

## Polie

**§5 shape**: `PlayerId | null`
- `candidates = players who made the hole in the designated number of putts or fewer`
- `return candidates.length === 1 ? candidates[0] : null`

**§6 settlement**: "All tied winners collect"

**Verdict**: **Class A contradiction.** Identical structure to Sandy.

---

## Arnie

**§5 shape**: `PlayerId | null`
- `candidates = players who made par or better without being in the fairway on par-4/5`
- `return candidates.length === 1 ? candidates[0] : null`

**§6 settlement**: "All tied winners collect"

**Verdict**: **Class A contradiction.** Identical structure to Sandy.

---

## Summary table

| Kind         | §5 return type     | §6 semantics           | Verdict          |
|--------------|--------------------|------------------------|------------------|
| CTP          | PlayerId\|null      | Single winner          | Agreement        |
| Greenie      | PlayerId\|null      | Single winner          | Agreement        |
| Longest Drive| PlayerId\|null      | Split among tied       | Class B conflict |
| Sandy        | PlayerId\|null      | All tied collect       | Class A conflict |
| Barkie       | PlayerId\|null      | All tied collect       | Class A conflict |
| Polie        | PlayerId\|null      | All tied collect       | Class A conflict |
| Arnie        | PlayerId\|null      | All tied collect       | Class A conflict |

**5 of 7 kinds have a §5/§6 conflict.** CTP and Greenie are the only conflict-free kinds.

---

## Blocking impact on Turn 4 (isSandy)

Phase 2 (write the failing test) cannot proceed until the signature decision is made.
The test fixture must reflect the expected function signature:
- If `isSandy` returns `PlayerId | null` (null on ties), the tied-winner test must assert `null`.
- If `isSandy` returns `PlayerId[]`, the tied-winner test must assert a two-element array.
- If `isSandy` returns `PlayerId | null` but dispatch is per-candidate, the test must match that shape.

See `investigation-02` for the decision space.

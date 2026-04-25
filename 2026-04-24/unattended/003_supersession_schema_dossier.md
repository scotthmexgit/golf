# Pass 3 — Supersession schema design dossier

Date: 2026-04-24  
Status: COMPLETE — no halt (no undiscovered consumers found)

---

## 1. Current state

### `ScoringEventLog.supersessions` (types.ts:192)

```typescript
export interface ScoringEventLog {
  events: ScoringEvent[]
  supersessions: Record<EventId, EventId>
}
```

Maps `supersededEventId → supersedingEventId`. The intent: "event with id X has been replaced by event with id Y." Both are `EventId` (= `string`).

### `EventBase` (events.ts:12–16)

```typescript
interface EventBase {
  timestamp: string
  hole: number | null
  actor: PlayerId | 'system'
}
```

**No `id` field.** Events have no identity beyond position in `log.events[]`.

### `EventId` type (types.ts:18)

```typescript
export type EventId = string
```

Not attached to any event variant. Used only in `ScoringEventLog.supersessions`.

### Writer / consumer audit

Grep: `grep -rn "supersession" /src/ --include="*.ts"`

Non-test source files:
- `types.ts:192` — declaration (field definition)
- `aggregate.ts:332` — comment: `"Supersession filter is deferred — log.supersessions is not consumed here."`

Test files:
- `aggregate.test.ts:11` — comment: `"Former Test 4 (supersession filter) — filter removed (Option C: deferred to schema pass)"`
- `aggregate.test.ts:21, 132, 169, 343, 408, 470, 532, 667, 705, 750, 801, 836, 953, 1011, 1073, 1143, 1196, 1452, 1602` — all set `supersessions: {}` (empty, never populated)

**Zero writers in non-test source.** All test uses are `supersessions: {}` — required by the type, never used.

---

## 2. Three options in detail

### Option A — Add `id: EventId` to EventBase

**Change**: Extend `EventBase` in `events.ts:12`:
```typescript
interface EventBase {
  id: EventId       // new
  timestamp: string
  hole: number | null
  actor: PlayerId | 'system'
}
```

Every event construction site must add `id:`. The `supersessions` map works directly (maps known id → known id).

**Emit site count**: Grep of `kind:` assignments in non-test engine files (nassau.ts, match_play.ts, stroke_play.ts, skins.ts, wolf.ts, junk.ts, aggregate.ts) returns 69 lines. Removing type-annotation and parameter lines, actual event object constructions are approximately **57 sites** across 6 engine files.

- nassau.ts: ~9 emit sites (PressOffered, PressOpened, PressVoided, NassauHoleForfeited, MatchClosedOut×2, NassauHoleResolved, NassauWithdrawalSettled, MatchTied, MatchClosedOut)
- match_play.ts: ~12 emit sites
- stroke_play.ts: ~19 emit sites
- skins.ts: ~7 emit sites
- wolf.ts: ~6 emit sites
- junk.ts: ~4 emit sites

**Test construction sites**: aggregate.test.ts hand-builds event objects in fixtures (19 call sites visible in grep). nassau.test.ts, match_play.test.ts, stroke_play.test.ts each build events manually. Rough total: ~100+ test construction sites across all test files.

**Determinism concern**: If IDs use `crypto.randomUUID()`, tests become non-deterministic unless UUID generation is mocked or seeded. Alternatively, a simple counter (`let _seq = 0; () => String(_seq++)`) could be used in tests but would not be cryptographically unique in production.

**Cost: HIGH.** ~57 engine files + ~100+ test file changes. Introduces UUID dependency at every emit site.

---

### Option B — Redesign supersessions as index-based

**Change**: Replace `Record<EventId, EventId>` with an index-based structure:

Sub-option B1: `supersessions: Array<[number, number]>` — pairs of [superseded-index, superseding-index]
Sub-option B2: `supersessions: Record<number, number>` — same as above as a map

**Advantages**:
- No per-event id needed. Events referenced by position in `log.events[]`.
- Minimal change: only types.ts and aggregate.ts's filter logic (when implemented).
- Zero emit-site changes.

**Disadvantages**:
- **Fragile**: index references break on log.events array insertion or deletion. An append-only event log is stable (new events go to end), but any log manipulation (compaction, event removal) invalidates higher indices.
- **Hard to reason about**: `[3, 7]` means "event at index 3 is superseded by event at index 7" — requires scanning the array to find the events. Not self-documenting.
- **Write-side problem unchanged**: whoever writes supersessions still needs to know the index of the superseded event at emit time. If events are constructed in-memory and only later assigned positions (e.g., by a batch insert), the writer may not have stable indices.

**Cost: MEDIUM.** Only types.ts change + aggregate.ts filter logic when implemented. But design fragility is meaningful.

---

### Option C — Remove supersessions entirely

**Change**: Delete `types.ts:192`:
```
  supersessions: Record<EventId, EventId>
```

**Downstream changes**:
- All ~19 test fixtures with `supersessions: {}` become type errors → remove field from each
- `aggregate.ts:332` comment becomes stale → delete
- `EventId` type (types.ts:18) becomes unused → delete or retain for future use

**Cost: VERY LOW.** 1 field deletion + ~19 test fixture updates (each a 1-line deletion). `EventId` type deletion is optional (dead type, no harm keeping it).

**Risk**: If supersession correction is needed in the future, schema design starts from scratch. No sunk cost.

---

## 3. Use case analysis — what triggers supersessions being needed?

No feature in v1 roadmap requires event supersession. Stated use cases are hypothetical:

- **Mid-round score correction**: player entered wrong gross on hole 3. Correction emits a new event that supersedes the wrong one. The reducer should apply the correction, not the original.
- **Admin data fix**: back-office correction after round close.

Neither use case is in scope before v1 ships. The field was added speculatively.

**Alternative correction mechanism**: For end-of-round corrections, `FinalAdjustmentApplied` provides an additive (layering) correction without requiring event IDs. For mid-round corrections, a "replace whole log" approach (re-emit the corrected log) would also work, though less surgical.

---

## 4. `_FINAL_ADJUSTMENT.md` cross-check

`_FINAL_ADJUSTMENT.md §7` defines `AdjustmentApproved`:

```
{ kind, timestamp, hole: null, actor: roleHolder, proposalId, appliedEventId }
```

`appliedEventId` references the `FinalAdjustmentApplied` event that was created when the proposal was approved. This is a cross-reference between two specific event types — not a general supersession mechanism.

**Is there design tension?**
- `supersessions` = replacement semantics (old event is superseded by new event)
- `FinalAdjustmentApplied` = layering semantics (additive adjustment on top of existing history)

These are complementary, not competing. `FinalAdjustmentApplied.appliedEventId` could work with a narrower Option A: add `id` only to `FinalAdjustmentApplied` (not EventBase-wide). This would satisfy the `AdjustmentApproved.appliedEventId` cross-reference without requiring id at every emit site.

**No genuine tension** between supersessions and _FINAL_ADJUSTMENT's mechanism. The _FINAL_ADJUSTMENT doc does not depend on supersessions and does not require the supersession schema to be resolved first.

---

## 5. Risk assessment per option

| Option | Cost | Correctness | Determinism risk | Future flexibility |
|---|---|---|---|---|
| A: id on EventBase | HIGH (~157 changes) | Correct | Requires UUID strategy (mock or counter for tests) | Maximum: any cross-event reference possible |
| B: Index-based | MEDIUM (~5 changes) | Fragile | None (no UUIDs) | Limited: breaks on non-append-only log manipulation |
| C: Remove entirely | LOW (~20 changes) | N/A (feature deferred) | None | Zero cost to reintroduce later |

---

## 6. Option ranking matrix

| Option | Migration cost | Correctness | Future-flexibility | Recommendation |
|---|---|---|---|---|
| C (remove) | ★★★ Low | ★★★ Neutral (no feature) | ★★ Moderate (clean slate) | **First choice for v1** |
| B (index-based) | ★★ Medium | ★ Fragile | ★ Limited | **Not recommended** |
| A (id on EventBase) | ★ High | ★★★ Correct | ★★★ Maximum | **Post-v1, if correction feature ships** |

**Recommendation**: Option C (remove supersessions) for v1. If a mid-round correction feature is prioritized post-v1, implement Option A at that time — the feature that writes supersessions should define the schema.

**Alternative narrower Option A for `_FINAL_ADJUSTMENT`**: add `id` only to `FinalAdjustmentApplied` (not EventBase-wide). ~3 changes (events.ts type, one emit site, appliedEventId reference in AdjustmentApproved). Does not require global UUID migration.

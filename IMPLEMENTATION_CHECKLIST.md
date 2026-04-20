# Implementation Checklist

Single source of truth for scope. Read the **Active item** before any work. Tangents → Parking Lot. Closed items → Done (append-only).

## Project North Star

Golf betting app: a pure-TypeScript scoring engine under `src/games/` plus a Next.js 16 UI that collects per-hole scores, runs five canonical betting games (Skins, Wolf, Nassau, Match Play, Stroke Play) with Junk side bets, and settles zero-sum at round end. Portable to React Native.

<!-- TODO if the above understanding drifts, update from docs/games/ + AGENTS.md -->

## Design timeline

Updated at EOD-FINAL.

| Phase | Target | Status |
|---|---|---|
| 1. Audit MIGRATION_NOTES.md | 2026-04-20 | active |
| 2. Rebuild plan approval | TBD | pending audit |
| 3. `src/games/` rebuild | TBD | blocked on phase 2 |
| 4. `prisma/` + seeds rebuild | TBD | blocked on phase 3 |
| 5. UI routes + hole-state builder | TBD | blocked on phase 4 |

## Active item

### #1 — Audit `MIGRATION_NOTES.md`

**Why**: Status across the 19 items is unaudited. Some are known closed from Round 1–5 summaries; others are lessons-learned; some may be live bugs. No deletion or rebuild happens until the audit finishes.

**Acceptance criteria**:
- Every item 1–19 classified as one of: **Fixed** (closed, verified against current code/docs), **Open** (still a live gap), **Lesson-learned** (closed as intended; retained for reference), **Obsolete** (no longer meaningful).
- Output written back into `MIGRATION_NOTES.md` **or** a new `AUDIT.md` at the project root. User picks the venue when classification is complete.
- Every classification cites evidence: a file path, a commit, a rule-file section, or a round-summary reference.
- No code or doc content changed during the audit itself — read-only classification only.

**Must complete before**: any `rm`, `git clean`, `git checkout -- .`, or deletion of `src/games/`, `prisma/`, or `MIGRATION_NOTES.md`.

## Backlog

Ordered; rough sizing in parens.

- **#2** — Rebuild plan: from audit output, list what to delete and what to rebuild, with acceptance criteria per module. User approves before any deletion. (S)
- **#3** — Delete rebuild targets per approved plan (`src/games/`, `prisma/`, dependent app routes). Commit deletion to `pre-rebuild-snapshot` first if insurance is wanted. (S)
- **#4** — Rebuild `src/games/types.ts`, `events.ts`, `handicap.ts` foundations. (M)
- **#5** — Rebuild Skins engine + tests against `docs/games/game_skins.md`. (M)
- **#6** — Rebuild Wolf engine + tests against `docs/games/game_wolf.md`. (L)
- **#7** — Rebuild Stroke Play engine + tests. (M)
- **#8** — Rebuild Nassau engine + tests. (L)
- **#9** — Rebuild Match Play engine + tests. (L)
- **#10** — Rebuild `prisma/` schema. Integer cents, ScoringEvent model. (M)
- **#11** — Hole-state builder — consumes `effectiveCourseHcp(player)` to populate `state.strokes`. (S)
- **#12** — UI wiring: Next.js routes + Zustand store. (L)

## Parking Lot

Untriaged. Dated and sourced to a prompt. Triage at EOD-FINAL or on explicit request.

<!-- format: - [ ] <description> — YYYY-MM-DD — prompt NNN -->

(empty)

## Done

Append-only. Close date + pointer to prompt NNN or EOD.

<!-- format: - [x] #N — <title> — closed YYYY-MM-DD — prompt NNN -->

(empty)

## Deferred / won't-do

With reason.

<!-- format: - [ ] <description> — reason — YYYY-MM-DD -->

- Player abandonment / `PlayerWithdrew` UI flow — deferred indefinitely per product decision (2026-04-20).
- Comeback Multiplier (last-hole stakes adjustment) — deferred to post-v1 PlayerDecision design round (2026-04-20).
- `PlayerDecision` generic mechanism — deferred to its own design round after Nassau/Match Play (2026-04-20).

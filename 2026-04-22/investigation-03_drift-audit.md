# Drift audit

Five checks: disk state vs. intended state for session artifacts and key source/rule-file pairs.

---

## Check 1 — SKILL.md wording matches approved verbatim

**File**: `.claude/skills/focus-discipline/SKILL.md`
**Expected**: `## Commit-split discipline` section appended; retroactive-cost sentence present; no paraphrase.

**Verification** (from Read in this session):

Lines 54–74 of SKILL.md contain the section. Key phrases verified:

- "changes A and B cannot be hunk-selected apart from the working tree without one intermediate state failing tests or tsc" ✓
- "Name the entanglement specifically: state which lines of change B depend on change A being present, and why staging B without A fails." ✓
- "**Construct intermediate state**: write the file to an A-only disk state, stage and commit A, then apply B on top and commit B. Preserves the original grouping." ✓
- "**Bundle**: accept A+B in one commit. State the reason." ✓
- "**Do not proceed until the user picks one.** "Continue" is not a choice when two options are on the table. If the response is ambiguous, ask again before staging." ✓
- "This rule applies regardless of whether the entanglement was reported in the staging plan." ✓
- "Reporting an entanglement in the plan and then receiving any non-explicit-choice response does not constitute approval to bundle." ✓
- "Retroactive splitting is harder, slower, and requires constructing a state that was never committed. Pay the discipline cost at commit time." ✓

**Result**: Match. No drift.

---

## Check 2 — CLAUDE.md agent routing matches specification

**File**: `/home/seadmin/golf/CLAUDE.md`
**Expected**: five-bullet agent routing section verbatim from user specification; no extra text.

**Verification** (from Read in this session, lines 23–33):

- "Five agents in `.claude/agents/`; underused by default." ✓
- "**researcher** — codebase/doc/rule-file surveys, consumer mapping, pre-loop explore passes, doc-to-code reconciliation. Any task that starts with a question." ✓
- "**documenter** — `docs/games/`, `CLAUDE.md` sections, session logs, plan revisions, extracting rules into canonical form." ✓
- "**engineer** — code changes, test writing, refactors. Default for execution turns in a loop." ✓
- "**reviewer** — post-execution check before the user sees the work. Intermediate gate in multi-step loops, not a replacement for user review." ✓
- "**team-lead** — only for prompts spanning multiple agents where sequencing is the hard part. Do not suggest for single-agent work." ✓
- Default-bias paragraph present and matches specification. ✓

**Result**: Match. No drift.

---

## Check 3 — CLAUDE.md junk strip (Commit I clean)

**Expected**: No response-transcript text in CLAUDE.md. Specifically: no occurrence of "isLongestDrive" or "Here are the four answers" or any pseudocode block.

**Verification** (grep run in this session on CLAUDE.md):
- Grep for "isLongestDrive" in CLAUDE.md: no matches ✓
- Grep for "four answers" in CLAUDE.md: no matches ✓
- CLAUDE.md is 43 lines; content is four functional sections only (Session logging, Implementation checklist, Focus discipline, Agent routing, Rebuild context). ✓

**Result**: Clean. Commit I did its job.

---

## Check 4 — junk.ts vs rule file field naming

**File**: `src/games/junk.ts`
**Rule file**: `docs/games/game_junk.md`

| Rule file term  | junk.ts / types.ts term | Status   |
|-----------------|------------------------|----------|
| `declaringBets` | `roundCfg.bets`        | Drift    |
| `bettors`       | `bet.participants`     | Drift    |
| `ctpTieRule` (required in §4) | `JunkRoundConfig.ctpTieRule?: ...` (optional) | Drift |

**declaringBets vs bets**: §5 pseudocode consistently uses `declaringBets` for the collection iterated in `settleJunkHole`. `RoundConfig` in `types.ts` uses `bets: BetSelection[]`. The field names diverge. This is a doc-code drift: either the rule file should say `bets`, or the type should be renamed to `declaringBets`.

**bettors vs participants**: §5 pseudocode uses `bet.bettors` for participant lookup and zero-sum math. `BetSelection` in `types.ts` uses `participants: PlayerId[]`. Same doc-code drift.

**ctpTieRule optional vs required**: `JunkRoundConfig.ctpTieRule?: 'groupResolve' | 'carry'` (optional, from types.ts read). §4 of the rule file shows it as a required field in the config shape. The optional mark means the engine must handle `undefined`, but the rule file does not document what the default is.

**Result**: Three field-name/optionality drifts. These are documentation vs. code naming issues, not logic bugs. They do not block Turn 4 but should be resolved (either update rule file or rename types) before the engine is considered complete.

---

## Check 5 — test fixture types (makeHole for Sandy tests)

**File**: `src/games/__tests__/junk.test.ts`

**`makeHole` current parameter signature** (from read):
`{ hole, par, gross, ctpWinner?, longestDriveWinner? }`

**`HoleState.bunkerVisited`**: present as `bunkerVisited: Record<PlayerId, boolean>`, zero-initialized in the `makeHole` factory body.

**Gap**: `makeHole` accepts no `bunkerVisited` argument. To write a Sandy test where player A visited a bunker, the caller must either:
(a) extend `makeHole` to accept `bunkerVisited?: Record<PlayerId, boolean>`, or
(b) mutate the returned object: `const hole = makeHole(...); hole.bunkerVisited['A'] = true`.

Option (b) works but is fragile. Option (a) is the clean approach and is a small, scoped change to the test file only.

**Result**: `makeHole` needs a `bunkerVisited` parameter before Sandy tests can be written. This is a known prerequisite for Turn 4 Phase 2, not a surprise.

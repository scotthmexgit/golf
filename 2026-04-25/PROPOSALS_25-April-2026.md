# Documenter Proposals — 25 April 2026

## Preamble

This report contains two independent proposals. They share a context — the golf betting app at
`/home/seadmin/golf/` — but address separate concerns and must be evaluated independently. No
combined recommendation is offered; the reviewer decides each on its own merits.

**Evidence sources used:**

- `docs/games/game_junk.md` (direct read, 2026-04-25)
- `docs/games/game_nassau.md` (direct read, 2026-04-25)
- `REBUILD_PLAN.md` lines 486–760, 905–992 (rules-pass open items and Topic decisions)
- `IMPLEMENTATION_CHECKLIST.md` line 42 (D1 backlog item)
- `AGENTS.md` lines 44–66 (routing table and ground rules)
- `CLAUDE.md` lines 11–30 (commit practice)
- `2026-04-25/CLAIM_DISCIPLINE_SURVEY_25-April-2026.md` (P4, P9, P10 findings)
- Git log and `git show` for commits `ca0c3d9`, `b282778`, `8ccd9f5`, `40d4d80`, and the
  Day 2 morning per-task commits (`72894b2`, `6f6cada`, `d4bddb3`)

**Reference to CLAIM_DISCIPLINE_SURVEY findings:** Section A draws directly on P4 (doc-vs-code
drift) and P10 (rules-pass changes landing in REBUILD_PLAN only). Section C draws on P9 (commit
granularity trajectory). The survey's conclusions are cited as established findings and not
re-litigated here.

---

## Section A — Promotion Path: REBUILD_PLAN Rules Decisions to docs/games/

### A1. Current state

#### What kinds of decisions land in REBUILD_PLAN that are rule-relevant

REBUILD_PLAN contains two distinct classes of decisions:

**Rule-relevant decisions** — decisions that fill a gap in, or supersede text in, a `docs/games/`
rule file. A reader consulting only the rule file would lack information needed to understand
implemented behavior. The six Topic resolutions from the #8 rules pass (commits `8ccd9f5` and
`40d4d80`) include four clear examples:

- **Topic 1 — CTPCarried accumulation formula** (REBUILD_PLAN.md line 910): "game_junk.md §6
  is silent on how `carryPoints` accumulates when a second CTP tie occurs while a carry is
  already live." Decision: `carryPoints_new = carryPoints_old + 1`. The formula is REBUILD_PLAN
  only; §6 is silent.
- **Topic 2 — CTPCarried resolution criterion** (line 924): refines the §6 phrase "transfers to
  the next eligible par 3" by specifying the exact trigger (`CTPWinnerSelected` with a single
  unambiguous winner) and the end-of-round escalation path. §6 prose is ambiguous without this.
- **Topic 6 — Nassau press junkItems inheritance** (line 986): `game_nassau.md §7` press section
  "does not mention `junkItems` inheritance." Decision: press inherits both `junkItems` and
  `junkMultiplier`. §7 prose is incomplete without this.
- **Topic 2 — §5 vs §6 tie-handling for Sandy/Barkie/Polie/Arnie** (line 637): "§6 is
  authoritative; §5 pseudocode is informative but superseded for the multi-candidate case." This
  is a direct statement that existing rule-file text is wrong for a specific case.

Topics 3 (FinalAdjustmentApplied routing), 4 (byBet compound key for Nassau), and 5 (zero-sum
enforcement) are **NOT rule-relevant** in the same sense. Topic 3 is resolved by citation to
existing `_FINAL_ADJUSTMENT.md` text — it fills an REBUILD_PLAN open item, not a docs/games/
gap. Topic 4 is an internal `aggregate.ts` data-structure decision (`${betId}::${matchId}` key)
with no game-rule content — no `docs/games/` file discusses ledger key formats. Topic 5
(ZeroSumViolationError throw) is an implementation invariant with no rule-file counterpart.

Decisions about AC structure, phase scope, test gate criteria, sequencing of engineering tasks,
and "authorized scope changes" to TypeScript types are architectural/operational — not
rule-relevant by this definition.

**Distinguishing test:** a decision is rule-relevant if a developer consulting only the
`docs/games/` file(s) would reach a different implementation than one who also read the
REBUILD_PLAN decision.

#### The two concrete Junk gap instances

**Gap 1 — game_junk.md §5 pseudocode vs. REBUILD_PLAN Topic 2 (Sandy/Barkie/Polie/Arnie ties)**

Rule file says (§5, `isSandy` line 122; `isBarkie` line 133; `isPolie` line 144; `isArnie`
line 157 — pattern is the same in all four functions):

```
return candidates.length === 1 ? (candidates[0] as PlayerId) : null
```

REBUILD_PLAN says (line 638–645):

> §6 is authoritative. §5 is superseded for Sandy/Barkie/Polie/Arnie tie cases. ... §5's
> `resolveJunkWinner` dispatch returns `null` when `candidates.length !== 1` — that is a
> single-winner constraint in the dispatch helper, written before §6's tie table was developed.
> The tie table in §6 is the later, more specific specification; it takes precedence.

A developer reading only game_junk.md §5 would implement single-winner-only dispatch. The §6 tie
table is present in the file (line 183: "All tied winners collect"), but without the Topic 2
annotation there is no explicit flag that §5 pseudocode is superseded. The conflict is present in
the rule file but unresolved — a reader cannot determine from the file alone which takes
precedence.

**Gap 2 — game_junk.md §6 CTPCarried row vs. REBUILD_PLAN Topic 1 (accumulation formula)**

Rule file says (§6, CTP row, line 181):

> When `'carry'`, no winner is selected; `CTPCarried` emits with `hole`, `fromHole`, and
> `carryPoints`, and the pot transfers to the next eligible par 3 in the round.

The §6 CTPCarried row describes the event fields but is silent on how `carryPoints` accumulates
when multiple sequential ties occur. REBUILD_PLAN Topic 1 source line states (line 912): "The
doc... is silent on how `carryPoints` accumulates when a second CTP tie occurs while a carry is
already live." Decision: `carryPoints_new = carryPoints_old + 1` (additive carry, dimensionless
integer count of consecutive ties).

A developer reading only game_junk.md §6 would see `carryPoints` mentioned but would have no
formula. They would have to invent one or stop and ask. The implemented behavior in `aggregate.ts`
follows the REBUILD_PLAN formula.

#### The D1 Nassau gap as a third instance

`IMPLEMENTATION_CHECKLIST.md` line 42 states:

> **D1** — Documenter: resolve Nassau rule-file ambiguities surfaced at prompt 012. Update
> `docs/games/game_nassau.md` §5 pseudocode to show pair-wise USGA allocation (matching §2
> prose, which is authoritative per I1/I4 decision). ... Independent of all engine work; can be
> done any time. (XS)

The §5 `holeResult` pseudocode in `game_nassau.md` (lines 62–73) uses `strokesOnHole` without
specifying the pair-wise allocation model. The §2 prose is authoritative; the implemented
`nassau.ts` was built against the I4 decision; §5 pseudocode has not been updated. This gap
predates the #8 rules pass and is tracked as a backlog item. It follows the same pattern:
a decision was made (I4 in a researcher/scoping pass), recorded outside the rule file, and the
rule file was not updated.

#### The Match Play pattern (the one known back-propagation case)

Session `012_match-play-scoping-survey.md` (researcher, read-only): surfaced 10 gaps in
`game_match_play.md`. The operator explicitly triggered a documenter pass. Session
`013_match-play-gap-resolution.md` (documenter): directly edited `game_match_play.md` with 10
gap resolutions, each marked `<!-- Gap N resolved -->`. No intermediate REBUILD_PLAN entry. Filed
BEFORE any `match_play.ts` code was written. Committed in batch `ca0c3d9`.

This was **doc-first, code-second**: the documenter had no existing implementation to reconcile
against. When `game_match_play.md` was edited, the `match_play.ts` engine did not yet exist. The
documenter was writing into a clean slate.

The Junk and Nassau cases are the inverse: the engines were built (in part against REBUILD_PLAN
decisions), and the rule files were not updated. The promotion path runs **against** the
Match Play flow direction.

---

### A2. Proposed mechanism

#### Trigger (observable, not "operator decides")

**Proposed trigger: a pre-commit gate grep, run before every FINAL EOD commit.**

Specifically: before staging for the FINAL EOD commit, grep REBUILD_PLAN.md for Topic
resolutions added since the last commit that touched any `docs/games/` file, and emit a
checklist item if any rule-relevant Topic is found.

The detection criterion is mechanical: a REBUILD_PLAN Topic resolution is rule-relevant if its
**Source:** line cites a `docs/games/` section OR explicitly uses the word "silent" (meaning the
rule file lacks the information). Both markers are present in the actual Topic decisions: Topic 1
cites "`game_junk.md §6`" in its Source line and uses "is silent on"; Topic 2 cites `game_junk.md
§6`; Topic 6 cites both `game_junk.md §7` and `game_nassau.md §7`.

Implementation: the pre-commit gate in `CLAUDE.md` lines 23–30 already gates on
`IMPLEMENTATION_CHECKLIST.md` consistency before staging. The grep pass is added as a second
pre-commit gate step. If the grep finds one or more rule-relevant Topic resolutions since the
last docs/games/ commit, it appends a D-class item to IMPLEMENTATION_CHECKLIST.md (format
matching D1 at line 42) before the commit proceeds. The D-class item becomes the observable
record.

**Why this over operator judgment:** The operator-judgment model is the current de-facto state
— the P10 finding established that there is no trigger condition at all, and the operator
triggered the Match Play documenter pass from memory. A grep-based gate makes the condition
observable without requiring the operator to remember which REBUILD_PLAN section was modified.
A named observable condition (Source: cites a rule file, or uses "silent") can be checked by a
script or by a reviewer reading the diff; "operator decides" cannot be verified after the fact.

**Why not a phase-close trigger:** REBUILD_PLAN.md REBUILD_PLAN line 497 (the fence sentence)
explicitly says "No changes to docs/games/game_junk.md" as part of the #7 AC. A phase-close
trigger would conflict with that fence — the engineer running the phase close is not the
documenter. The pre-commit FINAL EOD gate fires between phases (at the commit anchor), where the
fence is no longer in effect. This avoids the fence-sentence conflict entirely.

**Why not an EOD line item:** An EOD line item requires the session author to remember to add it.
The grep gate is automatic and fires from artifact content, not author memory.

#### Routing

Documenter agent, per AGENTS.md line 53: "Draft / update `docs/games/*.md` → `documenter` →
`reviewer`." No deviation. The engineer who ran the rules pass does not perform the rule-file
update.

#### Gate (when)

At FINAL EOD, as part of the pre-commit gate sequence. Specifically: after the existing
IMPLEMENTATION_CHECKLIST.md consistency check and before `git add`. The documenter pass fires
**before the FINAL EOD commit** if the grep finds any unlanded rule-relevant Topics. If no
unlanded Topics exist, the gate passes and the commit proceeds normally.

The separation from engineering phases is intentional: REBUILD_PLAN.md line 497 fences out
docs/games/ changes during the #7 AC. A FINAL EOD gate fires after the engineering session closes
— the fence is a per-phase-scope constraint, not a FINAL EOD constraint. A separate documenter
pass at EOD avoids the conflict.

#### Artifact (addressing Note 1)

The documenter produces edits to the relevant `docs/games/` file(s). The treatment depends on
the type of conflict:

**When the REBUILD_PLAN decision supersedes existing rule-file text (the §5 case):**

Option B (annotate) is proposed. The existing pseudocode is left in place. An HTML comment is
added immediately above the superseded function(s):

```html
<!-- Superseded for multi-candidate case by REBUILD_PLAN.md Topic 2 (2026-04-24):
     §6 is authoritative for Sandy/Barkie/Polie/Arnie ties.
     isSandy/isBarkie/isPolie/isArnie return the full candidates array (not null on tie);
     settleJunkHole applies the §6 N-w / -w formula when candidates.length > 1.
     See REBUILD_PLAN.md lines 637–645. -->
```

Rationale for Option B over Option A (rewrite): The pseudocode in §5 is informative — it
accurately describes single-winner resolution, which is still the common case. Rewriting it to
show multi-candidate returns would change the pseudocode's contract and may conflict with the
current `junk.ts` implementation (which still stubs Sandy/Barkie/Polie/Arnie as `null` per Phase
3 deferral). Annotating preserves the historical record, flags the supersession to future
readers, and does not require re-verifying the pseudocode against an unimplemented engine path.
Option C (cross-reference only, no touch to existing text) is rejected because a reader scanning
§5 pseudocode has no indication to look elsewhere; the annotation must be adjacent.

**When the REBUILD_PLAN decision fills a rule-file gap (the §6 CTPCarried case):**

Option A (reconcile) is proposed. §6 is silent — there is no existing text to preserve. The
documenter adds the formula to the CTPCarried row of the §6 tie table, e.g., appending to the
"When `'carry'" prose: "If a second CTP tie occurs while a carry is active, `carryPoints`
increments by 1 (`carryPoints_new = carryPoints_old + 1`). The accumulated count resolves when
the next unambiguous CTP winner is selected."

Rationale: there is no conflict to annotate, only a gap to fill. Option B is inapplicable (no
existing text to mark superseded). Option A is safe when the addition is purely additive.

**When the rule file is ambiguous and a prior decision resolved the ambiguity (the D1 Nassau
case):** Option A (reconcile) is proposed. Update §5 pseudocode to show pair-wise USGA
allocation. The I4 decision exists in session logs, not in REBUILD_PLAN Topic format, but the D1
backlog item already names the fix precisely.

#### Verification

After the documenter produces the edits, the reviewer confirms: (a) the `<!-- Superseded -->`
comment or additive text matches the REBUILD_PLAN decision text verbatim or in close paraphrase;
(b) the REBUILD_PLAN decision's Source line and line number are cited; (c) a `git diff
docs/games/` shows only the expected annotation/addition — no rewrites of unrelated sections;
(d) for Option A reconciliations, the new text is consistent with the surrounding rule-file
section (same voice, same style, no new claims beyond the REBUILD_PLAN decision).

#### Backlog handling

The three existing unlanded decisions are promoted to D-class items in
IMPLEMENTATION_CHECKLIST.md, matching the D1 format already in use at line 42:

- **D2** — Documenter: annotate `game_junk.md §5` `isSandy`/`isBarkie`/`isPolie`/`isArnie`
  as superseded for multi-candidate ties per REBUILD_PLAN.md Topic 2 (lines 637–645). Option B
  treatment (HTML comment, not pseudocode rewrite). Blocked on #7b Phase 3 landing — annotation
  references the engine consequence, which must be final before the annotation is authoritative.
  Size: XS.
- **D3** — Documenter: add CTPCarried accumulation formula to `game_junk.md §6` CTPCarried row
  per REBUILD_PLAN.md Topic 1 (lines 910–920). Option A treatment (additive text, no conflict).
  Independent of any engine work; can be done any time. Size: XS.
- **D1** — Already tracked at IMPLEMENTATION_CHECKLIST.md line 42. No new item needed.

---

### A3. Objections addressed

#### 1. The fence-sentence objection

REBUILD_PLAN.md line 497 states: "No changes to Skins/Wolf/Stroke Play/Nassau/Match Play engines.
**No changes to `docs/games/game_junk.md`.**" This was the #7 AC fence for the engineering pass.

The proposed mechanism does not conflict with this fence. The fence applies during the #7
engineering phase — it constrains the engineer working on `junk.ts`, not a documenter operating
at FINAL EOD after the engineering session closes. The FINAL EOD pre-commit gate fires after the
engineer has stopped work and is committing. A documenter pass at that point is a separate action
by a different agent role. REBUILD_PLAN fences are phase-scope constraints, not perpetual
read-only locks on rule files.

If the operator wants to defer the documenter pass past the FINAL EOD (e.g., to avoid mixing
changes in a single commit), the D-class IMPLEMENTATION_CHECKLIST.md item created by the gate
serves as the carry-forward record. The gate's output is an item, not a mandatory same-session
edit.

#### 2. The hierarchy objection

AGENTS.md line 66 (Ground Rule 1): "Rule answers live in `docs/games/game_<name>.md` or the
`golf-betting-rules` skill. No agent answers rule questions from training data when a rule file
exists."

The proposed mechanism does not invert the hierarchy. The REBUILD_PLAN decisions that fill gaps
(Topic 1, Topic 6) and the decisions that resolve doc ambiguities (Topic 2 for §5 vs §6) are not
being treated as superior to the rule files — they are being back-propagated INTO the rule files
so that the rule files regain their status as the complete source. The goal is that after
back-propagation, the rule file alone is sufficient; REBUILD_PLAN becomes a redundant record of
the resolution process.

The gap-fill case (Topic 1 adding the accumulation formula to §6) is additive — it makes the
rule file more complete without contradicting any existing text. The supersession case (Topic 2
annotating §5 pseudocode) does not elevate REBUILD_PLAN over §6 (§6's tie table was already in
the rule file and is authoritative); it only adds a pointer from the stale §5 pseudocode to the
§6 section that supersedes it. After the annotation, the rule file correctly directs a reader to
the right authority.

The hierarchy claim would be a concern if REBUILD_PLAN decisions were being written into rule
files as final game rules with no prior rule-file basis. That is not the case: all three rule-
relevant decisions are either gap-fills or resolutions of existing rule-file ambiguities.

#### 3. The revision-tracking objection

If a REBUILD_PLAN decision that was back-propagated to a rule file is later revised, does the
rule-file edit need updating?

Yes, and the proposed mechanism handles this by design. If a REBUILD_PLAN Topic decision is
revised (e.g., the CTPCarried accumulation formula changes from additive to multiplicative), the
revision is a new rule-relevant Topic resolution. The pre-commit gate will detect it — the
revised Topic's Source line will again cite `game_junk.md §6`. The resulting D-class item will
instruct the documenter to update §6. The revision creates a new back-propagation, not an orphan.

For annotated supersessions (Option B), if the REBUILD_PLAN decision is revised such that §5
pseudocode is no longer superseded, the documenter removes the annotation. If the revision
refines rather than reverses the decision, the annotation is updated. The annotation's REBUILD_PLAN
line number reference makes it easy to find both the annotation and its source.

The chain is: REBUILD_PLAN edit → pre-commit gate detects new rule-relevant Topic → D-class item
→ documenter pass → rule file updated. This holds on first landing and on revisions.

---

## Section C — Commit Granularity Policy Review

### C1. Current policy

**Source: CLAUDE.md lines 11–30** (added in commit `b282778`, 2026-04-23 08:58:21).

The relevant lines are reproduced here for precision:

> **Line 11: `## Commit practice`**
>
> Line 13: "Commit as part of the FINAL EOD process the user calls. FINAL EOD is the canonical
> commit trigger — one commit per productive day covering all files modified since the prior
> commit: engines, rule docs, IMPLEMENTATION_CHECKLIST.md, REBUILD_PLAN.md, session logs, and
> EOD entries."
>
> Lines 19–21: "The user may request additional mid-day commits when a phase closes or a
> logically separable unit of work completes. These are optional and do not replace FINAL EOD."
>
> Lines 23–25: "Start-of-day gate: if yesterday's FINAL EOD was skipped (working tree has
> uncommitted changes at session start), the first action of the new day is **a catch-up commit**
> before any new edits land."
>
> Lines 27–30: "Pre-commit gate: before staging IMPLEMENTATION_CHECKLIST.md, confirm no `[ ]`
> rows exist for phases whose session logs record them as closed. If mismatched rows are found,
> stop and surface them — do not auto-correct and do not commit until the discrepancy is
> resolved."

The policy establishes: (1) FINAL EOD as the canonical commit trigger, with one commit per
productive day; (2) optional mid-day commits at phase close or logical unit completion;
(3) a start-of-day catch-up gate for skipped FINAL EODs; (4) a pre-commit CHECKLIST consistency
gate.

### C2. Reconciliation against the two instances

#### Instance 1 — ca0c3d9 (Days 3–4 batch commit)

`ca0c3d9` (2026-04-23 08:57:56) is a 5,242-line diff across 51 files covering all work from
Day 3 (2026-04-22) and Day 4 (2026-04-23). Commit `b282778` (the CLAUDE.md commit practice
section) is 25 seconds later at 2026-04-23 08:58:21.

**Was the policy in effect?** No. The CLAUDE.md commit practice section was added in `b282778`,
which post-dates `ca0c3d9` by 25 seconds. The policy was being created in the same session as
the catch-up commit. The `ca0c3d9` message acknowledges this explicitly: "Going forward, commits
per CLAUDE.md ## Commit practice (FINAL EOD anchor)."

**Conclusion:** `ca0c3d9` is not a violation of the commit practice policy — the policy did not
yet exist when `ca0c3d9` was made. It is, however, the motivating instance: the policy was
formalized as a direct response to the batch-commit pattern. CLAIM_DISCIPLINE_SURVEY P9 finding
is consistent with this reading.

#### Instance 2 — Day 1 code in Day 2 morning commits

Day 1 (2026-04-20) produced real code changes in sessions logged as prompts 007, 009, 013, and
015 (Wolf follow-ups, bet-id refactor, Nassau Phase 1 and Phase 2 Turn 1). Zero `src/` files
were committed on 2026-04-20; the Day 1 batch doc commit `403f7d6` contains only docs and
session artifacts. The code arrived in per-task commits on Day 2 morning: `72894b2` (#3),
`6f6cada` (#4), `d4bddb3` (#5 Ph1+Ph2T1).

**Does the start-of-day gate address this case?** Partially. The start-of-day gate (CLAUDE.md
lines 23–25) says: "the first action of the new day is **a catch-up commit** before any new
edits land." This sentence addresses the case where yesterday's FINAL EOD was skipped. The Day 1
code was committed Day 2 morning in per-task commits (`72894b2`, `6f6cada`, `d4bddb3`), not as
a single catch-up bundle. This is actually the **better** outcome — per-task granularity is
preserved. The start-of-day gate as written says "a catch-up commit" (singular), which could be
read as instructing a single bundle rather than per-task catch-up commits.

**Does "a catch-up commit" encourage or discourage per-task granularity?** The singular wording
is ambiguous. "A catch-up commit" is most naturally read as one commit, which is what `ca0c3d9`
did (bundling Days 3–4). The Day 2 morning behavior (multiple per-task commits) was better
practice but was not what the gate language literally says. A future session following the gate
literally after a skipped FINAL EOD would produce a single bundle — the `ca0c3d9` pattern —
which is precisely the outcome the policy was designed to discourage.

### C3. Conclusion and proposed wording

**Conclusion: (a) overall with one specific wording adjustment needed.**

The policy is structurally sound. The FINAL EOD anchor, optional mid-day commits at phase close,
and the pre-commit gate are correct mechanisms. The policy did not exist when `ca0c3d9` occurred,
so that instance is not a policy violation. The Day 1 case demonstrates that per-task granularity
is achievable and preferable.

The ambiguity is real: the singular "a catch-up commit" in the start-of-day gate does not
prevent a future `ca0c3d9`-type bundle — it arguably instructs one. This ambiguity needs a
wording adjustment.

**Proposed wording adjustment (CLAUDE.md lines 23–25):**

Current text:
> Start-of-day gate: if yesterday's FINAL EOD was skipped (working tree has uncommitted changes
> at session start), the first action of the new day is a catch-up commit before any new edits
> land.

Proposed replacement:
> Start-of-day gate: if yesterday's FINAL EOD was skipped (working tree has uncommitted changes
> at session start), the first action of the new day is one or more catch-up commits — one per
> logically separable task if the working tree contains changes from multiple tasks — before any
> new edits land.

**What the proposed wording does:**

- Replaces "a catch-up commit" (singular, implies one bundle) with "one or more catch-up
  commits" (permits, and in the multi-task case instructs, per-task granularity).
- Adds "one per logically separable task if the working tree contains changes from multiple
  tasks" — which is the Day 2 morning actual behavior and the intended model.
- Does not change the start-of-day timing constraint or the "before any new edits land" gate.

**Does the proposed wording prevent future ca0c3d9-type batches?** It reduces the likelihood.
The proposed language explicitly says "one per logically separable task if the working tree
contains changes from multiple tasks." A developer following this language at the start of Day 4
(with Days 3–4 code uncommitted) would produce per-task commits rather than a single bundle.
However, the proposed wording does not make batching impossible — it says "if... multiple tasks,"
which a developer could interpret charitably. Full prevention would require a mandatory
prohibition on single-bundle catch-up, which is a stronger constraint than warranted here.

**Does the proposed wording prevent future Day-1-type delayed commits?** No, and it should not.
The Day 1 case is not a problem under the proposed policy: the commits were per-task and
fine-grained. "Delayed until morning" is a session-timing choice, not a granularity defect. The
policy anchors to FINAL EOD as the canonical trigger; it does not require same-session commits
during active engineering.

**Summary of changes:** One sentence in lines 23–25 is reworded. No other CLAUDE.md lines are
touched. No new sections, no commit message format changes, no git workflow changes.

### C4. Out-of-scope confirmation

The following are explicitly out of scope for this proposal and are not addressed anywhere above:

- No git workflow changes (no new branch strategy, no rebase policy, no squash policy).
- No changes to commit message format beyond what CLAUDE.md lines 11–30 currently specify.
- No retroactive re-commit or rebase of existing history.
- No new CLAUDE.md sections, no new AGENTS.md entries, no new SKILL.md content.

---

## Logged for Future Triage

Items noticed during this writing pass that are not tracked elsewhere. These are observations
only — not investigated here.

1. **game_junk.md §11 naming drift vs. canonical types.ts fields:** REBUILD_PLAN.md line 616
   notes: "The doc pseudocode is the source of the naming drift. Engineer uses canonical
   `types.ts` names." The naming drift (`declaringBets`, `bettors` in §5 pseudocode vs.
   `roundCfg.bets`, `bet.participants` in types.ts) is referenced as a pointer for the
   rules-documenter but is not in IMPLEMENTATION_CHECKLIST.md as a D-class item. If D2 and D3
   are created, this should be evaluated for a D4 item (XS — pseudocode naming alignment only,
   no rule content change).

2. **game_nassau.md §9 N35 edge case (D1 scope gap):** IMPLEMENTATION_CHECKLIST.md line 42 (D1)
   mentions updating "§9 N35 to clarify that 'in favor of opposing player' applies only when a
   lead exists — tied in-flight matches on withdrawal get `MatchTied` zero-delta per §6." This
   is already in D1 scope but is distinct from the §5 pseudocode update also described in D1. If
   D1 is executed, the writer should treat these as two separate sub-tasks to avoid partial
   execution being recorded as complete.

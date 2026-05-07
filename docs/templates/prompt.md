<!-- DEVFLOW GENERATED FILE
     DevFlow version: 1.0
     Generated at: 2026-05-06 13:23
     Template source: devflow-runtime-templates.md (PROMPT_TEMPLATE)
     Refresh: re-running HUB on this project regenerates these templates.
-->
# Prompt template: GM to Code

> **Strict format.** Every work prompt GM issues to Code uses this structure. Tiny prompts can collapse fields to one line each, but cannot omit any field. This template is what makes the 7-step prompt cycle and scope discipline enforceable.

## Format

## Prompt: <short title>
**Pipeline item:** <Today #N from current SOD, or "off-pipeline" with reason>
**Linked issues:** <#123, #456, or none>

### Objective
One sentence. What success looks like.

### In scope
- <bullet>
- <bullet>

### Out of scope
- <bullet — explicitly excluded thing>
- <bullet — another excluded thing>
- (or: "standard scope discipline applies — no excluded items beyond defaults")

### Success criteria
Concrete, testable. Code knows it's done when:
- <bullet>
- <bullet>

### References
- <file path or issue ID Code should read first>
- <file path or issue ID>
- (or: "none — explore as needed")

### Phase guidance
- **Explore:** <any specific areas to focus on, or "standard">
- **Plan:** <stop after plan if: ... — defaults from report.md apply otherwise>
- **Develop:** <any constraints, e.g., "do not modify tests" or "follow existing pattern in X.py">
- **Browser check (if UI changes):** standard / headless CLI smoke screenshot / Playwright test required / skip
- **UI checks (if visible change):** breakpoints + a11y + token audit / skip — backend only / skip — informational
- **Loop mode:** none (default) / safe — <pattern>[, max=N] — see Code's CLAUDE.md "Safe self-looping" section for valid patterns and rules
- **Codex review:** automatic per Code's CLAUDE.md — three phases (plan pre-review, optional diff pre-review for high-stakes, post-review). To override defaults, write: "skip pre-review (diff)" / "use /codex:review instead of adversarial" / "background mode" / "skip — informational only"
- **Report:** <standard report.md format>

### Verification mode
[Codex-verified (default) / Standard / Codex-only check]

### Approval gate
[auto-proceed / stop after Plan and wait for GM]

## Field-by-field rules

**Pipeline item.** Required. If "off-pipeline," GM must justify in the reason field. EOD section 8 tracks how often this happens — frequent off-pipeline prompts indicate planning failure.

**Objective.** One sentence only. If it needs two sentences, the prompt is doing too much — split it.

**In scope.** What the prompt covers. Should be 1-4 bullets. More than 4 means the prompt is too big.

**Out of scope.** Things Code might be tempted to fix while in the area, but should not. Examples: "do not refactor unrelated functions", "do not update dependencies", "do not add tests for adjacent code". This field exists specifically to prevent scope creep — fill it in even when "obvious."

**Success criteria.** Concrete and testable. "Login works" is not concrete. "POST /api/login returns 200 with valid creds and 401 with invalid creds" is concrete.

**References.** Files and issues Code should read first. Helps Code skip the broad Explore phase and target reads. If empty, Code does general exploration.

**Phase guidance.** When the standard flow needs adjustment. Most prompts say "standard" and skip this. Use it when one phase needs extra attention or constraint.

**Verification mode.** Controls how much GM reviews the report.
- **Codex-verified (default).** Code self-clears the prompt if Codex pre-review and post-review came back clean (or Code addressed findings autonomously per the high-confidence rules in CLAUDE.md). GM reads the report for awareness, not approval. If Codex flags anything Code can't fix autonomously, mode auto-escalates to Standard. Use for: most day-to-day work, small refactors, well-scoped pieces, mechanical changes.
- **Standard.** Full GM review. Use for: anything hitting an approval gate, design decisions, ambiguous requirements, work the user explicitly wants reviewed. Approval gates auto-trigger Standard regardless of what is set here.
- **Codex-only check.** No GM review expected. Used for verification-only prompts where the entire deliverable is Codex's pass/fail. If Codex finds issues, mode auto-escalates to Standard.

**Loop mode.** Lets Code self-iterate during Develop without returning to GM between iterations, when the work is mechanical and has a closed-form success criterion.
- **none (default).** One Develop pass. The standard flow.
- **safe — `<pattern>`** — Code loops fix → verify → fix until success. Patterns: `tests-green`, `lint-clean`, `codex-clean`, `rename-sweep`, `migration-sweep`, `coverage-gap`, or a free-form description that Code evaluates against the safety conditions in CLAUDE.md.
- Optional `, max=N` — overrides the default attempt cap of 5. Hard ceiling 50.
- Code refuses Loop mode and proposes alternatives if the prompt's work is "make it work" without specification, performance optimization, bug fixing without a failing test, UX-visible, schema/API/dependency changes, or cleanup-finds-cleanup.
- Loop mode does not bypass approval gates or scope expansion stops.

**Approval gate.** Default behavior is in report.md — Code stops after Plan if any of: new dependency, refactor across 3+ files, schema change, public API change, security-sensitive change, deletion of code older than 30 days. Use this field to override.

## Two example prompts

### Small prompt (single fix)

## Prompt: fix typo in pricing copy
**Pipeline item:** Today #3
**Linked issues:** #142

### Objective
Replace "anually" with "annually" on the pricing page.

### In scope
- src/components/PricingPage.jsx text content

### Out of scope
- Any other copy on the page
- Layout, styles, or component structure
- Other pages with similar copy (separate issue)

### Success criteria
- Word "annually" appears correctly
- No other text changes
- Page renders without errors

### References
- src/components/PricingPage.jsx
- #142

### Phase guidance
Standard. Tiny prompt — phases collapse.

### Verification mode
Codex-verified (default — typo fix, no judgment calls, low risk)

### Approval gate
auto-proceed

### Larger prompt (feature work)

## Prompt: add password reset endpoint
**Pipeline item:** Today #1
**Linked issues:** #156, #98

### Objective
Implement POST /api/auth/reset-password that sends a reset email and stores a time-limited token.

### In scope
- New endpoint in src/api/auth/
- Token generation and storage in users.reset_token
- Email sending via existing mail service
- Unit tests for the new endpoint

### Out of scope
- Frontend reset form (separate ticket #157)
- Refactoring existing auth code (defer)
- Adding rate limiting (Day +3-5 item)
- Email template restyling (out of scope entirely)

### Success criteria
- POST /api/auth/reset-password with valid email returns 200 and sends email
- Same endpoint with unknown email returns 200 (anti-enumeration) but does not send
- Token expires after 1 hour per existing pattern in src/api/auth/verify.py
- Unit tests pass with >80% coverage on the new file
- No existing tests broken

### References
- src/api/auth/verify.py (existing token pattern)
- src/services/mail.py (email sending interface)
- #156 (acceptance criteria)
- #98 (security requirements)

### Phase guidance
- Explore: confirm the token storage column exists in users table (referenced in #156)
- Plan: stop after Plan and wait for GM — schema field needed
- Develop: standard
- Browser check: skip — backend endpoint, no UI
- UI checks: skip — backend only
- Codex review: standard (three-phase automatic). Diff pre-review will trigger automatically because this hits the schema-change approval gate. Also run /codex:adversarial-review --base main before merging this branch
- Report: standard

### Verification mode
Standard (security-sensitive, schema change, hits approval gate)

### Approval gate
stop after Plan and wait for GM

### Codex-only check example

## Prompt: verify rename caught all references
**Pipeline item:** Today #4
**Linked issues:** #201

### Objective
Confirm the rename in commit a1b2c3d (renamed `getUserData` to `fetchUserProfile` across the codebase) caught all callers and didn't leave any stale references.

### In scope
- All files in src/ and tests/

### Out of scope
- Functional changes
- Test additions
- Documentation updates

### Success criteria
- No remaining references to `getUserData` in code (excluding migration notes)
- All callers use new name correctly
- Codex agrees the rename is clean

### References
- commit a1b2c3d
- #201

### Phase guidance
- Explore: grep for stale references
- Plan: brief — this is a verification, not a change
- Develop: only fix any stragglers found; if more than 2 files need fixing, escalate to Standard
- Codex review: full three-phase. Codex's verdict IS the deliverable.
- Report: brief

### Verification mode
Codex-only check (verification-only prompt — Codex pass = done)

### Approval gate
auto-proceed

### Loop mode example

## Prompt: get test suite green after dependency upgrade
**Pipeline item:** Today #2
**Linked issues:** #312

### Objective
Run the test suite and fix every failure caused by the upgrade to `lodash` 4.17.21 → 4.17.22 in commit `a1b2c3d`. Stop when all tests pass or the attempt cap is reached.

### In scope
- Test files under `tests/`
- Source files where the test failure points to a lodash API change
- `package-lock.json` regeneration if needed

### Out of scope
- Refactoring tests for clarity (defer)
- Adding new tests (defer)
- Upgrading any other dependency (separate prompt if needed)
- Source-level changes that don't directly resolve a test failure

### Success criteria
- `npm test` exits 0
- No tests skipped that weren't skipped before the upgrade
- Diff stays within "fix the lodash compat layer" — no drift

### References
- commit `a1b2c3d` (the upgrade)
- #312 (acceptance: all tests green post-upgrade)

### Phase guidance
- Explore: run `npm test` once, capture failure list
- Plan: brief — pattern of failures dictates approach
- Develop: standard with Loop mode
- Codex review: end-of-loop post-review per default; mid-loop checkpoint at iteration 3 if loop runs that long
- Report: standard with Loop summary section

### Verification mode
Codex-verified (mechanical fixups, not design)

### Loop mode
safe — tests-green, max=10

### Approval gate
auto-proceed (no schema/API/dep changes — the dep change already happened in `a1b2c3d`)

## When Code receives a prompt that doesn't follow this format

Code should reply to GM: "This prompt is missing <fields>. Please reissue using the prompt template, or confirm I should proceed with my interpretation of those fields." This forces GM to fix the format and prevents Code from running on guesses.

The exception is conversational follow-ups within an active prompt (e.g., GM clarifies a question Code raised in Plan). Those don't need full format.

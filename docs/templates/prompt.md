# Prompt template: GM to Code

> **Strict format.** Every work prompt GM issues to Code uses this structure. Tiny prompts can collapse fields to one line each, but cannot omit any field. This template is what makes the 4-phase rule and scope discipline enforceable.

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
- **Explore:** <any specific areas to focus on, or "standard 4-phase">
- **Plan:** <stop after plan if: ... — defaults from report.md apply otherwise>
- **Develop:** <any constraints, e.g., "do not modify tests" or "follow existing pattern in X.py">
- **Report:** <standard report.md format>

### Approval gate
[auto-proceed / stop after Plan and wait for GM]

## Field-by-field rules

**Pipeline item.** Required. If "off-pipeline," GM must justify in the reason field. EOD section 8 tracks how often this happens — frequent off-pipeline prompts indicate planning failure.

**Objective.** One sentence only. If it needs two sentences, the prompt is doing too much — split it.

**In scope.** What the prompt covers. Should be 1-4 bullets. More than 4 means the prompt is too big.

**Out of scope.** Things Code might be tempted to fix while in the area, but should not. Examples: "do not refactor unrelated functions", "do not update dependencies", "do not add tests for adjacent code". This field exists specifically to prevent scope creep — fill it in even when "obvious."

**Success criteria.** Concrete and testable. "Login works" is not concrete. "POST /api/login returns 200 with valid creds and 401 with invalid creds" is concrete.

**References.** Files and issues Code should read first. Helps Code skip the broad Explore phase and target reads. If empty, Code does general exploration.

**Phase guidance.** When the standard 4-phase flow needs adjustment. Most prompts say "standard 4-phase" and skip this. Use it when one phase needs extra attention or constraint.

**Approval gate.** Default behavior is in report.md — Code stops after Plan if any of: new dependency, refactor across 3+ files, schema change, public API change, security-sensitive change, deletion of code older than 30 days. Use this field to override (force a stop, or explicitly auto-proceed when the defaults would have stopped).

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
Standard 4-phase. Tiny prompt — phases collapse.

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
- Report: standard

### Approval gate
stop after Plan and wait for GM

## When Code receives a prompt that doesn't follow this format

Code should reply to GM: "This prompt is missing <fields>. Please reissue using the prompt template, or confirm I should proceed with my interpretation of those fields." This forces GM to fix the format and prevents Code from running on guesses.

The exception is conversational follow-ups within an active prompt (e.g., GM clarifies a question Code raised in Plan). Those don't need full format.

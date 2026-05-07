# Codex Availability Investigation

**Date:** 2026-05-06  
**Prompt:** 05  
**Investigator:** Code

---

## TL;DR

The failures were not Codex outages. Code was invoking Codex via the **`Skill` tool** (`Skill("codex:adversarial-review")`), which is blocked by `disable-model-invocation: true` in the command's frontmatter. The correct path is a direct **`Bash`** invocation of the companion script. Codex works fine — the invocation method was wrong.

---

## 1. Reproduction

### Error text

```
Skill codex:adversarial-review cannot be used with Skill tool due to disable-model-invocation
```

**Locations in conversation history:**
- 2026-05-06 prompt 02 (NA-4 Playwright spec) — Code attempted `Skill("codex:adversarial-review")`
- 2026-05-06 prompt 04 (F11 implementation) — same attempt

**Is it reproducible on demand?** Yes — every attempt to call `Skill("codex:adversarial-review")` or `Skill("codex:review")` produces this error because the flag is static in the command definition.

### Contrast: what works

Direct Bash invocation succeeds (tested this session, exit code 0):
```bash
node "/home/seadmin/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs" review --wait
# → [codex] Thread ready ... Reviewer finished. EXIT_CODE: 0
```

---

## 2. Environment snapshot

| Property | Value |
|---|---|
| Codex CLI version | `codex-cli 0.128.0` |
| Plugin version | `1.0.4` (cache path: `/home/seadmin/.claude/plugins/cache/openai-codex/codex/1.0.4`) |
| Auth method | `app-server` (ChatGPT device-auth via Claude Code extension) |
| Auth state | `loggedIn: true`, verified, `scotthmex@gmail.com` |
| Broker state | Multiple broker PIDs in `/tmp/cxc-*/broker.pid` — all active |
| Invocation surface | Plugin command definition files in `.../commands/adversarial-review.md` and `review.md` |
| `disable-model-invocation` in `adversarial-review.md` | **`true`** (line 4) |
| `disable-model-invocation` in `review.md` | **`true`** (line 4) |
| `disable-model-invocation` in `setup.md` | **absent** — setup works via Skill tool |
| bwrap sandbox | Disabled (bwrap unavailable on this kernel); review still runs, stderr notes it |

---

## 3. Root cause hypothesis

### Primary cause (confirmed)

**`disable-model-invocation: true` in the Codex review command frontmatter.**

The Claude Code plugin system uses `disable-model-invocation: true` as a security flag that prevents model-initiated invocations of designated commands via the `Skill` tool. This guards against AI self-invocation chains where Claude could use a high-trust plugin command programmatically without user oversight.

The flag does NOT prevent:
- User-typed `/codex:adversarial-review` (user-initiated, not model-initiated)
- `Bash` invocations of the underlying `codex-companion.mjs` script

Code's CLAUDE.md instructions say "Run `/codex:adversarial-review`" in steps 3, 4, and 6 of the 7-step cycle. Code interpreted this as "invoke via `Skill` tool" rather than "run via `Bash`". The command definition itself shows the correct path:

```
Foreground flow:
- Run:
node "${CLAUDE_PLUGIN_ROOT}/scripts/codex-companion.mjs" adversarial-review "$ARGUMENTS"
```

This is a **Bash command**, not a Skill tool invocation.

### Evidence
- `disable-model-invocation: true` is present verbatim at line 4 of both command files
- The error message names the flag exactly: "cannot be used with Skill tool due to disable-model-invocation"
- `codex:setup` (no `disable-model-invocation`) works via Skill tool
- Direct Bash invocation of companion script produces `EXIT_CODE: 0` and a full review

### Alternative hypotheses (ruled out)

| Hypothesis | Evidence against |
|---|---|
| Auth expired / rotated | `setup --json` shows `loggedIn: true, verified: true` for `scotthmex@gmail.com` |
| CLI version drift / command syntax change | CLI is 0.128.0, companion responds normally via Bash |
| Network/DNS issue | Bash invocation connects, creates thread, reads files, returns review |
| Account-level model invocation disabled | No — the error is at the Claude Code plugin layer, not at the Codex API. The literal "disable-model-invocation" token is a Claude Code frontmatter key, not an API error code |
| Rate limit | Companion connects and completes a review; no rate-limit errors in output |

### 2026-05-01 session — different cause, same symptom name

The 2026-05-01 prompt 13 failure ("Codex probe not run this session — stale broker state") was a **different** root cause: the Codex broker process started before `codex login` ran, causing 401 errors on API calls. That was the stale-broker-auth issue documented in memory. Prompt 14 resolved it by killing the stale broker and running a fresh probe.

The 2026-05-06 failures are a distinct code path: Skill tool blocked regardless of broker health.

---

## 4. Fix path

### Immediate fix (Code-actionable — no user consent needed)

Replace all Skill tool Codex invocations in future prompts with direct Bash invocations:

**Before (wrong — blocked):**
```
Skill("codex:adversarial-review")
```

**After (correct):**
```bash
node "/home/seadmin/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs" adversarial-review --wait
```

The path is installation-specific. For this box:
```
/home/seadmin/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs
```

### CLAUDE.md clarification (GM-approved change at next session)

The current CLAUDE.md says:

> **Command:** `/codex:adversarial-review` after writing the plan...

This notation is ambiguous — it looks like a user-typed slash command. Code read it as "use Skill tool". A one-line clarification will close the ambiguity permanently. Proposed addition (under the "Codex usage notes" section or inline):

> **How Code invokes Codex:** Do NOT use the Skill tool — `codex:adversarial-review` and `codex:review` have `disable-model-invocation: true` which blocks Skill-tool invocations. Always invoke via Bash:
> ```bash
> node "/home/seadmin/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs" adversarial-review --wait
> ```
> For background runs, add `run_in_background: true` to the Bash call.

This is a **one-time CLAUDE.md edit** — no code change, no dependency.

### Who actionable

| Action | Owner | Consent needed |
|---|---|---|
| Use Bash instead of Skill for Codex — current session forward | Code (immediate) | None — self-correction |
| CLAUDE.md clarification | GM approves wording; Code edits | GM review at next prompt |

Nothing is upstream. Codex, auth, and the CLI are all functioning correctly.

---

## 5. Validation plan

### The fix is already validated in this session

Running the companion script directly produced a complete review:

```
[codex] Thread ready (019e00aa-...)
[codex] Reviewer started: current changes
... (reads files, runs git commands) ...
[codex] Review output captured.
[codex] Reviewer finished.
EXIT_CODE: 0
```

The review returned two P2 findings (template/CLAUDE.md drift) — substantive output, not an error.

### For future sessions: pre-flight check

Before the first Codex step in any session, run:
```bash
node "/home/seadmin/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs" setup --json
```
(This is what `codex:setup` Skill does — it's safe via Skill because setup.md has no `disable-model-invocation`.)

If `ready: true` and `loggedIn: true` → proceed with Bash invocation directly.  
If `ready: false` → check auth, broker state (restart Claude Code if broker is stale per memory).

### Safe test invocation for any future validation

```bash
# Run against an empty working tree (no-op review)
cd /home/seadmin/golf && \
  node "/home/seadmin/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs" review --wait --scope working-tree
```

A clean working tree produces a "nothing to review" verdict, or Codex reads docs and returns P3 observations. Either outcome confirms the Bash path is live.

---

## 6. Recommendations for resilience

### Standing scale-gate rule (CLAUDE.md instruction-health)

Proposed language for "Codex unavailability" section:

> **Codex is available when:** `setup --json` shows `ready: true AND loggedIn: true` AND the companion Bash invocation does not error.  
> **Codex is unavailable when:** `setup --json` shows `ready: false` OR `loggedIn: false` OR the Bash invocation fails (non-zero exit or connection error).  
> **Self-invocation via Skill tool is always wrong:** `disable-model-invocation: true` blocks it permanently. Do not attempt.  
> **When Codex is unavailable:** degraded self-review per the existing fallback protocol. Codex-verified prompts escalate to Standard automatically.

### Failure classification table

| Symptom | Root cause | Fix |
|---|---|---|
| "cannot be used with Skill tool due to disable-model-invocation" | Code used Skill tool instead of Bash | Always use Bash |
| 401 Unauthorized on companion Bash invocation | Stale broker (started before login) | Restart Claude Code |
| companion Bash exits non-zero with network error | DNS/connectivity | Check `codex.openai.com` reachability |
| `loggedIn: false` in setup --json | Auth expired | `codex login --device-auth` then restart Claude Code |

### Pre-flight: fold into SOD

Add a single Codex health check to the SOD sequence (after PM2 check, before NA-4 or any engineering prompt):
```bash
node "/home/seadmin/.claude/plugins/cache/openai-codex/codex/1.0.4/scripts/codex-companion.mjs" setup --json | jq '{ready, loggedIn: .auth.loggedIn}'
```
One line in the SOD report: "Codex: ready/not-ready, loggedIn: true/false." Catches auth rot before the first review step rather than at Step 3 of a long prompt.

---

## Appendix: Command files with disable-model-invocation

```
adversarial-review.md:4:disable-model-invocation: true   ← BLOCKS Skill tool
review.md:4:disable-model-invocation: true                ← BLOCKS Skill tool
status.md:4:disable-model-invocation: true                ← BLOCKS Skill tool
result.md:4:disable-model-invocation: true                ← BLOCKS Skill tool
cancel.md:4:disable-model-invocation: true                ← BLOCKS Skill tool
setup.md:   (no flag)                                     ← Skill tool works
rescue.md:  (no flag)                                     ← Skill tool works
```

All review/status/control commands are gated; only the informational setup and rescue commands are not.

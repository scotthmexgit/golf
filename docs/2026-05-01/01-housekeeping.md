---
prompt_id: 01
timestamp: 2026-05-01
checklist_item_ref: "SOD Today #2 + #3 — housekeeping"
tags: [housekeeping, docs, instruction-health]
---

## Prompt
Close two XS housekeeping items from SOD 2026-05-01 in a single combined commit: (1) update session-logging SKILL.md Rolling EOD entry template from `NNN_<slug>` to `NN-<slug>` (DevFlow 2-digit format); (2) add per-prompt-commit workflow note to CLAUDE.md commit hygiene section.

## Action

1. Read `.claude/skills/session-logging/SKILL.md` — confirmed Paths section (lines 42–47) already had the correct DevFlow format `docs/yyyy-mm-dd/NN-<slug>.md`. Stale references were in the Rolling EOD entry template: line 80 (`NNN_<slug>`) and line 87 (example: `003_audit-migration-notes`).
2. Edited SKILL.md line 80: `NNN_<slug>` → `NN-<slug>`.
3. Edited SKILL.md line 87: `003_audit-migration-notes` → `03-audit-migration-notes`.
4. Read CLAUDE.md commit hygiene section (line 190–192).
5. Edited CLAUDE.md: added per-prompt-commit workflow line after existing "Tickets first" sentence.
6. Verified: `grep NNN_slug SKILL.md` → no matches. `grep "per-prompt commit" CLAUDE.md` → line 193.
7. Ran `npm run test:run`: 441/441 pass. (Note: SOD stated 396/396 — stale; Wolf phase added tests bringing total to 441.)
8. Ran `npx tsc --noEmit`: clean.
9. Committed: `6aad6de`.

## Result

- **Files touched:** `.claude/skills/session-logging/SKILL.md`, `CLAUDE.md`
- **Worked:**
  - SKILL.md Rolling EOD entry template updated to DevFlow 2-digit format.
  - CLAUDE.md commit hygiene section now documents per-prompt-commit workflow.
  - 441/441 tests pass; tsc clean; single commit `6aad6de`.
- **Did not work / blocked:** none.

## Open questions

- SOD stated 396/396 vitest tests. Actual count is 441/441 (Wolf phase added 45 tests after Skins closed at 396). CLAUDE.md project conventions and SOD templates should be updated to reflect 441/441 at next opportunity. No action taken here — out of scope for this prompt.

## Parking lot additions

- none

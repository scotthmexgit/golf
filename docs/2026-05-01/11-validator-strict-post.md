---
prompt_id: 11
timestamp: 2026-05-01
checklist_item_ref: "Prompt 11 — POST validator: strict reject on unknown config keys"
tags: [validator, rule-7, post-strict, gameconfig]
---

## Prompt

Add a strict raw-input validator at the POST boundary to close the rule #7 silent-default loophole where `buildGameConfig` silently drops unrecognized keys (e.g., misspelled `presRule`) before `validateGameConfig` sees the derived blob.

## Codex Probe

**SUCCEEDED.** Auth active, shared session at `unix:/tmp/cxc-H5mcxW/broker.sock`. Proceeded to develop.

## Explore Findings

**Root cause of the loophole:** `buildGameConfig` accesses TypeScript-typed properties (`game.pressRule`, `game.pressScope`, `game.pairingMode`). If the raw POST body contains `presRule` (typo) at runtime, the TypeScript-typed access returns `undefined`. The key never enters the config blob. `validateGameConfig` validates the blob (which has no unknown keys) and passes. Round created with config=null (bridge defaults apply). HTTP 200.

**Existing `validateGameConfig`** correctly validates the BLOB for unknown keys and bad enum values — it is not the problem. The gap is entirely pre-blob.

**Design choice:** new function `validateGameConfigInput(type, rawGame)` validates the raw game object BEFORE `buildGameConfig`. Three-phase POST path: (1) input validation → (2) buildGameConfig → (3) blob validation.

## Develop

### `src/lib/gameConfig.ts`

Added:
- `ALL_TYPE_CONFIG_KEYS` — union of all type-specific config keys across all types (nassau ∪ wolf). Skins-exclusive keys are covered by the wolf set (escalating is shared); comment explains this.
- `BASE_GAME_INSTANCE_KEYS` — always-valid fields not type-gated (id, type, label, stake, playerIds, junk, pressAmount, matchFormat, maxExposure, settlePer9, partnerIds).
- `VALID_INPUT_KEYS_BY_TYPE` — per-type allowed config keys at POST boundary.
- **`validateGameConfigInput(type, rawGame)`** — exported strict validator:
  - Skips base GameInstance fields
  - Accepts this type's valid config keys
  - Rejects cross-type config keys: `"Config key "X" is not valid for game type "Y"`
  - Rejects truly unknown keys: `"Unknown game config key "X" in Y game"`

Module header updated to document the POST-strict / hydrate-permissive asymmetry.

### `src/app/api/rounds/route.ts`

Three-phase validation loop with inline comments:
```typescript
// Step 1: strict raw-input validation
const inputCheck = validateGameConfigInput(g.type, g)
if (!inputCheck.ok) → HTTP 400
// Step 2: derive blob
const config = buildGameConfig(g)
// Step 3: enum validation on blob
const v = validateGameConfig(g.type, config)
if (!v.ok) → HTTP 400
```

### `src/store/roundStore.ts`

Inline comment added explaining permissive hydration asymmetry for future maintainers.

### Tests (`src/lib/gameConfig.test.ts`)

15+ new tests added:

**`validateGameConfigInput` — valid inputs pass:**
- Base fields only, valid config fields per type, pressAmount on nassau (base field)

**`validateGameConfigInput` — rejects misspelled/cross-type keys:**
- `presRule` (typo) on nassau → `Unknown game config key "presRule"`
- `loneWolfMultiplier` on nassau (cross-type) → `Config key... not valid for game type "nassau"`
- `pressRule` on wolf (nassau key on wrong type) → rejected
- `escalating` on nassau (wolf/skins key) → rejected

**Hydration permissiveness confirmed (asymmetry test):**
- `hydrateGameConfig('nassau', { pressRule: 'manual', unknownField: true })` → logs warning + returns `{}`
- Valid blob still hydrates correctly (asymmetry doesn't break good data)

**Tests: 540/540 pass (from 525). tsc clean.**

---

## Reviewer Agent Output

```
VERDICT: APPROVED
Findings:
  1. [MINOR] ALL_TYPE_CONFIG_KEYS comment said "every game type" but SKINS_KEYS not spread
     (escalating is already covered by WOLF_KEYS — functionally harmless; comment inaccurate).
     → Fixed: comment now notes "SKINS_KEYS intentionally not spread — escalating covered by WOLF_KEYS"
```

Minor finding fixed before commit. Final VERDICT: APPROVED.

---

## Codex Adversarial Review Output

```
# Codex Adversarial Review
Target: working tree diff
Verdict: needs-attention

Findings:
- [critical] Review could not inspect the target diff (src/lib/gameConfig.ts:1)
  Filesystem access was read-only and tool-channel/schema constraints prevented
  running git/file inspection commands. No code defect identified.
  Recommendation: Re-run in environment where git diff and file reads are available.
```

**Triage: REJECT** — the finding is entirely infrastructure (Codex sandbox blocked git/file commands), not a code issue. No code concern was raised. Pattern matches the bwrap sandbox failures seen in Prompts 6 and 9 (same environment constraint). Reviewer agent read actual files and returned APPROVED. No conflict between Codex and reviewer.

---

## Result

- **Files changed:** `src/lib/gameConfig.ts` (+46), `src/lib/gameConfig.test.ts` (+75), `src/app/api/rounds/route.ts` (+9, -3), `src/store/roundStore.ts` (+2), `IMPLEMENTATION_CHECKLIST.md` (+1, -1)
- **Tests:** 540/540 (from 525; +15 new tests)
- **tsc:** clean
- **Reviewer:** APPROVED (one minor comment fix applied)
- **Codex:** needs-attention — entirely infrastructure (sandbox bwrap blocked file reads, not a code finding); REJECTED

---

**POST validator strict-reject complete. Reviewer APPROVED. Codex sandbox failure (not a code finding — no conflict with APPROVED). Rule #7 closed at persistence boundary. NA-2 resume unblocked.**

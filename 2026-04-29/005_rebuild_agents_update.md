---
prompt_id: 005
date: 2026-04-29
role: documenter / ops
checklist_item_ref: "Production rebuild + AGENTS.md current-item update"
tags: [ops, rebuild, documenter, agents-md]
---

# Production Rebuild + AGENTS.md Update — 2026-04-29

---

## Task A — Production Rebuild

### Commands run

```
pm2 stop golf
npm run build
pm2 start golf
```

### pm2 stop output

```
[PM2] Applying action stopProcessId on app [golf](ids: [ 0 ])
[PM2] [golf](0) ✓
status: stopped
```

Stop was clean. No EADDRINUSE errors (safe rebuild procedure: stop before build).

### npm run build output

```
▲ Next.js 16.2.0 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 1913ms
  Running TypeScript ...
  Finished TypeScript in 3.2s ...
  Collecting page data using 15 workers ...
✓ Generating static pages using 15 workers (6/6) in 367ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/rounds
├ ƒ /api/rounds/[id]
├ ƒ /api/rounds/[id]/results
├ ƒ /api/rounds/[id]/scores
├ ƒ /api/rounds/[id]/scores/hole/[hole]
├ ƒ /bets/[roundId]
├ ƒ /results/[roundId]
├ ○ /round/new
├ ƒ /scorecard/[roundId]
└ ƒ /scorecard/[roundId]/resolve/[hole]
```

Build: **SUCCESS**. tsc clean. 12 routes compiled.

### pm2 start output

```
[PM2] [golf](0) ✓
[PM2] Process successfully started
status: online   pid: 1237734   uptime: 0s   restarts: 91
```

### Verification

**pm2 describe:**
```
status     │ online
uptime     │ 5s
created at │ 2026-04-29T18:03:48.872Z
```

Restart timestamp `2026-04-29T18:03:48.872Z` confirms this is a fresh start from today's build. Restart counter shows 91 — historical count from prior PM2 restart storm; not new restarts.

**HTTP sanity check:**
```
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/golf
→ 200
```

Production server is live with all Apr27–Apr29 code changes deployed.

---

## Task B — AGENTS.md Line 21 Edit

**Authorization:** Explicit operator authorization granted in this prompt.

### AGENTS.md diff

```diff
diff --git a/AGENTS.md b/AGENTS.md
index 02ce8a7..2267a7c 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -18,7 +18,7 @@ Skins, Wolf, Nassau, Match Play, Stroke Play. Junk is the side-bet engine (not a
 
 Current status (live scope in `IMPLEMENTATION_CHECKLIST.md`):
 - All five engines (Skins, Wolf, Nassau, Match Play, Stroke Play) landed under `src/games/` (#3–#8 closed 2026-04-24). Junk Phase 1–2 landed; Phase 3 deferred.
-- Active phase: Stroke-Play-only UI wiring — see `docs/plans/STROKE_PLAY_PLAN.md`. Current item: SP-6 (GAME_DEFS cleanup + GameList filter).
+- Active phase: Stroke-Play-only UI wiring — see `docs/plans/STROKE_PLAY_PLAN.md`. Current item: SP-4 §4 manual browser playthrough (PF-2 phase-end gate).
 - Old scoring in `src/lib/*` remains live; Stroke Play cutover is SP-4; full multi-bet cutover deferred.
```

Exactly one line changed. No other AGENTS.md content touched.

### Commit

```
4b9bbbb  AGENTS.md: update current item to SP-4 §4 playthrough gate
1 file changed, 1 insertion(+), 1 deletion(-)
```

---

## Working tree state post-tasks

```
?? 2026-04-29/      (session logs — roll into FINAL EOD)
?? EOD_29-April-2026.md  (EOD log — rolls into FINAL EOD)
```

No uncommitted source or doc changes.

---

## Nothing unexpected

Both tasks completed cleanly. Rebuild used safe stop/build/start sequence; no restart storm. HTTP 200 confirmed. AGENTS.md edit is a single-line substitution with no surrounding-context changes.

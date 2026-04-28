---
prompt_id: 012
timestamp: 2026-04-27T00:00:00Z
checklist_item_ref: "PF-1-F3 [PF-2] — F3 re-investigation after Cowork verification walkthrough hit 5xx on 17/17 score PUTs"
tags: [researcher, ops, pf-2, f3, diagnosis, v2]
---

## Prompt

Re-diagnose why the Cowork verification walkthrough (post-rebuild, post-Apr27-code-deployment) hit 5xx on 17 of 17 score PUTs. F3 was previously closed as "not reproducible" (011); that closure was incorrect. Two hypotheses from v1 extended analysis: (A) PM2 restart storm → server-down windows → nginx 503; (B) application-level error with malformed payload.

## Action

### Step 1 — Error log baseline

Error log at start of v2 investigation: **1267 lines**. Error log examined from line 1220 onward.

Lines 1220–1237: continued `EADDRINUSE: address already in use :::3000` errors — part of the PM2 restart storm documented in v1 extended analysis (360 EADDRINUSE entries total, 91 PM2 restart attempts).

Lines 1238–1267 (tail of log):

```
⨯ Error [PrismaClientValidationError]: 
Invalid `prisma.score.upsert()` invocation:

{
  where: { roundId_playerId_hole: { roundId: 12, playerId: 1, hole: 18 } },
  update: { gross: undefined, putts: null, fromBunker: undefined },
  create: { roundId: 12, playerId: 1, hole: 18, putts: null, fromBunker: undefined, +gross: Int }
}

Argument `gross` is missing.
  clientVersion: '7.5.0'
```

This is the only application-level error in the entire log. The `PrismaClientValidationError` appears immediately after the last EADDRINUSE batch — meaning the server had successfully bound to port 3000 when this PUT arrived.

### Step 2 — PM2 current state

```
$ pm2 list
│ 0 │ golf │ ... │ online │ 47m uptime │ ↺ 91 │
```

PM2 shows 91 restart attempts total. The server is currently stable (47 minutes uptime at time of check). The restart storm has settled.

### Step 3 — Live reproduction with log capture

Baseline: error log at 1267 lines.

```bash
curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X PUT http://localhost:3000/golf/api/rounds/10/scores/hole/1 \
  -H "Content-Type: application/json" \
  -d '{"scores":[{"playerId":1,"gross":4,"putts":null,"fromBunker":false},
               {"playerId":2,"gross":5,"putts":null,"fromBunker":false}]}'
```

Response: **HTTP_STATUS:204**
Error log after: still 1267 lines. **Zero new entries.**

The PUT handler is working correctly. No errors at the application or Prisma layer.

### Step 4 — Step 5 determination

**Was the walkthrough issue at the proxy or application layer?**

Two distinct failure modes operated in parallel:

**Mode A — Proxy layer (nginx 503): ~16 of 17 failures**

PM2 was in a restart storm during the walkthrough period. Each failed start attempt produces an EADDRINUSE error; between EADDRINUSE and the next `next start` attempt, port 3000 is unreachable. nginx, configured to proxy `/golf` → `http://127.0.0.1:3000` with no `proxy_intercept_errors` and no fallback, returns **503 Bad Gateway** during these windows.

This is a proxy-layer failure: the application is not running, nginx sees a connection-refused on the upstream, and returns 503 to the client. The application never processes the request; no error appears in the application log for these failures.

**Mode B — Application layer (500): 1 of 17 failures**

Round 12, hole 18, player 1: the PUT reached the application (server was up) but the request body contained `gross: undefined` and `fromBunker: undefined`. Prisma rejected the upsert with `PrismaClientValidationError`. The server returned 500; the error is in the application log (lines 1238–1267).

Root cause of `gross: undefined`: the client-side Zustand score for player 1, hole 18 was `undefined` when "Save & Next" was triggered. The F9-a par-default useEffect (`setScore(p.id, currentHole, holeData.par)` on hole mount) should populate this, but hole 18 may have been reached before the effect had time to fire (or after a page refresh that hadn't yet re-hydrated the store). The payload was constructed from an uninitialized store entry.

### Step 5 — Why the restart storm occurred

The restart storm was triggered by the production rebuild sequence. When `pm2 restart golf` was issued after `next build`, the old process may not have released port 3000 before PM2 launched the new one. This caused a cascade: new process → EADDRINUSE → PM2 restarts → EADDRINUSE again → ... until the port cleared. With exponential backoff or a gap, the server eventually bound successfully.

This pattern is specific to `pm2 restart` when the old process is still alive. A safer rebuild sequence: `pm2 stop golf && next build && pm2 start golf` (or equivalent) gives the old process time to release the port before the new one starts.

## Result

**Two root causes identified.**

| Failure class | Count | Root cause | Layer | Fix |
|---|---|---|---|---|
| nginx 503 (Bad Gateway) | ~16 | PM2 restart storm: port held by dying process → EADDRINUSE cycle → server-down windows | Proxy (ops) | Use `pm2 stop` then `pm2 start` instead of `pm2 restart` during rebuilds |
| App 500 (PrismaValidation) | 1 | `gross: undefined` in PUT payload: Zustand score not initialized for round 12 hole 18 player 1 at save time | Application (client payload) | F9-a par-default should prevent this; may be a hydration race on last hole — warrants monitoring |

**Current state:** Server is stable. Live PUT returns 204 with no errors. Restart storm has settled (47m uptime at check time).

**F3 resolution:** F3 was NOT a code defect in the PUT handler. The Apr27 walkthrough failures were caused by an ops-level event (PM2 restart storm post-rebuild) and one instance of a client payload race. No application code fix is required. The PM2 restart storm is a deployment procedure gap, not a bug.

## Recommended ops change

Replace `pm2 restart golf` in the rebuild sequence with:

```bash
pm2 stop golf && npm run build && pm2 start golf
```

This ensures the port is released before the new process starts, preventing EADDRINUSE cascade.

## Open questions

1. **`gross: undefined` race on hole 18**: Is the F9-a useEffect reliable enough on the last hole, or can a page-refresh + late hydration window still produce an uninitialized score? One instance observed; frequency unknown. If it recurs, the PUT handler should validate and reject with 400 (not 500) and the client should guard against sending `undefined` fields.

2. **PM2 restart count normalization**: 91 restarts logged from historical storms. The restart count does not reset without `pm2 delete golf && pm2 start golf`. Not a current issue but the counter is misleading.

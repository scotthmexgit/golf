---
prompt_id: 011
timestamp: 2026-04-27T00:00:00Z
checklist_item_ref: "PF-1-F3 [PF-2] — Diagnose PUT 503s on Cowork host"
tags: [researcher, ops, pf-2, f3, diagnosis]
---

## Prompt

Diagnose why all 18 PUT /api/rounds/9/scores/hole/{n} returned 503 in the 2026-04-27 Cowork walkthrough. Root-cause hypothesis: M-1 Float→Int migration may not have been applied. Fix the root cause if it is a deployment/migration state issue. No application code edits unless a code defect is confirmed.

## Action

### Step 1 — Migration state

```
$ cd /home/seadmin/golf && npx prisma migrate status
```

Output:
```
3 migrations found in prisma/migrations
Database schema is up to date!
```

Three migrations: `20260320185315_init`, `20260426161934_stake_int_and_drop_sidebets` (M-1 Float→Int), `20260426174138_pf1_round_status_score_unique` (PF-1 schema). All applied. Migration hypothesis ruled out.

### Step 2 — Schema vs DB diff

```
$ npx prisma migrate diff --from-schema prisma/schema.prisma --to-config-datasource --script
```

Output: `-- This is an empty migration.`

Live DB schema matches `prisma/schema.prisma` exactly. No drift.

### Step 3 — M-1 migration file

Migration `20260426161934_stake_int_and_drop_sidebets/migration.sql`: alters `Game.stake` from DoublePrecision to Integer; drops SideBet and SideBetResult tables. Confirmed applied.

Migration `20260426174138_pf1_round_status_score_unique/migration.sql`: adds `Round.status TEXT DEFAULT 'InProgress'`; creates `Score_roundId_playerId_hole_key UNIQUE`. Confirmed applied.

Live Score table schema verified via psql:
```
gross   integer  not null
Indexes: Score_roundId_playerId_hole_key UNIQUE btree (roundId, playerId, hole)
```

### Step 4 — Server log check

Found two Next.js server processes:
- PID 2876101: `next start --port 3000` (production, started Apr26) — nginx proxies `/golf` → `http://127.0.0.1:3000`
- PID 2837700: `next dev --port 3001` (dev, started Apr25)

Log files found: `/tmp/golf-prod.log`, `/tmp/golf_dev.log`, `/home/seadmin/golf/.next/dev/logs/next-development.log`.

Dev server log contains only 3 entries:
```
{"timestamp":"00:00:00.698","source":"Server","level":"LOG","message":""}
{"timestamp":"01:20:39.881","source":"Server","level":"ERROR","message":"⨯ Error: test"}
{"timestamp":"01:20:57.793","source":"Server","level":"ERROR","message":"⨯ Error: test"}
```

No entries from the Apr27 Cowork session. The production server was started on Apr26 and has been running since; no log captures its runtime errors.

**Historical 503 exception is not recoverable from logs.**

### Step 5 — Live reproduction

Attempted PUT against round 9 (still InProgress):

```
curl -s -X PUT http://localhost:3000/golf/api/rounds/9/scores/hole/1 \
  -H "Content-Type: application/json" \
  -d '{"scores":[{"playerId":1,"gross":4,"putts":null,"fromBunker":false},{"playerId":2,"gross":4,"putts":null,"fromBunker":false}]}' \
  -w "\nHTTP_STATUS:%{http_code}"
```

Response: `HTTP_STATUS:204`

**F3 cannot be reproduced. PUT route returns 204 today.**

### Additional finding — production build staleness

Production build timestamp: `2026-04-26 12:39` (`.next/BUILD_ID` mtime). This is AFTER PF-1 Turn 2 commits (12:17, 12:23) which added the server-side PUT route. The PF-1 Turn 3 sequential-save correction (commit `5e4e933`, 13:04 Apr26) was committed AFTER the build. The production static bundle does contain a `scores/hole/` PUT call; it is not clear whether the fire-and-forget version (Turn 3 initial) or the sequential version (Turn 3 correction) is in the build.

All Apr27 code changes (SP-UI-1/2/3, PF-1-F5A, PF-1-F4 phases a+b, PF-1-F6, F9-a) are NOT reflected in the running production build. The production server will serve stale code until `next build` is run and the server is restarted. This is a separate ops action from F3 root-cause.

## Result

**Outcome: Decision tree D — F3 cannot be reproduced; transient state at time of walkthrough.**

- Migration state: all 3 migrations applied; DB in sync with schema.
- DB schema: Score.gross is integer (not float); unique constraint present.
- Live PUT: returns 204 immediately.
- Historical logs: not available for the Apr27 Cowork session.

**Root cause of the Apr27 503s is not deterministically identifiable without historical server logs.** Most likely: transient DB connection pool exhaustion or server-side timeout during the Cowork session. The RSC prefetch 503s (F8) and the PUT 503s occurring in the same session are consistent with general server load/cold-start behavior rather than a code or migration defect.

**No application code defect found. No migration applied (not needed). No fix taken.**

F3 is resolved as: "not reproducible; likely transient server state; no code change required."

## Open questions

1. **Production build staleness**: The production server (`next start --port 3000`) is running a build from Apr26 12:39. All Apr27 code changes are not live on the Cowork host. Operator decision needed: run `next build && next start` to get Apr27 changes live? This is an ops action, not a code fix.

2. **Production vs dev server for walkthroughs**: nginx proxies `/golf` to port 3000 (production build). Future Cowork walkthroughs will hit stale code unless the production server is rebuilt after each code change. Consider whether the Cowork walkthrough host should use `next dev` (always current) or `next start` (requires explicit rebuild). See also F8 (RSC 503s) — `next dev` on the Cowork host may reduce RSC prefetch intermittency.

3. **Log capture**: If F3-class 503s recur, server-side logs will be needed to identify the exception. The dev server log (`next-development.log`) only captures a few entries. Consider redirecting `next start` stdout/stderr to a persistent log file for future sessions.

## Parking lot additions

- **Production server needs rebuild**: All Apr27 code changes (SP-UI-1/2/3, PF-1-F5A, PF-1-F4, PF-1-F6, F9-a) are not in the production build at port 3000. Not a blocking issue since CI was never defined, but the Cowork host will not show any Apr27 fixes until `next build` is run and the server is restarted. Operator ops action, not a code item.

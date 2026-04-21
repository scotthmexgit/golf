diff --git a/IMPLEMENTATION_CHECKLIST.md b/IMPLEMENTATION_CHECKLIST.md
index ea3b851..28e6254 100644
--- a/IMPLEMENTATION_CHECKLIST.md
+++ b/IMPLEMENTATION_CHECKLIST.md
@@ -69,6 +69,10 @@ Untriaged. Dated and sourced to a prompt. Triage at EOD-FINAL or on explicit req
 
 - [ ] SKILL.md NNN-format redundancy: new inline note and trailing standalone sentence overlap — consider a future tightening pass — 2026-04-20 — prompt 006
 - [ ] wolf.test.ts has 4 stale references to `teeOrder` in describe names + one inline comment (lines 314, 317, 337, 364) that describe logic that now uses `roundCfg.players[]`. Fence sentence prevented updates in #3; not functional defect; worth a cosmetic pass in a later cleanup — 2026-04-20 — prompt 007
+- [ ] Stroke Play is played in several formats including Front 9, Back 9, Total 18. Investigate methods to make the UI simple and intuitive. No junk bets for skins — amount is based on chosen bet format. Could be 3 bets if the user selects Front 9 winner, Back 9 winner, and Total winner as the option. — 2026-04-21 — prompt 001
+- [ ] On the Closest to the Pin screens, all players are shown for Bingo Bango Bongo. Unclear whether other bet types have the same issue. Investigate. — 2026-04-21 — prompt 001
+- [ ] `makeRoundCfg` helpers in `skins.test.ts` (line 51), `stroke_play.test.ts` (line 55), and `wolf.test.ts` (line 55) all retain unused `betId` defaults after commit 3 drops their sole non-default callers; parameters are now dead code — cosmetic cleanup, not bundled into commit 3 — 2026-04-21 — prompt 021
+- [ ] Stress-test the refactored engines (Skins, Wolf, Stroke Play, Nassau once Phase 2 Turn 2 lands) with end-to-end sample data to surface integration issues unit tests don't catch — particularly around serialization boundaries and the bet-id string-lookup refactor's assumptions — 2026-04-21 — prompt 033
 
 ## Done
 

/**
 * Skins flow smoke test — SK-4 closure spec.
 *
 * Covers per plan §SK-4 assertion groups:
 *   §1  Setup: 3-player round with Skins bet (escalating=true, $5/skin)
 *   §2  Carry scenario: hole 6 ties → carry; hole 7 decisive → scorecard shows +$20 delta
 *   §3  R4 reload: after holes 1–6, reload; hole 7 delta shows carry intact (not finalized early)
 *   §4  Bet Details Sheet: "Skins +$20.00" on hole 7, "Skins —" on hole 6 (tied/carry)
 *   §5  Finish flow: complete all 18 holes, finish the round
 *   §6  Results page: zero-sum, correct per-player payouts
 *   §7  DB: Round.status = 'Complete' after finish
 *   §8  Fence tokens: computeSkins absent from payouts.ts; Wolf/Nassau/Match Play absent from picker
 *
 * Fixture (18-hole, 3 players):
 *   Alice: hcpIndex=18 → effectiveCourseHcp=18 → strokesOnHole(18, idx)=1 per hole → nets 3 at gross 4
 *   Bob, Carol: hcpIndex=0 (scratch) → net = gross
 *
 *   Holes 1–5:  all gross 4 → Alice nets 3, Bob/Carol net 4 → Alice wins (no carry)
 *   Hole 6:     Bob=3, Carol=3 gross → all net 3 (Bob/Carol 3−0, Alice 4−1) → tied → SkinCarried
 *   Holes 7–18: all gross 4 → Alice nets 3, others net 4 → Alice wins each
 *               Hole 7 absorbs hole-6 carry → 2-skin pot
 *
 *   Expected settlement (minor units):
 *     Alice:  +1000×5 + 2000 + 1000×11 = +18000  (= +$180.00)
 *     Bob:    −500×5  − 1000 − 500×11  = −9000   (= −$90.00)
 *     Carol:  same as Bob                         (= −$90.00)
 *   Zero-sum: 18000 − 9000 − 9000 = 0 ✓
 */

import { test, expect } from '@playwright/test'
import { Client } from 'pg'
import * as fs from 'fs'

const DB_URL = 'postgresql://golfapp:changeme@localhost:5432/golfdb'

async function dbRoundStatus(roundId: number): Promise<string | null> {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()
  try {
    const { rows } = await client.query<{ status: string }>(
      'SELECT status FROM "Round" WHERE id = $1',
      [roundId],
    )
    return rows[0]?.status ?? null
  } finally {
    await client.end()
  }
}

function extractRoundId(url: string): number | null {
  const m = url.match(/\/(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

// ── helpers ───────────────────────────────────────────────────────────────────

// Click Alice's (nth=0), Bob's (nth=1), or Carol's (nth=2) stepper decrement.
// Stepper decrement buttons have class rounded-l-lg; there are exactly 3 on a
// 3-player scorecard.
function decrementBtn(page: import('@playwright/test').Page, playerIndex: 0 | 1 | 2) {
  return page.locator('button.rounded-l-lg').nth(playerIndex)
}

async function saveHoleAndAdvance(
  page: import('@playwright/test').Page,
  holeNum: number,
  isLast: boolean,
): Promise<void> {
  if (isLast) {
    await Promise.all([
      page.waitForResponse(
        r => r.url().includes(`/scores/hole/${holeNum}`) && r.request().method() === 'PUT',
      ),
      page.waitForResponse(
        r => /\/api\/rounds\/\d+$/.test(r.url()) && r.request().method() === 'PATCH',
      ),
      page.waitForURL(/\/golf\/results\/\d+/),
      page.getByRole('button', { name: 'Finish Round →' }).click(),
    ])
  } else {
    await Promise.all([
      page.waitForResponse(
        r => r.url().includes(`/scores/hole/${holeNum}`) && r.request().method() === 'PUT',
      ),
      page.getByRole('button', { name: 'Save & Next Hole →' }).click(),
    ])
  }
}

// ── test ──────────────────────────────────────────────────────────────────────

test('skins flow: SK-4 §1–§8 closure spec', async ({ page }) => {

  // ── §1 SETUP ─────────────────────────────────────────────────────────────────

  await page.goto('/golf')
  await page.getByRole('link', { name: 'Start New Round' }).click()
  await page.waitForURL('**/round/new')

  // Course — Chambers Bay, 18 holes
  await page.locator('input[placeholder="Type to filter..."]').fill('Chambers')
  await page.getByRole('button', { name: /Chambers Bay/ }).click()
  await page.getByRole('button', { name: 'Continue →' }).click()

  // Players — Alice (hcp 18), Bob, Carol (both scratch)
  await page.locator('input[placeholder="Golfer 1"]').fill('Alice')
  await page.getByRole('button', { name: /Add Golfer 2/ }).click()
  await page.locator('input[placeholder="Golfer 2"]').fill('Bob')
  await page.getByRole('button', { name: /Add Golfer 3/ }).click()
  await page.locator('input[placeholder="Golfer 3"]').fill('Carol')

  // Set Alice's handicap index to 18; Bob and Carol remain at 0 (default)
  const hcpInputs = page.locator('input[type="number"]')
  await hcpInputs.nth(0).fill('18')

  await page.getByRole('button', { name: 'Continue →' }).click()

  // §8 FENCE CHECK: still-parked engines absent from picker; live bets present
  const pickerSection = page.locator('div').filter({ hasText: /Add a game/ }).first()
  const pickerText = await pickerSection.textContent() ?? ''
  // Nassau and Match Play remain parked (disabled: true in GAME_DEFS)
  for (const token of ['Nassau', 'Match Play']) {
    expect(pickerText, `Parked game "${token}" must not appear in picker`).not.toContain(token)
  }
  // Skins live after SK-2; Wolf live after WF-1
  expect(pickerText, 'Skins must appear in picker').toContain('Skins')
  expect(pickerText, 'Wolf must appear in picker (unparked WF-1)').toContain('Wolf')

  // Add Skins — enable escalating (store default is false; toggle to true)
  await page.getByRole('button', { name: 'Skins' }).click()
  await page.getByLabel('Escalating skins').check()

  // §8 FENCE: junk section visible in Skins card (cosmetic; doesn't affect settlement)
  const junkSection = page.locator('button', { hasText: /Junk \/ Side Bets/ })
  await expect(junkSection).toBeVisible()

  await page.getByRole('button', { name: 'Continue →' }).click()
  await page.getByRole('button', { name: /Tee It Up/ }).click()
  await page.waitForURL(/\/golf\/scorecard\/\d+/)
  await page.waitForLoadState('networkidle')

  const roundId = extractRoundId(page.url())
  expect(roundId, 'Round ID must be present in URL').not.toBeNull()

  // Discover Alice's player ID from data-testid (IDs are UUIDs in fresh wizard rounds)
  await page.waitForSelector('[data-testid^="hole-bet-total-"]')
  const aliceTestId = await page.locator('[data-testid^="hole-bet-total-"]').first().getAttribute('data-testid')
  const aliceId = aliceTestId!.replace('hole-bet-total-', '')
  // Note: per-game breakdown is now in BetDetailsSheet (WF-3). Sheet testids:
  //   sheet-row-{hole}-{pid}           — tap to expand player row in sheet
  //   sheet-breakdown-{hole}-{pid}-{gameId} — per-game delta row in sheet

  // ── §2 CARRY SCENARIO — holes 1–5: Alice wins; hole 6: tie; hole 7: decisive ─

  // Holes 1–5: all players score par (4). Alice nets 3 (1 stroke from hcp=18), wins each.
  for (let hole = 1; hole <= 5; hole++) {
    await saveHoleAndAdvance(page, hole, false)
    if (hole < 5) {
      await expect(page.locator('div').filter({ hasText: `Hole ${hole + 1}` }).first()).toBeVisible()
    }
  }

  // Hole 6: Bob scores 3 (click −), Carol scores 3 (click −). Alice stays at par 4.
  // All net 3 → tied → SkinCarried.
  await expect(page.locator('div').filter({ hasText: 'Hole 6' }).first()).toBeVisible()
  await decrementBtn(page, 1).click()  // Bob 4→3
  await decrementBtn(page, 2).click()  // Carol 4→3
  await page.waitForTimeout(100)

  // §4 BET DETAILS SHEET — hole 6 (tied/carry): sheet breakdown shows "—" for Skins
  const aliceBetBtn6 = page.locator(`[data-testid="hole-bet-total-${aliceId}"]`)
  await aliceBetBtn6.click()  // opens BetDetailsSheet (WF-3: Bet-row now routes to sheet)
  await page.waitForTimeout(300)  // allow slide-up animation (300ms)
  // Expand Alice's hole 6 row in the sheet
  await page.locator(`[data-testid="sheet-row-6-${aliceId}"]`).click()
  await page.waitForTimeout(100)
  // Hole 6 is a tie (SkinCarried, no points) → sheet shows "—"
  const aliceBreakdown6 = page.locator(`[data-testid^="sheet-breakdown-6-${aliceId}-"]`)
  await expect(aliceBreakdown6).toBeVisible()
  const aliceBreakdown6Text = await aliceBreakdown6.textContent()
  expect(aliceBreakdown6Text?.trim(), 'Hole 6 tied: sheet shows Skins —').toContain('—')
  await page.getByRole('button', { name: 'Close round summary' }).click()
  await page.waitForTimeout(200)  // allow slide-down animation

  await saveHoleAndAdvance(page, 6, false)
  await expect(page.locator('div').filter({ hasText: 'Hole 7' }).first()).toBeVisible()

  // ── §3 R4 RELOAD — after holes 1–6, reload; verify carry intact on hole 7 ─────

  // Navigate to hole 7 (first incomplete). Scores should auto-load from DB.
  await page.reload()
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('[data-testid^="hole-bet-total-"]')

  // F9-a fires on mount: sets hole 7 scores to par for all players.
  // With F9-a: Alice=4, Bob=4, Carol=4. Alice nets 3 (hcp), others net 4. Alice wins.
  // finalizeSkinsRound absorbs hole-6 carry → hole 7 SkinWon has multiplier=2.
  // Alice's hole-7 delta: +2000 minor units = +$20.00.
  await page.waitForTimeout(300)  // allow F9-a effect + useMemo recompute

  // §4 BET DETAILS SHEET — hole 7 (decisive, carry absorbed): sheet shows "+$20.00"
  const aliceBetBtn7 = page.locator(`[data-testid="hole-bet-total-${aliceId}"]`)
  await aliceBetBtn7.click()  // opens BetDetailsSheet
  await page.waitForTimeout(300)  // allow slide-up animation
  // Expand Alice's hole 7 row in the sheet
  await page.locator(`[data-testid="sheet-row-7-${aliceId}"]`).click()
  await page.waitForTimeout(100)
  const aliceBreakdown7 = page.locator(`[data-testid^="sheet-breakdown-7-${aliceId}-"]`)
  await expect(aliceBreakdown7).toBeVisible()
  const aliceBreakdown7Text = await aliceBreakdown7.textContent()
  expect(aliceBreakdown7Text?.trim(), 'Hole 7 carry absorbed: sheet shows Skins +$20.00').toContain('+$20.00')
  // §3 R4 VERIFICATION: carry was NOT prematurely resolved (if R4 bug existed, hole-6
  // carry would have been split between tied players and hole 7 would show +$10.00 only)
  expect(aliceBreakdown7Text?.trim(), 'R4 verified: hole-7 delta is +$20.00 not +$10.00 (carry intact)').not.toContain('+$10.00')
  await page.getByRole('button', { name: 'Close round summary' }).click()
  await page.waitForTimeout(200)  // allow slide-down animation

  // §2 CARRY: also assert the scorecard bottom row shows +$20.00 for Alice on hole 7
  const aliceTotalRow7 = page.locator(`[data-testid="hole-bet-total-${aliceId}"]`)
  const totalText7 = await aliceTotalRow7.textContent()
  expect(totalText7, 'Hole 7 bottom row shows +$20.00 for Alice (carry scenario)').toContain('+$20.00')

  // ── §5 FINISH FLOW — score holes 7–18 ────────────────────────────────────────

  // Hole 7: save current scores (all par; Alice wins with carry delta already verified above)
  await saveHoleAndAdvance(page, 7, false)
  await expect(page.locator('div').filter({ hasText: 'Hole 8' }).first()).toBeVisible()

  // Holes 8–17: all par (Alice nets 3, others net 4; Alice wins each; no carries)
  for (let hole = 8; hole <= 17; hole++) {
    await saveHoleAndAdvance(page, hole, false)
    if (hole < 17) {
      await expect(page.locator('div').filter({ hasText: `Hole ${hole + 1}` }).first()).toBeVisible()
    }
  }

  // Hole 18: last hole. The header Finish button and "Finish Round →" bottom button appear.
  await expect(page.locator('div').filter({ hasText: 'Hole 18' }).first()).toBeVisible()
  await saveHoleAndAdvance(page, 18, true)

  // ── §6 RESULTS PAGE ───────────────────────────────────────────────────────────

  await page.waitForLoadState('networkidle')

  // §7 DB: Round.status = 'Complete'
  const status = await dbRoundStatus(roundId!)
  expect(status, `Round ${roundId} must have status='Complete' in DB`).toBe('Complete')

  // Money summary: 3 players. Expected (minor units):
  //   Alice: +18000 = +$180.00
  //   Bob:   −9000  = −$90.00
  //   Carol: −9000  = −$90.00
  // formatMoneyDecimal renders as "+$180.00", "−$90.00", "−$90.00"
  const payoutSpans = page.locator('span.font-mono.text-sm.font-bold')
  await expect(payoutSpans).toHaveCount(3)

  const payoutTexts = await payoutSpans.allTextContents()
  const winnerCount = payoutTexts.filter(t => t === '+$180.00').length
  const loserCount = payoutTexts.filter(t => t === '-$90.00').length

  expect(winnerCount, 'Alice wins +$180.00').toBe(1)
  expect(loserCount, 'Bob and Carol each lose -$90.00').toBe(2)

  // Zero-sum check (algebraic): 180 − 90 − 90 = 0 ✓ (verified by the above two counts)

  // ── §8 FENCE: computeSkins absent from payouts.ts ─────────────────────────────

  const payoutsSource = fs.readFileSync('./src/lib/payouts.ts', 'utf-8')
  expect(payoutsSource, 'computeSkins must be absent from payouts.ts (grep gate)').not.toContain('computeSkins')
})

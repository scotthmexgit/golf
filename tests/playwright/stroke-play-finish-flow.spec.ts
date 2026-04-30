/**
 * Stroke Play finish-flow smoke test.
 *
 * Covers:
 *   SP-UI-7 Fix A — Round.status written to Complete via bottom "Finish Round →" button
 *   SP-UI-7 Fix B — Header Finish button absent on holes 1-17, present on hole 18
 *   SP-4 §4     — Settlement correctness (zero-sum, winner +$15, losers -$5)
 *   SP-4 §4     — Recent Rounds: finished round has no IN PROGRESS badge
 *   Fence check  — Parked game names + junk tokens absent from Games step
 *
 * Players: Alice (hcp 0), Bob (hcp 3), Carol (hcp 8), Dave (hcp 12)
 * Course:  Chambers Bay, 18 holes, stake $5/round
 * Expected winner at par scores: Dave (net 60, most handicap strokes)
 * Expected settlement: Dave +$15.00, others -$5.00 each
 */

import { test, expect } from '@playwright/test'
import { Client } from 'pg'

const DB_URL = 'postgresql://golfapp:changeme@localhost:5432/golfdb'

// ── helpers ──────────────────────────────────────────────────────────────────

async function dbRoundStatus(roundId: number): Promise<string | null> {
  const client = new Client({ connectionString: DB_URL })
  await client.connect()
  try {
    const { rows } = await client.query<{ status: string }>(
      'SELECT status FROM "Round" WHERE id = $1',
      [roundId]
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

// ── test ──────────────────────────────────────────────────────────────────────

test('stroke play finish flow: SP-UI-7 + SP-4 §4 closure', async ({ page }) => {

  // ── STEP 1: Home → Start New Round ─────────────────────────────────────────
  await page.goto('/golf')
  await page.getByRole('link', { name: 'Start New Round' }).click()
  await page.waitForURL('**/round/new')

  // ── STEP 2: Course — Chambers Bay, 18 holes ────────────────────────────────
  await page.locator('input[placeholder="Type to filter..."]').fill('Chambers')
  // Course buttons: click the one containing "Chambers Bay"
  await page.getByRole('button', { name: /Chambers Bay/ }).click()
  // "18" pill is active by default — no action needed
  // Date defaults to today — no action needed
  await page.getByRole('button', { name: 'Continue →' }).click()

  // ── STEP 3: Players — Alice (hcp 0), Bob (hcp 3), Carol (hcp 8), Dave (hcp 12)
  // Golfer 1 (Alice) is pre-filled; name it and leave hcp at 0
  await page.locator('input[placeholder="Golfer 1"]').fill('Alice')

  // Add Bob
  await page.getByRole('button', { name: /Add Golfer 2/ }).click()
  await page.locator('input[placeholder="Golfer 2"]').fill('Bob')

  // Add Carol
  await page.getByRole('button', { name: /Add Golfer 3/ }).click()
  await page.locator('input[placeholder="Golfer 3"]').fill('Carol')

  // Add Dave
  await page.getByRole('button', { name: /Add Golfer 4/ }).click()
  await page.locator('input[placeholder="Golfer 4"]').fill('Dave')

  // Set handicap indices. PlayerCard has one number input per card; on this step
  // that's the only number inputs on the page.
  const hcpInputs = page.locator('input[type="number"]')
  await hcpInputs.nth(0).fill('0')   // Alice
  await hcpInputs.nth(1).fill('3')   // Bob
  await hcpInputs.nth(2).fill('8')   // Carol
  await hcpInputs.nth(3).fill('12')  // Dave

  await page.getByRole('button', { name: 'Continue →' }).click()

  // ── STEP 4: Games — add Stroke Play + FENCE CHECK ─────────────────────────
  // Fence assertion: still-parked game names must not appear as picker pills.
  // Skins unparked SK-2; Wolf unparked WF-1; Nassau/Match Play remain parked.
  const gamePickerSection = page.locator('div').filter({ hasText: /^\+ Add a game/ }).first()
  const pickerText = await gamePickerSection.textContent() ?? ''
  for (const token of ['Nassau', 'Match Play']) {
    expect(pickerText, `Parked game "${token}" should not appear in picker`).not.toContain(token)
  }
  // Skins live after SK-2; Wolf live after WF-1.
  expect(pickerText, 'Skins should appear in picker').toContain('Skins')
  expect(pickerText, 'Wolf should appear in picker (unparked WF-1)').toContain('Wolf')

  // Add Stroke Play (the only enabled pill)
  await page.getByRole('button', { name: 'Stroke Play' }).click()

  // Fence assertion: junk section must not appear on the Stroke Play card
  // SP-UI-1 gate hides "Junk / Side Bets" for strokePlay type
  const pageText = await page.locator('body').textContent() ?? ''
  for (const token of ['Junk / Side Bets', 'Sandy', 'Greenie', 'Snake', 'CTP']) {
    expect(pageText, `Junk token "${token}" should not appear in Stroke Play card`).not.toContain(token)
  }

  // Stake: $5 is the default (500 cents) — no change needed

  await page.getByRole('button', { name: 'Continue →' }).click()

  // ── STEP 5: Review → Tee It Up ─────────────────────────────────────────────
  await page.getByRole('button', { name: /Tee It Up/ }).click()
  await page.waitForURL(/\/golf\/scorecard\/\d+/)

  const roundId = extractRoundId(page.url())
  expect(roundId, 'Should have extracted a numeric roundId from scorecard URL').not.toBeNull()

  // ── STEP 6: Scorecard — 18 holes ───────────────────────────────────────────
  // F9-a writes par scores on mount, so Save & Next Hole is enabled immediately.
  // Synchronise each hole via waitForResponse on the PUT.

  const headerFinishBtn = page.locator('header').getByRole('button', { name: 'Finish', exact: true })

  for (let hole = 1; hole <= 18; hole++) {
    const isLast = hole === 18

    // ASSERTION 1: SP-UI-7 Fix B — header Finish button gate
    if (isLast) {
      await expect(headerFinishBtn, 'Header Finish button must be visible on hole 18').toBeVisible()
    } else {
      await expect(headerFinishBtn, `Header Finish button must be absent on hole ${hole}`).toHaveCount(0)
    }

    if (isLast) {
      // On hole 18: click "Finish Round →", wait for the PUT score save,
      // the PATCH status update (SP-UI-7 Fix A), and navigation to /results.
      await Promise.all([
        page.waitForResponse(r =>
          r.url().includes('/scores/hole/18') && r.request().method() === 'PUT'
        ),
        page.waitForResponse(r =>
          /\/api\/rounds\/\d+$/.test(r.url()) && r.request().method() === 'PATCH'
        ),
        page.waitForURL(/\/golf\/results\/\d+/),
        page.getByRole('button', { name: 'Finish Round →' }).click(),
      ])
    } else {
      // On holes 1-17: click "Save & Next Hole →", wait for PUT, then wait for
      // the next hole to render (HoleHeader shows "Hole N+1").
      await Promise.all([
        page.waitForResponse(r =>
          r.url().includes(`/scores/hole/${hole}`) && r.request().method() === 'PUT'
        ),
        page.getByRole('button', { name: 'Save & Next Hole →' }).click(),
      ])
      // Wait for HoleHeader to advance
      await expect(
        page.locator('div').filter({ hasText: `Hole ${hole + 1}` }).first()
      ).toBeVisible()
    }
  }

  // ── ASSERTIONS ON /results/{roundId} ───────────────────────────────────────

  // ASSERTION 2: SP-UI-7 Fix A — DB status must be Complete
  const status = await dbRoundStatus(roundId!)
  expect(status, `Round ${roundId} must have status='Complete' in DB after bottom-button finish`).toBe('Complete')

  // ASSERTION 3: SP-4 §4 settlement correctness
  // Wait for results page to hydrate (server fetch on mount)
  await page.waitForLoadState('networkidle')

  // Money Summary section has `span.font-mono.text-sm.font-bold` for each player payout.
  // formatMoneyDecimal: 0→'—', positive→'+$X.XX', negative→'-$X.XX'
  const payoutSpans = page.locator('span.font-mono.text-sm.font-bold')
  await expect(payoutSpans).toHaveCount(4)

  const payoutTexts = await payoutSpans.allTextContents()
  const winnerCount = payoutTexts.filter(t => t === '+$15.00').length
  const loserCount  = payoutTexts.filter(t => t === '-$5.00').length

  expect(winnerCount, 'Exactly one player should win +$15.00').toBe(1)
  expect(loserCount,  'Exactly three players should lose -$5.00').toBe(3)

  // Zero-sum: 1500 - 500 - 500 - 500 = 0 (verified algebraically by the above two checks)

  // ASSERTION 4: Recent Rounds — no IN PROGRESS badge, href routes to /results
  await page.goto('/golf')
  // Wait for the rounds list to load (useEffect fetch)
  await page.waitForResponse(r => r.url().includes('/api/rounds') && r.request().method() === 'GET')
  await page.waitForLoadState('networkidle')

  const roundLink = page.locator(`a[href*="/results/${roundId}"]`)
  await expect(roundLink, `Finished round ${roundId} must appear as /results link`).toBeVisible()

  const progressBadge = roundLink.locator('span', { hasText: 'In Progress' })
  await expect(progressBadge, 'IN PROGRESS badge must be absent for finished round').toHaveCount(0)
})

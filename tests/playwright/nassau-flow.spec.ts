/**
 * Nassau flow E2E spec — NA-4 closure spec.
 *
 * Covers per NASSAU_PLAN.md §NA-4 assertion groups:
 *   §1  Setup: 2-player round created, Nassau auto-2-down/nine/singles configured
 *   §2  Scoring holes 1–3: Alice wins (birdie 3 vs Bob par 4); holes 4–18 tied (par)
 *   §3  Press offer: after hole 2 (front 2-up AND overall 2-up), 2-offer modal queue;
 *       Bob accepts front press (offer 1), declines overall press (offer 2)
 *   §4  Press settlement: front closes hole 7 (+$5); press-1 closes hole 9 (+$5)
 *   §5  Back 9: all tied; overall closes hole 16 (+$5); back MatchTied ($0)
 *   §6  Results: Alice +$15.00, Bob −$15.00; Round.status = 'Complete'
 *   §7  BetDetailsSheet: Nassau per-hole deltas visible mid-round (holes 7 and 9)
 *   §8  Fence: nassau unparked; matchPlay absent; skins and wolf present
 *
 * Fixture (Chambers Bay, 18 holes par 4, 2 players, both scratch hcpIndex=0):
 *   Alice: scores birdie (3) on holes 1–3; par (4) thereafter (F9-a default)
 *   Bob:   scores par (4) every hole (F9-a default — no decrement)
 *
 *   Nassau: pressRule='auto-2-down', pressScope='nine', pairingMode='singles', stake=500
 *
 *   Match timeline:
 *     Hole 1: Alice wins → front 1-0; overall 1-0; lead=1, no press offer
 *     Hole 2: Alice wins → front 2-0 AND overall 2-0 → two press offers (auto-2-down)
 *             Bob accepts front press → press-1 opens (holes 3–9, pressScope='nine')
 *             Bob declines overall press → overall settles without a press
 *     Hole 3: Alice wins → front 3-0; press-1 1-0; overall 3-0
 *     Holes 4–6: tied → no change; no further press offers (lead ≠ 2 on any open match)
 *     Hole 7: tied → front 3-0, holesRemaining=2, 3>2 → MatchClosedOut (front) → Alice +$5
 *     Hole 8: tied → press-1 1-0 (still alive)
 *     Hole 9: tied → press-1 1-0, holesRemaining=0, 1>0 → MatchClosedOut (press-1) → Alice +$5
 *     Holes 10–15: tied; overall 3-0 tracks but doesn't close yet
 *     Hole 16: tied → overall 3-0, holesRemaining=2, 3>2 → MatchClosedOut (overall) → Alice +$5
 *     Holes 17–18: tied; back 0-0 tracks
 *     Finalize: back 0-0 → MatchTied → $0
 *
 *   Settlement (minor units / display):
 *     Alice: +500 (front) + +500 (press-1) + +500 (overall) = +1500 (+$15.00)
 *     Bob:   −500         + −500           + −500           = −1500 (−$15.00)
 *   Zero-sum: 1500 − 1500 = 0 ✓
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
  const m = url.match(/\/(\d+)(?:\/|$)/)
  return m ? parseInt(m[1], 10) : null
}

// Stepper decrement (left button, class rounded-l-lg). Alice=0, Bob=1.
function decrementBtn(page: import('@playwright/test').Page, playerIndex: 0 | 1) {
  return page.locator('button.rounded-l-lg').nth(playerIndex)
}

// Save current hole by clicking "Save & Next Hole →" and waiting for PUT.
// Do NOT use for hole 18 (button label changes to "Finish Round →").
// Do NOT use for hole 2 in this fixture (press modal intercepts PUT).
async function saveHole(
  page: import('@playwright/test').Page,
  holeNum: number,
): Promise<void> {
  await Promise.all([
    page.waitForResponse(
      r => r.url().includes(`/scores/hole/${holeNum}`) && r.request().method() === 'PUT',
    ),
    page.getByRole('button', { name: 'Save & Next Hole →' }).click(),
  ])
}

// Finish hole 18: fires PUT, PATCH (status=Complete), navigates to results.
async function finishRound(page: import('@playwright/test').Page): Promise<void> {
  await Promise.all([
    page.waitForResponse(
      r => r.url().includes('/scores/hole/18') && r.request().method() === 'PUT',
    ),
    page.waitForResponse(
      r => /\/api\/rounds\/\d+$/.test(r.url()) && r.request().method() === 'PATCH',
    ),
    page.waitForURL(/\/golf\/results\/\d+/),
    page.getByRole('button', { name: 'Finish Round →' }).click(),
  ])
}

// Open BetDetailsSheet, expand a player's row for a specific hole, return the
// text content of that hole's per-game breakdown cell. Closes the sheet afterward.
async function readSheetBreakdown(
  page: import('@playwright/test').Page,
  holeNum: number,
  playerId: string,
): Promise<string> {
  await page.locator(`[data-testid="hole-bet-total-${playerId}"]`).click()
  await page.waitForTimeout(300)  // slide-up animation
  await page.locator(`[data-testid="sheet-row-${holeNum}-${playerId}"]`).click()
  await page.waitForTimeout(100)
  const breakdown = page.locator(`[data-testid^="sheet-breakdown-${holeNum}-${playerId}-"]`)
  await expect(breakdown).toBeVisible()
  const text = await breakdown.textContent() ?? ''
  await page.getByRole('button', { name: 'Close round summary' }).click()
  await page.waitForTimeout(200)  // slide-down animation
  return text.trim()
}

// ── spec ──────────────────────────────────────────────────────────────────────

test('nassau flow: NA-4 §1–§8 closure spec', async ({ page }) => {

  // ── §1 SETUP + §8 FENCE (picker) ─────────────────────────────────────────────

  await test.step('§1 Setup + §8 picker fence: 2-player Nassau round', async () => {
    await page.goto('/golf')
    await page.getByRole('link', { name: 'Start New Round' }).click()
    await page.waitForURL('**/round/new')

    // Course — Chambers Bay, 18 holes (par 4 on hole 1)
    await page.locator('input[placeholder="Type to filter..."]').fill('Chambers')
    await page.getByRole('button', { name: /Chambers Bay/ }).click()
    await page.getByRole('button', { name: 'Continue →' }).click()

    // Players — Alice (hcpIndex=0, scratch), Bob (hcpIndex=0, scratch, default)
    await page.locator('input[placeholder="Golfer 1"]').fill('Alice')
    await page.getByRole('button', { name: /Add Golfer 2/ }).click()
    await page.locator('input[placeholder="Golfer 2"]').fill('Bob')
    await page.getByRole('button', { name: 'Continue →' }).click()

    // §8 FENCE (picker): nassau present and unparked (NA-1); matchPlay absent
    const pickerSection = page.locator('div').filter({ hasText: /Add a game/ }).first()
    const pickerText = await pickerSection.textContent() ?? ''
    expect(pickerText, 'Nassau must appear in picker (unparked in NA-1)').toContain('Nassau')
    expect(pickerText, 'Wolf must appear in picker (unparked WF-1)').toContain('Wolf')
    expect(pickerText, 'Skins must appear in picker').toContain('Skins')
    expect(pickerText, 'Match Play must be absent (disabled: true in GAME_DEFS)').not.toContain('Match Play')

    // Add Nassau — card expands with press rule / scope / pairing controls
    await page.getByRole('button', { name: 'Nassau' }).click()

    // Verify Nassau card rendered (Press rule section visible)
    await expect(page.getByText('Press rule', { exact: false })).toBeVisible()

    // Configure pressRule = 'auto-2-down'. Pill label is 'Auto 2-down'; CSS capitalize
    // is visual-only so text-content stays 'Auto 2-down'. Use case-insensitive regex.
    await page.getByRole('button', { name: /auto 2.down/i }).click()

    // pressScope='nine' and pairingMode='singles' (2 players) are store defaults — no change needed

    await page.getByRole('button', { name: 'Continue →' }).click()
    await page.getByRole('button', { name: /Tee It Up/ }).click()
    await page.waitForURL(/\/golf\/scorecard\/\d+/)
    await page.waitForLoadState('networkidle')
  })

  // Capture round ID and Alice's player UUID from DOM
  const scorecardUrl = page.url()
  const roundId = extractRoundId(scorecardUrl)
  expect(roundId, 'Round ID must be present in scorecard URL').not.toBeNull()

  await page.waitForSelector('[data-testid^="hole-bet-total-"]')
  const aliceTestId = await page.locator('[data-testid^="hole-bet-total-"]').first().getAttribute('data-testid')
  const aliceId = aliceTestId!.replace('hole-bet-total-', '')
  expect(aliceId, 'Alice player UUID must be non-empty').toBeTruthy()

  // ── §2 HOLE 1 — Alice wins, no press modal ────────────────────────────────────

  await test.step('§2 Hole 1: Alice birdie, save — no press modal (lead=1, threshold=2)', async () => {
    // F9-a sets both players to par (4). Decrement Alice to birdie (3).
    await decrementBtn(page, 0).click()
    await page.waitForTimeout(100)

    await saveHole(page, 1)

    // No press modal — auto-2-down requires lead === 2; lead after hole 1 = 1
    await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)
    await expect(page.locator('div').filter({ hasText: 'Hole 2' }).first()).toBeVisible()
  })

  // ── §2 + §3 HOLE 2 — press offer fires, Bob accepts ──────────────────────────

  await test.step('§2+§3 Hole 2: Alice wins → front 2-up → press modal → Bob accepts', async () => {
    // Alice birdie (3); Bob stays at F9-a par (4)
    await decrementBtn(page, 0).click()
    await page.waitForTimeout(100)

    // Click save — press modal intercepts BEFORE the PUT fires.
    // handleSaveNext detects the offer and calls setPendingPressOffers → modal renders.
    // Do NOT use the saveHole helper here (it waits for PUT which doesn't fire until Accept).
    await page.getByRole('button', { name: 'Save & Next Hole →' }).click()

    // §3: modal must appear
    await page.waitForSelector('[data-testid="press-confirmation-modal"]')
    const modal = page.locator('[data-testid="press-confirmation-modal"]')
    await expect(modal).toBeVisible()

    // Assert modal content: Bob is down, Front 9 match
    await expect(page.locator('[data-testid="press-down-player"]')).toContainText('Bob')
    await expect(modal).toContainText('Front 9')

    // Two offers at hole 2: front (2-0, lead=2) AND overall (also 2-0, lead=2).
    // Accept offer 1 (Front 9) — advances queue to offer 2, no PUT yet.
    await page.locator('[data-testid="press-accept"]').click()
    await page.waitForTimeout(150)  // allow React to render offer 2

    // Offer 2 of 2: Overall — Bob is down; decline to keep settlement at +$15 total.
    // Declining the last offer triggers onComplete → proceedSave → PUT fires.
    await expect(modal).toContainText('Overall')
    await Promise.all([
      page.waitForResponse(
        r => r.url().includes('/scores/hole/2') && r.request().method() === 'PUT',
      ),
      page.locator('[data-testid="press-decline"]').click(),
    ])

    // Modal dismissed; front press-1 is open (holes 3–9); overall press was declined
    await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)
    await expect(page.locator('div').filter({ hasText: 'Hole 3' }).first()).toBeVisible()
  })

  // ── §4 HOLE 3 — Alice wins, press-1 tracking (1-up), no second offer ─────────

  await test.step('§4 Hole 3: Alice wins → press-1 1-up; no press offer (lead≠2)', async () => {
    // Alice birdie (3)
    await decrementBtn(page, 0).click()
    await page.waitForTimeout(100)
    await saveHole(page, 3)

    // No press offer: press-1 lead=1, auto-2-down requires exactly 2
    await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)
    await expect(page.locator('div').filter({ hasText: 'Hole 4' }).first()).toBeVisible()
  })

  // ── §4 HOLES 4–6 — both par, all tied, no press ───────────────────────────────

  await test.step('§4 Holes 4–6: par for both; no press modal', async () => {
    for (let hole = 4; hole <= 6; hole++) {
      await saveHole(page, hole)
      await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)
    }
    await expect(page.locator('div').filter({ hasText: 'Hole 7' }).first()).toBeVisible()
  })

  // ── §4 + §7 HOLE 7 — front closes (3-up, 2 remaining → 3>2), sheet check ─────

  await test.step('§4+§7 Hole 7: front closes; BetDetailsSheet shows Alice Nassau +$5.00', async () => {
    await saveHole(page, 7)
    // Now on hole 8 — front match settled with Alice +$5 (MatchClosedOut hole 7)
    await expect(page.locator('div').filter({ hasText: 'Hole 8' }).first()).toBeVisible()

    // §7: open BetDetailsSheet, check Nassau delta for Alice on hole 7
    const text7 = await readSheetBreakdown(page, 7, aliceId)
    expect(text7, '§4+§7 front closeout (hole 7): Alice Nassau delta = +$5.00').toContain('+$5.00')
  })

  // ── §4 HOLE 8 — save, press-1 still alive (1-up, 1 remaining) ────────────────

  await test.step('§4 Hole 8: save, press-1 alive (1-up, 1 remaining); no modal', async () => {
    await saveHole(page, 8)
    await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)
    await expect(page.locator('div').filter({ hasText: 'Hole 9' }).first()).toBeVisible()
  })

  // ── §4 + §7 HOLE 9 — press-1 closes (1-up, 0 remaining → 1>0), sheet check ───

  await test.step('§4+§7 Hole 9: press-1 closes; BetDetailsSheet shows Alice Nassau +$5.00', async () => {
    await saveHole(page, 9)
    // Now on hole 10 — press-1 settled with Alice +$5 (MatchClosedOut hole 9)
    await expect(page.locator('div').filter({ hasText: 'Hole 10' }).first()).toBeVisible()

    // §7: open BetDetailsSheet, check Nassau delta for Alice on hole 9
    const text9 = await readSheetBreakdown(page, 9, aliceId)
    expect(text9, '§4+§7 press-1 closeout (hole 9): Alice Nassau delta = +$5.00').toContain('+$5.00')
  })

  // ── §5 BACK 9 — holes 10–17 (no presses; overall closes hole 16) ─────────────

  await test.step('§5 Holes 10–17: back 9 in progress; no press modals', async () => {
    // All par; no Nassau match has lead=2 on any open match.
    // Overall closes at hole 16 (3-up, 2 remaining → 3>2 → MatchClosedOut); no modal.
    for (let hole = 10; hole <= 17; hole++) {
      await saveHole(page, hole)
      await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)
    }
    await expect(page.locator('div').filter({ hasText: 'Hole 18' }).first()).toBeVisible()
  })

  // ── §5 HOLE 18 — finish round ─────────────────────────────────────────────────

  await test.step('§5 Hole 18: finish round (PUT + PATCH + navigate to results)', async () => {
    await finishRound(page)
  })

  // ── §6 RESULTS PAGE ───────────────────────────────────────────────────────────

  await test.step('§6 Results: Alice +$15.00, Bob −$15.00; status=Complete; zero-sum', async () => {
    await page.waitForLoadState('networkidle')

    // DB check: Round.status = 'Complete'
    const status = await dbRoundStatus(roundId!)
    expect(status, `Round ${roundId} must have status='Complete' in DB`).toBe('Complete')

    // Settlement:
    //   Front (closes hole 7):   Alice +500, Bob −500
    //   Press-1 (closes hole 9): Alice +500, Bob −500
    //   Overall (closes hole 16): Alice +500, Bob −500
    //   Back (MatchTied hole 18): $0, $0
    //   Total: Alice +1500 (+$15.00), Bob −1500 (−$15.00)
    const payoutSpans = page.locator('span.font-mono.text-sm.font-bold')
    await expect(payoutSpans).toHaveCount(2)

    const payoutTexts = await payoutSpans.allTextContents()
    const winnerCount = payoutTexts.filter(t => t === '+$15.00').length
    const loserCount = payoutTexts.filter(t => t === '-$15.00').length
    expect(winnerCount, '§6 Alice must show +$15.00').toBe(1)
    expect(loserCount, '§6 Bob must show -$15.00').toBe(1)
    // Zero-sum: 15 − 15 = 0 ✓ (verified algebraically by the two counts above)
  })

  // ── §8 FENCE — code-level GAME_DEFS check ─────────────────────────────────────

  await test.step('§8 Fence: nassau not disabled in GAME_DEFS; matchPlay still disabled', async () => {
    const typesSource = fs.readFileSync('./src/types/index.ts', 'utf-8')
    const lines = typesSource.split('\n')

    // Find the nassau GAME_DEFS entry and verify disabled: true is absent
    // Nassau entry is a single line; check that line only (adjacent entries may have disabled)
    const nassauLineIdx = lines.findIndex(l => l.includes("key: 'nassau'"))
    expect(nassauLineIdx, "nassau key must exist in src/types/index.ts GAME_DEFS").toBeGreaterThan(-1)
    expect(lines[nassauLineIdx], '§8 nassau GAME_DEFS line must not contain "disabled" (unparked NA-1)').not.toContain('disabled')

    // matchPlay entry: find its line and confirm disabled: true is present
    const matchPlayLineIdx = lines.findIndex(l => l.includes("key: 'matchPlay'"))
    expect(matchPlayLineIdx, "matchPlay key must exist in src/types/index.ts GAME_DEFS").toBeGreaterThan(-1)
    expect(lines[matchPlayLineIdx], '§8 matchPlay GAME_DEFS line must contain "disabled: true"').toContain('disabled: true')
  })
})

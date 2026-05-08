/**
 * Nassau Manual press flow — B5 closure spec.
 *
 * Verifies the Manual press UI path: the "Press?" button on the scorecard
 * appears when a player is down in an open match, triggers PressConfirmationModal,
 * and the accepted press correctly feeds into the bridge and settles.
 *
 * Sections:
 *   §1  Setup: 2-player Manual press Nassau round
 *   §2  Hole 1: Alice wins; "Press?" button visible; user skips press (saves directly)
 *   §3  Hole 2: Alice wins; "Press?" button visible; user accepts front + overall press
 *   §4  Holes 3–9: par/par — all tied; front closes at hole 7 (Alice 2-up, 2 remaining)
 *   §5  Holes 10–18: par/par — all tied; overall closes at hole 16 (Alice 2-up, 2 remaining)
 *   §6  Results: Alice +$10.00, Bob −$10.00; Σ = 0
 *
 * Fixture (Chambers Bay, 18 holes par 4, 2 players scratch):
 *   Alice: birdie (3) on holes 1–2; par (4) thereafter (F9-a default)
 *   Bob:   par (4) every hole (F9-a default)
 *
 *   Nassau: pressRule='manual', pressScope='nine', pairingMode='singles', stake=500
 *
 *   Match timeline:
 *     Hole 1: Alice wins → front 1-0, overall 1-0. Press? visible (Bob 1-down, any lead qualifies).
 *             User skips: saves directly. No press created.
 *     Hole 2: Alice wins → front 2-0, overall 2-0. Press? visible.
 *             User presses: accepts front → press-front-1 opens (holes 3–9).
 *                           accepts overall → press-overall-1 opens (holes 3–9 or 3–18).
 *     Holes 3–9: all tied (par 4 each).
 *       Hole 7: front 2-0, 2 holes remaining → 2 > 2 fails (need > not >=). Check: after hole 7,
 *               front played 7 holes (1–7). Remaining in 9 = 9−7 = 2. holesWon(2) <= remaining(2).
 *               Actually closes when holesWon > holesRemaining, i.e. impossible to catch up.
 *               After hole 7: Alice 2-0, 2 remain → cannot catch: 2 wins for Bob would tie; need > 2 to win.
 *               Wait — Nassau front: 9 holes. After 7 holes: 2 remain. Bob needs 2 wins to tie (0+2=2 vs 2),
 *               i.e. it's still possible. After hole 8: 1 remains, Bob needs 2 wins → impossible. So front
 *               closes AT HOLE 8 (2 > 1 remaining). Actually: holesWon=2, holesRemaining=1, 2>1 → close.
 *               Front closes AT HOLE 8 (not 7). Alice wins front (+$5.00).
 *     Hole 8: Front closes (Alice 2-0, 1 remaining). Press-front-1: 0-0, now in back half of front nine.
 *     Hole 9: Press-front-1 closes: 0-0 → MatchTied → $0.
 *     Holes 10–15: overall tracks. Alice 2-0, 6 remain → won't close until ≤ 1 remain.
 *     Hole 16: overall has been played through 16 holes. 2 remain (17–18). 2 > 2? No. Hole 17: 1 remains. 2>1 → close.
 *              Actually: overall closes when holesWon > holesRemaining in overall match (1–18).
 *              After hole 16: played=16, remaining=2. 2 > 2? No. After hole 17: remaining=1. 2>1? Yes → close.
 *              Overall closes AT HOLE 17. Alice wins overall (+$5.00).
 *     Holes 10–17: back match 0-0; Hole 18: finalize: back 0-0 → MatchTied → $0.
 *     Press-overall-1: if pressScope='nine', it covers a nine-hole block starting from hole 3.
 *                      It would close by hole 9 as well → 0-0 → MatchTied → $0.
 *
 *   Settlement:
 *     Front: Alice +500 (closes hole 8)
 *     Front press-1: $0 (MatchTied, closes hole 9)
 *     Overall: Alice +500 (closes hole 17)
 *     Overall press: $0 (MatchTied)
 *     Back: $0 (MatchTied)
 *     Alice: +1000 (+$10.00), Bob: −1000 (−$10.00). Σ = 0.
 *
 * Note: exact hole-of-close for front (8 or 9) and overall (17) depends on engine
 * implementation. This spec asserts final amounts and zero-sum; mid-round hole-close
 * assertions are not included.
 */

import { test, expect } from '@playwright/test'

function extractRoundId(url: string): number | null {
  const m = url.match(/\/(\d+)(?:\/|$)/)
  return m ? parseInt(m[1], 10) : null
}

function decrementBtn(page: import('@playwright/test').Page, playerIndex: 0 | 1) {
  return page.locator('button.rounded-l-lg').nth(playerIndex)
}

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

test('nassau manual press flow: B5 §1–§6 closure spec', async ({ page }) => {

  // ── §1 SETUP ─────────────────────────────────────────────────────────────────

  await test.step('§1 Setup: 2-player Manual press Nassau round', async () => {
    await page.goto('/golf')
    await page.getByRole('link', { name: 'Start New Round' }).click()
    await page.waitForURL('**/round/new')

    await page.locator('input[placeholder="Type to filter..."]').fill('Chambers')
    await page.getByRole('button', { name: /Chambers Bay/ }).click()
    await page.getByRole('button', { name: 'Continue →' }).click()

    await page.locator('input[placeholder="Golfer 1"]').fill('Alice')
    await page.getByRole('button', { name: /Add Golfer 2/ }).click()
    await page.locator('input[placeholder="Golfer 2"]').fill('Bob')
    await page.getByRole('button', { name: 'Continue →' }).click()

    await page.getByRole('button', { name: 'Nassau' }).click()
    // Select manual press rule
    await page.getByRole('button', { name: /manual/i }).click()
    // pressScope='nine' and pairingMode='singles' are store defaults

    await page.getByRole('button', { name: 'Continue →' }).click()
    await page.getByRole('button', { name: /Tee It Up/ }).click()
    await page.waitForURL(/\/golf\/scorecard\/\d+/)
    await page.waitForLoadState('networkidle')
  })

  const scorecardUrl = page.url()
  const roundId = extractRoundId(scorecardUrl)
  expect(roundId, 'Round ID must be present in scorecard URL').not.toBeNull()

  // ── §2 HOLE 1 — Alice wins, Press? visible, user saves directly ──────────────

  await test.step('§2 Hole 1: Alice birdie; Press? button visible; save directly (no press)', async () => {
    // F9-a sets both players to par (4). Decrement Alice to birdie (3).
    await decrementBtn(page, 0).click()
    await page.waitForTimeout(100)

    // Press? button should appear — Bob is 1-down in front and overall
    await expect(page.locator('[data-testid="manual-press-button"]')).toBeVisible()

    // Save without pressing — button should not intercept (manual press is separate from save flow)
    await saveHole(page, 1)
    await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)
    await expect(page.locator('div').filter({ hasText: 'Hole 2' }).first()).toBeVisible()
  })

  // ── §3 HOLE 2 — Alice wins, user accepts both presses, then saves manually ─────

  await test.step('§3 Hole 2: Alice wins; tap Press? → accept both; modal closes; user saves manually (B4)', async () => {
    await decrementBtn(page, 0).click()
    await page.waitForTimeout(100)

    // Press? button visible — Bob now 2-down (B5: label format "Front 9: Bob is down · Overall: Bob is down")
    await expect(page.locator('[data-testid="manual-press-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="manual-press-button"]')).toContainText('Bob')
    await expect(page.locator('[data-testid="manual-press-button"]')).toContainText('Front 9')

    // Tap Press? → modal opens; no PUT fires yet
    await page.locator('[data-testid="manual-press-button"]').click()
    await page.waitForSelector('[data-testid="press-confirmation-modal"]')
    const modal = page.locator('[data-testid="press-confirmation-modal"]')
    await expect(modal).toBeVisible()
    await expect(page.locator('[data-testid="press-down-player"]')).toContainText('Bob')

    // Accept first offer (Front 9) — still in modal (second offer queued)
    await page.locator('[data-testid="press-accept"]').click()
    await page.waitForTimeout(150)

    // Accept second offer (Overall) — B4: onComplete closes modal WITHOUT triggering save.
    // No PUT response expected here. User stays on hole 2.
    await page.locator('[data-testid="press-accept"]').click()
    await page.waitForTimeout(150)

    // Modal closed; still on hole 2 (no hole advance yet).
    await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)

    // User explicitly saves — PUT fires, advances to hole 3.
    await saveHole(page, 2)
    await expect(page.locator('div').filter({ hasText: 'Hole 3' }).first()).toBeVisible()
  })

  // ── §4 HOLES 3–9 — all par/par, front closes ─────────────────────────────────

  await test.step('§4 Holes 3–9: par for both; no press modal; front closes during this range', async () => {
    for (let hole = 3; hole <= 9; hole++) {
      await saveHole(page, hole)
      // No auto-press modal (this is manual mode — modal only shows on manual "Press?" tap)
      await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)
    }
    await expect(page.locator('div').filter({ hasText: 'Hole 10' }).first()).toBeVisible()
  })

  // ── §5 HOLES 10–18 — all par, overall closes ─────────────────────────────────

  await test.step('§5 Holes 10–18: par for both; overall and back finalize', async () => {
    for (let hole = 10; hole <= 17; hole++) {
      await saveHole(page, hole)
      await expect(page.locator('[data-testid="press-confirmation-modal"]')).toHaveCount(0)
    }
    // Hole 18 — final hole; button changes to "Finish Round →"; PUT + PATCH + navigate
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/scores/hole/18') && r.request().method() === 'PUT'),
      page.waitForResponse(r => /\/api\/rounds\/\d+$/.test(r.url()) && r.request().method() === 'PATCH'),
      page.waitForURL(/\/golf\/results\/\d+/),
      page.getByRole('button', { name: 'Finish Round →' }).click(),
    ])
  })

  // ── §6 RESULTS — verify settlement + zero-sum ─────────────────────────────────

  await test.step('§6 Results: Alice +$10.00, Bob −$10.00; Σ = 0', async () => {
    await expect(page).toHaveURL(/\/golf\/results\/\d+/)
    // Wait for results to hydrate (hero amount paragraph appears first).
    await expect(page.locator('p.font-mono')).toBeVisible()

    // Alice wins front (+$5.00) + overall (+$5.00); presses tied → total +$10.00.
    // Bob loses both matches → -$10.00.
    // Money Summary spans use formatMoneyDecimal (minor units / 100): +1000 → '+$10.00'.
    // hero <p class="font-mono text-lg"> is a paragraph, not a span, so hero amount is not matched.
    // B3 Game Breakdown also shows per-player subtotals, so "+$10.00" appears twice:
    //   once in Money Summary (Alice total) and once in Nassau Game Breakdown (Nassau subtotal for Alice).
    const positiveSpan = page.locator('span').filter({ hasText: /^\+\$10\.00$/ })
    const negativeSpan = page.locator('span').filter({ hasText: /^-\$10\.00$/ })
    await expect(positiveSpan, 'Alice nets +$10.00 (Money Summary + Nassau Game Breakdown)').toHaveCount(2)
    await expect(negativeSpan, 'Bob nets -$10.00 (Money Summary + Nassau Game Breakdown)').toHaveCount(2)

    // Zero-sum: +10 + (−10) = 0 — algebraically verified by the two count assertions above.
    await expect(page.getByText('Money Summary')).toBeVisible()
    await expect(page.getByRole('heading', { name: /wins!/ })).toBeVisible()
  })
})

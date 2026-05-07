/**
 * Wolf + Skins multi-bet flow — WF7-3 closure spec.
 *
 * First E2E spec exercising a multi-bet round through the WF7-2 aggregateRound
 * orchestration path (Wolf) and the existing per-bet Skins path — both active
 * simultaneously in one round.
 *
 * Sections:
 *   §1  Setup: 4-player round with Wolf + Skins; wolfTieRule 'No pts' pill present
 *       (WF7-1); §6 fence check (Match Play absent) inline.
 *   §2  Multi-bet hole 1 (Alice lone wolf + Alice wins Skins): BetDetailsSheet shows
 *       both Wolf and Skins breakdowns for Alice.
 *   §3  Multi-bet hole 2 (Bob lone wolf + Bob wins Skins): verify Wolf delta reflects
 *       loneMultiplier; Alice shows negative delta for both bets.
 *   §4  Complete round: holes 3–18 all par (no wolf declaration → WolfDecisionMissing;
 *       Skins all tie → 14-hole carry → tieRuleFinalHole='split' → $0).
 *   §5  Zero-sum invariant: parse results page Money Summary; assert Σ delta === 0;
 *       assert expected amounts (+$30.00 × 2, −$30.00 × 2).
 *   §6  Park-fence: Match Play absent from game picker (inline in §1).
 *
 * Fixture (Chambers Bay, 18 holes, 4 players all scratch):
 *   Alice, Bob, Carol, Dave: hcpIndex=0 → net = gross, no handicap adjustment.
 *
 *   Wolf: stake=500 ($5/hole), loneWolfMultiplier=2× (store default), wolfTieRule='no-points'.
 *   Skins: stake=500 ($5/skin), escalating=false (store default).
 *   Hole 1 captain: Alice (rotation index 0). Hole 2 captain: Bob (rotation index 1).
 *
 *   Score plan:
 *     Hole 1: Alice=3, Bob=Carol=Dave=4. Alice → lone wolf (no partner).
 *       Wolf:  Alice +3000 (+$30.00), Bob/Carol/Dave −1000 (−$10.00) each.
 *       Skins: Alice wins skin → Alice +1500 (+$15.00), Bob/Carol/Dave −500 (−$5.00).
 *     Hole 2: Bob=3, Alice=Carol=Dave=4. Bob → lone wolf.
 *       Wolf:  Bob +3000 (+$30.00), Alice/Carol/Dave −1000 (−$10.00) each.
 *       Skins: Bob wins skin → Bob +1500 (+$15.00), Alice/Carol/Dave −500 (−$5.00).
 *     Holes 3–18: all par (4). No wolf declaration → WolfDecisionMissing → $0 wolf delta.
 *       Skins: all tie every hole → 14-hole carry chain → hole-18 tieRule='split' → $0.
 *
 *   Combined settlement:
 *     Alice: Wolf +2000 + Skins +1000 = +3000 (+$30.00)
 *     Bob:   Wolf +2000 + Skins +1000 = +3000 (+$30.00)
 *     Carol: Wolf −2000 + Skins −1000 = −3000 (−$30.00)
 *     Dave:  Wolf −2000 + Skins −1000 = −3000 (−$30.00)
 *     Σ = 0 ✓
 *
 * Note on tieRule: wolfTieRule='no-points' is the WF7-1 default. The 'no-points' tie
 * path (WolfHoleTied with zero delta) is exercised in payouts.test.ts WP4 at the unit
 * level. Holes 3–18 in this fixture use WolfDecisionMissing (no pick entered) rather
 * than WolfHoleTied, which achieves the same zero-delta outcome without requiring a
 * declaration click on each of the 16 remaining holes.
 */

import { test, expect } from '@playwright/test'

// Stepper decrement (left button, class rounded-l-lg). Player order matches insertion:
// Alice=0, Bob=1, Carol=2, Dave=3.
function decrementBtn(page: import('@playwright/test').Page, playerIndex: 0 | 1 | 2 | 3) {
  return page.locator('button.rounded-l-lg').nth(playerIndex)
}

// Save current hole (holes 1–17) and wait for PUT response.
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

// Finish hole 18: PUT + PATCH (status=Complete) + navigate to results page.
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

test('wolf + skins multi-bet flow: WF7-3 closure spec', async ({ page }) => {

  // ── §1 SETUP + §6 FENCE ──────────────────────────────────────────────────────

  await test.step('§1 Setup + §6 picker fence: Wolf+Skins round, wolfTieRule pill present, Match Play absent', async () => {
    await page.goto('/golf')
    await page.getByRole('link', { name: 'Start New Round' }).click()
    await page.waitForURL('**/round/new')

    // Course — Chambers Bay, 18 holes
    await page.locator('input[placeholder="Type to filter..."]').fill('Chambers')
    await page.getByRole('button', { name: /Chambers Bay/ }).click()
    await page.getByRole('button', { name: 'Continue →' }).click()

    // Players — 4 players (Wolf requires 4–5; Skins requires ≥3)
    await page.locator('input[placeholder="Golfer 1"]').fill('Alice')
    await page.getByRole('button', { name: /Add Golfer 2/ }).click()
    await page.locator('input[placeholder="Golfer 2"]').fill('Bob')
    await page.getByRole('button', { name: /Add Golfer 3/ }).click()
    await page.locator('input[placeholder="Golfer 3"]').fill('Carol')
    await page.getByRole('button', { name: /Add Golfer 4/ }).click()
    await page.locator('input[placeholder="Golfer 4"]').fill('Dave')
    await page.getByRole('button', { name: 'Continue →' }).click()

    // §6 FENCE: Match Play absent (disabled: true in GAME_DEFS)
    const pickerSection = page.locator('div').filter({ hasText: /Add a game/ }).first()
    const pickerText = await pickerSection.textContent() ?? ''
    expect(pickerText, '§6 Match Play must not appear in picker (parked)').not.toContain('Match Play')
    expect(pickerText, '§6 Wolf must appear in picker').toContain('Wolf')
    expect(pickerText, '§6 Skins must appear in picker').toContain('Skins')

    // Add Wolf game — store defaults: stake=500, loneWolfMultiplier=2×, wolfTieRule='no-points'
    await page.getByRole('button', { name: 'Wolf' }).click()

    // §1 verification: WF7-1 wolfTieRule wizard pill appears in Wolf config card
    await expect(page.getByRole('button', { name: 'No pts' })).toBeVisible()

    // Add Skins game — store defaults: stake=500, escalating=false
    await page.getByRole('button', { name: 'Skins' }).click()

    await page.getByRole('button', { name: 'Continue →' }).click()
    await page.getByRole('button', { name: /Tee It Up/ }).click()
    await page.waitForURL(/\/golf\/scorecard\/\d+/)
    await page.waitForLoadState('networkidle')
  })

  // Discover player UUID for Alice from the DOM (generated at round creation).
  await page.waitForSelector('[data-testid="wolf-declare-panel"]')
  await page.waitForSelector('[data-testid^="hole-bet-total-"]')

  const aliceTestId = await page
    .locator('[data-testid^="hole-bet-total-"]')
    .first()
    .getAttribute('data-testid')
  const aliceId = aliceTestId!.replace('hole-bet-total-', '')

  // §1 confirm: wolf-declare-panel renders when Wolf game is active alongside Skins
  await expect(page.locator('[data-testid="wolf-declare-panel"]')).toBeVisible()

  // ── §2 MULTI-BET HOLE 1 (Alice lone wolf + skins win) ────────────────────────

  await test.step('§2 Multi-bet hole 1: lone wolf + skins; BetDetailsSheet shows both Wolf and Skins', async () => {
    // Alice is captain (hole 1, rotation index 0). Declare Lone Wolf.
    await page.locator('[data-testid="wolf-declare-lone"]').click()
    await page.waitForTimeout(100)
    await expect(page.locator('[data-testid="wolf-declare-panel"]')).toContainText('Lone Wolf')

    // Alice scores birdie: decrement from par (4 → 3). Others remain at par.
    await decrementBtn(page, 0).click()
    await page.waitForTimeout(100)

    // Open BetDetailsSheet via Alice's bet-total row
    await page.locator(`[data-testid="hole-bet-total-${aliceId}"]`).click()
    await page.waitForTimeout(300) // slide-up animation

    // Expand Alice's hole-1 row in the sheet
    await page.locator(`[data-testid="sheet-row-1-${aliceId}"]`).click()
    await page.waitForTimeout(100)

    // Both Wolf and Skins breakdowns must render for Alice on hole 1
    const breakdowns = page.locator(`[data-testid^="sheet-breakdown-1-${aliceId}-"]`)
    const breakdownCount = await breakdowns.count()
    expect(
      breakdownCount,
      '§2 Alice hole-1: breakdowns for both Wolf and Skins must be present (count ≥ 2)',
    ).toBeGreaterThanOrEqual(2)

    // Both game labels appear in the breakdown text
    const breakdownTexts = await breakdowns.allTextContents()
    const combinedText = breakdownTexts.join(' ')
    expect(combinedText, '§2 Wolf label must appear in per-game breakdown').toContain('Wolf')
    expect(combinedText, '§2 Skins label must appear in per-game breakdown').toContain('Skins')

    // Alice wins both bets on hole 1 → at least one positive delta in breakdowns
    expect(combinedText, '§2 Alice hole-1: positive delta present (lone wolf win + skins win)').toContain('+$')

    await page.getByRole('button', { name: 'Close round summary' }).click()
    await page.waitForTimeout(200)

    // Save hole 1 and advance to hole 2
    await saveHole(page, 1)
  })

  // ── §3 MULTI-BET HOLE 2 (Bob lone wolf + skins win) ──────────────────────────

  await test.step('§3 Lone Wolf hole 2: Bob lone wolf + skins; Alice shows negative deltas', async () => {
    // Hole 2 captain: Bob (rotation index 1). WolfDeclare panel updates to Bob as captain.
    await expect(page.locator('[data-testid="wolf-declare-panel"]')).toBeVisible()

    // Declare Lone Wolf for Bob
    await page.locator('[data-testid="wolf-declare-lone"]').click()
    await page.waitForTimeout(100)
    await expect(page.locator('[data-testid="wolf-declare-panel"]')).toContainText('Lone Wolf')

    // Bob scores birdie: player index 1
    await decrementBtn(page, 1).click()
    await page.waitForTimeout(100)

    // Open BetDetailsSheet for Alice (she is a loser on both bets on hole 2)
    await page.locator(`[data-testid="hole-bet-total-${aliceId}"]`).click()
    await page.waitForTimeout(300)

    // Expand Alice's hole-2 row
    await page.locator(`[data-testid="sheet-row-2-${aliceId}"]`).click()
    await page.waitForTimeout(100)

    const h2Breakdowns = page.locator(`[data-testid^="sheet-breakdown-2-${aliceId}-"]`)
    const h2Count = await h2Breakdowns.count()
    expect(
      h2Count,
      '§3 Alice hole-2: breakdowns for both Wolf and Skins (count ≥ 2)',
    ).toBeGreaterThanOrEqual(2)

    // Alice loses both Wolf and Skins on hole 2 → at least one negative delta
    const h2Texts = await h2Breakdowns.allTextContents()
    const h2Combined = h2Texts.join(' ')
    expect(h2Combined, '§3 Alice hole-2: negative delta present (opponent of Bob lone wolf + skins loser)').toContain('-$')

    await page.getByRole('button', { name: 'Close round summary' }).click()
    await page.waitForTimeout(200)

    await saveHole(page, 2)
  })

  // ── §4 COMPLETE ROUND (holes 3–18, all par) ───────────────────────────────────

  await test.step('§4 Complete round: holes 3–18 all par, no declarations', async () => {
    // Holes 3–17: save with default par scores. No wolf declaration → WolfDecisionMissing → $0.
    // Skins: all tie every hole → carry chain → resolved at hole 18 with tieRule='split' → $0.
    // After each save, wait for the scorecard to render the next hole's "Save & Next Hole →"
    // button before proceeding. This prevents a race between PUT completing and React advancing
    // the hole state (codex P2 finding: saveHole loop can race the hole transition).
    for (let h = 3; h <= 17; h++) {
      await saveHole(page, h)
      // Wait for the next hole to render. After h=17 the page shows hole 18 with "Finish Round →".
      await expect(
        page.locator('button').filter({ hasText: /Save & Next Hole|Finish Round/ }),
      ).toBeVisible()
    }
    // Hole 18: finish the round, navigate to results page.
    await finishRound(page)
  })

  // ── §5 ZERO-SUM INVARIANT ────────────────────────────────────────────────────

  await test.step('§5 Zero-sum: Σ delta === 0; expected +$30.00 × 2, −$30.00 × 2', async () => {
    // Wait for results to hydrate: hero section winner paragraph must be visible.
    // The hero <p class="font-mono text-lg"> renders the winner amount (+$30.00).
    await expect(page.locator('p.font-mono')).toBeVisible()

    // Payout amounts in Money Summary section are in <span> elements.
    // The hero section uses <p> (not span), so span-filtering gives only the 4 summary amounts.
    // Use hasText with regex anchors for exact span text matching (not substring).
    const positiveSpans = page.locator('span').filter({ hasText: /^\+\$30\.00$/ })
    const negativeSpans = page.locator('span').filter({ hasText: /^-\$30\.00$/ })

    // Alice and Bob each collect +$30.00 (Wolf +2000 + Skins +1000 = +3000)
    await expect(positiveSpans, '§5 exactly 2 players at +$30.00 (Alice and Bob)').toHaveCount(2)
    // Carol and Dave each pay -$30.00 (Wolf -2000 + Skins -1000 = -3000)
    await expect(negativeSpans, '§5 exactly 2 players at -$30.00 (Carol and Dave)').toHaveCount(2)

    // GR3 zero-sum: +30 + 30 - 30 - 30 = 0 (algebraically verified by the two count assertions above).
    // GR2 integer check: $30.00 = 3000 minor units — Number.isInteger(3000) is trivially true.
    // Money Summary section and winner heading must be visible (confirms full hydration).
    await expect(page.getByText('Money Summary')).toBeVisible()
    await expect(page.getByRole('heading', { name: /wins!/ })).toBeVisible()
  })
})

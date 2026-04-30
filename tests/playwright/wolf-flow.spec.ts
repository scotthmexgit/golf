/**
 * Wolf flow E2E spec — WF-6 closure spec.
 *
 * Covers per WF-6 plan §assertion groups:
 *   §1  Setup: 4-player round created, Wolf game configured in picker
 *   §2  Partner declaration: captain declares partner; wolfPick written; BetDetailsSheet delta
 *   §3  Lone Wolf: captain goes solo; wolfPick='solo'; delta reflects lone-wolf settlement
 *   §4  Blind Lone: captain goes blind; wolfPick='blind'; delta reflects blind multiplier
 *   §5  Fence: Skins-only round — wolf-declare-panel absent from DOM
 *   §6  Fence: Wolf-round picker — Nassau and Match Play absent (disabled: true in GAME_DEFS)
 *
 * Fixture (18-hole, 4 players):
 *   Alice, Bob, Carol, Dave: all scratch (hcpIndex=0) — net = gross, no handicap adjustment.
 *   Wolf game: stake=500 ($5/hole, store default), loneWolfMultiplier=2× (store default).
 *   blindLoneMultiplier: max(loneMultiplier+1, 3) = 3× (wolf_bridge.ts hard-coded default).
 *   Hole 1 captain: Alice (player rotation index 0, applyWolfCaptainRotation).
 *   Scores hole 1: Alice=3 (birdie), Bob=Carol=Dave=4 (par). Alice wins every declaration.
 *   Par hole 1 (Chambers Bay): 4.
 *
 * Delta values — computed from engine math (all-scratch, known scores; no hand-computed
 * handicap adjustment needed). Confirmed by reading actual BetDetailsSheet DOM values on
 * first spec run before hardcoding (approach (b) from sod.md Risk #1).
 *
 *   §2 Partner (Alice+Bob vs Carol+Dave, mult=1):
 *       Alice +$10.00  Bob +$10.00  Carol -$10.00  Dave -$10.00
 *   §3 Lone Wolf (2× mult, 3 opponents):
 *       Alice +$30.00  Bob -$10.00  Carol -$10.00  Dave -$10.00
 *   §4 Blind Lone (3× mult, 3 opponents):
 *       Alice +$45.00  Bob -$15.00  Carol -$15.00  Dave -$15.00
 *   Zero-sum: verified by engine in wolf_bridge.test.ts.
 */

import { test, expect } from '@playwright/test'

// Stepper decrement button (left half, class rounded-l-lg). Player order matches
// wizard insertion: Alice=0, Bob=1, Carol=2, Dave=3.
function decrementBtn(page: import('@playwright/test').Page, playerIndex: 0 | 1 | 2 | 3) {
  return page.locator('button.rounded-l-lg').nth(playerIndex)
}

test('wolf flow: WF-6 §1–§6 closure spec', async ({ page }) => {

  // ── §1 SETUP + §6 FENCE ──────────────────────────────────────────────────────

  await test.step('§1 Setup + §6 picker fence: 4-player Wolf round, Nassau/Match Play absent', async () => {
    await page.goto('/golf')
    await page.getByRole('link', { name: 'Start New Round' }).click()
    await page.waitForURL('**/round/new')

    // Course — Chambers Bay, 18 holes (hole 1 par=4)
    await page.locator('input[placeholder="Type to filter..."]').fill('Chambers')
    await page.getByRole('button', { name: /Chambers Bay/ }).click()
    await page.getByRole('button', { name: 'Continue →' }).click()

    // Players — Alice, Bob, Carol, Dave (all scratch, hcpIndex=0 default)
    await page.locator('input[placeholder="Golfer 1"]').fill('Alice')
    await page.getByRole('button', { name: /Add Golfer 2/ }).click()
    await page.locator('input[placeholder="Golfer 2"]').fill('Bob')
    await page.getByRole('button', { name: /Add Golfer 3/ }).click()
    await page.locator('input[placeholder="Golfer 3"]').fill('Carol')
    await page.getByRole('button', { name: /Add Golfer 4/ }).click()
    await page.locator('input[placeholder="Golfer 4"]').fill('Dave')
    await page.getByRole('button', { name: 'Continue →' }).click()

    // §6 FENCE: Nassau and Match Play must be absent (disabled: true in GAME_DEFS)
    const pickerSection = page.locator('div').filter({ hasText: /Add a game/ }).first()
    const pickerText = await pickerSection.textContent() ?? ''
    for (const token of ['Nassau', 'Match Play']) {
      expect(pickerText, `Parked game "${token}" must not appear in Wolf-round picker`).not.toContain(token)
    }
    expect(pickerText, 'Wolf must appear in picker (unparked WF-1)').toContain('Wolf')

    // Add Wolf — stake=$5 (500 minor units) and loneWolfMultiplier=2× are store defaults; no edits needed
    await page.getByRole('button', { name: 'Wolf' }).click()
    await page.getByRole('button', { name: 'Continue →' }).click()
    await page.getByRole('button', { name: /Tee It Up/ }).click()
    await page.waitForURL(/\/golf\/scorecard\/\d+/)
    await page.waitForLoadState('networkidle')
  })

  // Discover player UUIDs from DOM. These are generated at round creation and
  // cannot be pre-computed. Alice is player[0] (captain on hole 1); Bob is the
  // first non-captain in the WolfDeclare partner list (player[1]).
  await page.waitForSelector('[data-testid="wolf-declare-panel"]')
  await page.waitForSelector('[data-testid^="hole-bet-total-"]')
  await page.waitForSelector('[data-testid^="wolf-partner-"]')

  const aliceTestId = await page.locator('[data-testid^="hole-bet-total-"]').first().getAttribute('data-testid')
  const aliceId = aliceTestId!.replace('hole-bet-total-', '')

  const bobTestId = await page.locator('[data-testid^="wolf-partner-"]').first().getAttribute('data-testid')
  const bobId = bobTestId!.replace('wolf-partner-', '')

  // §1 confirmation: WolfDeclare panel renders when Wolf game is active
  const wolfPanel = page.locator('[data-testid="wolf-declare-panel"]')
  await expect(wolfPanel).toBeVisible()

  // ── §2 PARTNER DECLARATION ───────────────────────────────────────────────────

  await test.step('§2 Partner declaration: wolfPick written; BetDetailsSheet delta', async () => {
    // Alice declares Bob as partner on hole 1
    await page.locator(`[data-testid="wolf-partner-${bobId}"]`).click()
    await page.waitForTimeout(100)
    // wolfPick='<bobId>' written → summary label updates (proxy assertion for wolfPick written)
    await expect(wolfPanel).toContainText('Alice + Bob')

    // Set scores: Alice=3 (decrement from par 4); Bob/Carol/Dave stay at par 4 (F9-a default)
    await decrementBtn(page, 0).click()  // Alice 4→3
    await page.waitForTimeout(100)

    // Open BetDetailsSheet
    await page.locator(`[data-testid="hole-bet-total-${aliceId}"]`).click()
    await page.waitForTimeout(300)  // slide-up animation (300ms)

    // Expand Alice's hole-1 row to show per-game breakdown
    await page.locator(`[data-testid="sheet-row-1-${aliceId}"]`).click()
    await page.waitForTimeout(100)

    // Assert §2 delta: Alice+Bob win vs Carol+Dave; mult=1, stake=500 → +$10.00
    const aliceBreakdown2 = page.locator(`[data-testid^="sheet-breakdown-1-${aliceId}-"]`)
    await expect(aliceBreakdown2).toBeVisible()
    const text2 = await aliceBreakdown2.textContent()
    expect(text2?.trim(), '§2 partner win: Alice hole-1 delta is +$10.00').toContain('+$10.00')

    await page.getByRole('button', { name: 'Close round summary' }).click()
    await page.waitForTimeout(200)  // slide-down animation
  })

  // ── §3 LONE WOLF ─────────────────────────────────────────────────────────────

  await test.step('§3 Lone Wolf: wolfPick="solo"; delta reflects 2× multiplier', async () => {
    // Change declaration to Lone Wolf (overwrites partner pick on hole 1)
    await page.locator('[data-testid="wolf-declare-lone"]').click()
    await page.waitForTimeout(100)
    // wolfPick='solo' → summary updates to "Alice — Lone Wolf"
    await expect(wolfPanel).toContainText('Lone Wolf')

    // Open BetDetailsSheet. Alice's hole-1 row is already expanded from §2 (sheet
    // component stays mounted between open/close cycles; expandedKey persists).
    await page.locator(`[data-testid="hole-bet-total-${aliceId}"]`).click()
    await page.waitForTimeout(300)

    // Assert §3 delta: lone wolf 2×, stake=500, 3 opponents → 500×2×3 = 3000 (+$30.00)
    const aliceBreakdown3 = page.locator(`[data-testid^="sheet-breakdown-1-${aliceId}-"]`)
    await expect(aliceBreakdown3).toBeVisible()
    const text3 = await aliceBreakdown3.textContent()
    expect(text3?.trim(), '§3 lone wolf: Alice hole-1 delta is +$30.00').toContain('+$30.00')

    await page.getByRole('button', { name: 'Close round summary' }).click()
    await page.waitForTimeout(200)
  })

  // ── §4 BLIND LONE ────────────────────────────────────────────────────────────

  await test.step('§4 Blind Lone: wolfPick="blind"; delta reflects 3× multiplier', async () => {
    // Change declaration to Blind Lone Wolf
    await page.locator('[data-testid="wolf-declare-blind"]').click()
    await page.waitForTimeout(100)
    // wolfPick='blind' → summary updates to "Alice — Blind Lone"
    await expect(wolfPanel).toContainText('Blind Lone')

    await page.locator(`[data-testid="hole-bet-total-${aliceId}"]`).click()
    await page.waitForTimeout(300)

    // Assert §4 delta: blind lone 3× (max(2+1,3)=3), stake=500, 3 opponents → 500×3×3 = 4500 (+$45.00)
    const aliceBreakdown4 = page.locator(`[data-testid^="sheet-breakdown-1-${aliceId}-"]`)
    await expect(aliceBreakdown4).toBeVisible()
    const text4 = await aliceBreakdown4.textContent()
    expect(text4?.trim(), '§4 blind lone: Alice hole-1 delta is +$45.00').toContain('+$45.00')

    await page.getByRole('button', { name: 'Close round summary' }).click()
    await page.waitForTimeout(200)
  })

  // ── §5 FENCE: Skins-only round has no wolf-declare-panel ─────────────────────

  await test.step('§5 Fence: wolf-declare-panel absent in Skins-only round', async () => {
    // page.goto() is a hard navigation — Zustand resets to empty initial state.
    // Build a fresh 3-player Skins-only round from scratch.
    await page.goto('/golf')
    await page.getByRole('link', { name: 'Start New Round' }).click()
    await page.waitForURL('**/round/new')

    // Course
    await page.locator('input[placeholder="Type to filter..."]').fill('Chambers')
    await page.getByRole('button', { name: /Chambers Bay/ }).click()
    await page.getByRole('button', { name: 'Continue →' }).click()

    // Players — 3 players (Skins requires ≥3; Wolf requires 4-5, so Wolf cannot be added)
    await page.locator('input[placeholder="Golfer 1"]').fill('Alice')
    await page.getByRole('button', { name: /Add Golfer 2/ }).click()
    await page.locator('input[placeholder="Golfer 2"]').fill('Bob')
    await page.getByRole('button', { name: /Add Golfer 3/ }).click()
    await page.locator('input[placeholder="Golfer 3"]').fill('Carol')
    await page.getByRole('button', { name: 'Continue →' }).click()

    // Games — Skins only; Wolf pill is disabled (bettingCount=3 < minPlayers=4 for Wolf)
    await page.getByRole('button', { name: 'Skins' }).click()
    await page.getByRole('button', { name: 'Continue →' }).click()

    // Review → Tee It Up (Skins-only round, no Wolf game)
    await page.getByRole('button', { name: /Tee It Up/ }).click()
    await page.waitForURL(/\/golf\/scorecard\/\d+/)
    await page.waitForLoadState('networkidle')

    // §5 FENCE: wolf-declare-panel must not be in the DOM (no Wolf game → conditional render skipped)
    await expect(page.locator('[data-testid="wolf-declare-panel"]')).toHaveCount(0)
  })
})

// src/lib/gameConfig.ts — Game-config persistence helpers.
//
// Three-function contract:
//   buildGameConfig   — GameInstance → DB-safe JSON blob (null when no config)
//   validateGameConfig — blob → ValidationResult (reject unknown keys + bad enums)
//   hydrateGameConfig  — blob → Partial<GameInstance> (log on failure, return defaults)
//
// Rule #7 (no silent defaults): every per-type default is documented inline.
// Unknown keys at POST boundary → HTTP 400 (rejected).
// Unknown keys at hydration boundary → logged + ignored (app does not crash).

import type { GameType, GameInstance } from '../types'

export type ValidationResult = { ok: true } | { ok: false; reason: string }

// ── Valid enum sets ───────────────────────────────────────────────────────────

const NASSAU_PRESS_RULES  = new Set(['manual', 'auto-2-down', 'auto-1-down'])
const NASSAU_PRESS_SCOPES = new Set(['nine', 'match'])
const NASSAU_PAIRING_MODES = new Set(['singles', 'allPairs'])

const NASSAU_KEYS = new Set(['pressRule', 'pressScope', 'pairingMode'])
const WOLF_KEYS   = new Set(['loneWolfMultiplier', 'escalating'])
const SKINS_KEYS  = new Set(['escalating'])

// ── buildGameConfig ───────────────────────────────────────────────────────────
//
// Returns a lean JSON blob containing only the explicitly-set game-specific
// fields. Returns null when there is nothing to persist (type has no config
// fields or all fields are undefined). Null in the DB means "use bridge defaults."

export function buildGameConfig(game: GameInstance): Record<string, unknown> | null {
  switch (game.type) {
    case 'nassau': {
      const out: Record<string, unknown> = {}
      if (game.pressRule  !== undefined) out.pressRule  = game.pressRule
      if (game.pressScope !== undefined) out.pressScope = game.pressScope
      if (game.pairingMode !== undefined) out.pairingMode = game.pairingMode
      return Object.keys(out).length > 0 ? out : null
    }
    case 'wolf': {
      const out: Record<string, unknown> = {}
      if (game.loneWolfMultiplier !== undefined) out.loneWolfMultiplier = game.loneWolfMultiplier
      if (game.escalating !== undefined) out.escalating = game.escalating
      return Object.keys(out).length > 0 ? out : null
    }
    case 'skins': {
      if (game.escalating !== undefined) return { escalating: game.escalating }
      return null
    }
    default:
      return null
  }
}

// ── validateGameConfig ────────────────────────────────────────────────────────
//
// Validates a config blob at the POST/PUT persistence boundary.
// Rejects unknown keys (rule #7 — no silent defaults at write boundary).
// Returns { ok: false, reason } for the caller to surface as HTTP 400.

export function validateGameConfig(type: GameType, config: unknown): ValidationResult {
  if (config === null || config === undefined) return { ok: true }
  if (typeof config !== 'object' || Array.isArray(config)) {
    return { ok: false, reason: 'config must be a plain object' }
  }
  const obj = config as Record<string, unknown>

  switch (type) {
    case 'nassau': {
      for (const k of Object.keys(obj)) {
        if (!NASSAU_KEYS.has(k)) return { ok: false, reason: `Nassau config: unknown key "${k}"` }
      }
      if (obj.pressRule !== undefined && !NASSAU_PRESS_RULES.has(String(obj.pressRule))) {
        return { ok: false, reason: `Nassau config: invalid pressRule "${obj.pressRule}"` }
      }
      if (obj.pressScope !== undefined && !NASSAU_PRESS_SCOPES.has(String(obj.pressScope))) {
        return { ok: false, reason: `Nassau config: invalid pressScope "${obj.pressScope}"` }
      }
      if (obj.pairingMode !== undefined && !NASSAU_PAIRING_MODES.has(String(obj.pairingMode))) {
        return { ok: false, reason: `Nassau config: invalid pairingMode "${obj.pairingMode}"` }
      }
      return { ok: true }
    }
    case 'wolf': {
      for (const k of Object.keys(obj)) {
        if (!WOLF_KEYS.has(k)) return { ok: false, reason: `Wolf config: unknown key "${k}"` }
      }
      if (obj.loneWolfMultiplier !== undefined && (typeof obj.loneWolfMultiplier !== 'number' || !Number.isInteger(obj.loneWolfMultiplier))) {
        return { ok: false, reason: 'Wolf config: loneWolfMultiplier must be an integer' }
      }
      if (obj.escalating !== undefined && typeof obj.escalating !== 'boolean') {
        return { ok: false, reason: 'Wolf config: escalating must be a boolean' }
      }
      return { ok: true }
    }
    case 'skins': {
      for (const k of Object.keys(obj)) {
        if (!SKINS_KEYS.has(k)) return { ok: false, reason: `Skins config: unknown key "${k}"` }
      }
      if (obj.escalating !== undefined && typeof obj.escalating !== 'boolean') {
        return { ok: false, reason: 'Skins config: escalating must be a boolean' }
      }
      return { ok: true }
    }
    default:
      if (Object.keys(obj).length > 0) {
        return { ok: false, reason: `Game type "${type}" has no configurable fields` }
      }
      return { ok: true }
  }
}

// ── hydrateGameConfig ─────────────────────────────────────────────────────────
//
// Maps a DB config blob back to Partial<GameInstance> at hydration time.
// Permissive: validation failures are logged (not thrown) and return {}.
// The caller spreads the result onto the base GameInstance; undefined fields
// fall through to the bridge's own defaults (buildNassauCfg/Wolf/Skins).
//
// Per-type defaults when a key is absent from the blob:
//   nassau  — pressRule: 'manual', pressScope: 'nine', pairingMode: derived from
//             playerIds.length in buildNassauCfg (not settable here)
//   wolf    — loneWolfMultiplier: 2 (buildWolfCfg), escalating: undefined
//   skins   — escalating: true (buildSkinsCfg default)

export function hydrateGameConfig(
  type: GameType,
  config: unknown,
): Partial<GameInstance> {
  if (config === null || config === undefined) return {}

  const validation = validateGameConfig(type, config)
  if (!validation.ok) {
    console.warn(`[hydrateGameConfig] ${type}: ${validation.reason} — using defaults`)
    return {}
  }

  const obj = config as Record<string, unknown>
  switch (type) {
    case 'nassau':
      return {
        pressRule:   obj.pressRule  !== undefined ? (obj.pressRule  as GameInstance['pressRule'])  : undefined,
        pressScope:  obj.pressScope !== undefined ? (obj.pressScope as GameInstance['pressScope']) : undefined,
        pairingMode: obj.pairingMode !== undefined ? (obj.pairingMode as GameInstance['pairingMode']) : undefined,
      }
    case 'wolf':
      return {
        loneWolfMultiplier: typeof obj.loneWolfMultiplier === 'number' ? obj.loneWolfMultiplier : undefined,
        escalating:         typeof obj.escalating === 'boolean' ? obj.escalating : undefined,
      }
    case 'skins':
      return {
        escalating: typeof obj.escalating === 'boolean' ? obj.escalating : undefined,
      }
    default:
      return {}
  }
}

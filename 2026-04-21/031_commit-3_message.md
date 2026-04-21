#4 bet-id refactor: string-id lookup for bet-config resolution

- types.ts: add `id: BetId` as the first field of all five per-bet
  config interfaces — SkinsCfg, WolfCfg, NassauCfg, MatchPlayCfg,
  StrokePlayCfg.
- skins.ts, stroke_play.ts, wolf.ts: rewrite each `findBetId`
  predicate from `b.config === cfg` (reference-identity) to
  `b.id === cfg.id` (string comparison). No other engine logic
  changed.
- skins.test.ts, stroke_play.test.ts, wolf.test.ts: add `id`
  default to each `make*Cfg` factory. Rewrite the BetNotFoundError
  "stray cfg" test in each file to `make*Cfg({ id: 'not-registered'
  })` so the test exercises an id-mismatch, not an unregistered
  reference. skins.test.ts: drop the `'skins-2'` positional arg
  from `makeRoundCfg(cfgGross)` — sole non-default caller, made
  redundant by the refactor.

The prior `findBetId` predicate located a bet by reference identity
(`b.config === cfg`). This fails whenever the cfg object passed to a
scoring function is not the exact same object as the one stored in
`roundCfg.bets` — a plausible failure mode any time configs are
deserialized, reconstructed, or passed through a boundary that does
not preserve object identity. The new predicate (`b.id === cfg.id`)
resolves to the correct bet regardless of how the cfg arrived.

-- Migration: Game.stake Float → Int (cents), SideBet.stake Float → Int (cents)
-- Strategy: drop-and-recreate. Data is disposable per project baseline.
-- Existing rows are truncated; stake values are NOT preserved.

-- AlterTable: Game.stake DOUBLE PRECISION → INTEGER (minor units / cents)
ALTER TABLE "Game" DROP COLUMN "stake";
ALTER TABLE "Game" ADD COLUMN "stake" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: SideBet.stake DOUBLE PRECISION → INTEGER (minor units / cents), default 0
ALTER TABLE "SideBet" DROP COLUMN "stake";
ALTER TABLE "SideBet" ADD COLUMN "stake" INTEGER NOT NULL DEFAULT 0;

/*
  Warnings:

  - A unique constraint covering the columns `[roundId,playerId,hole]` on the table `Score` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'InProgress';

-- CreateIndex
CREATE UNIQUE INDEX "Score_roundId_playerId_hole_key" ON "Score"("roundId", "playerId", "hole");

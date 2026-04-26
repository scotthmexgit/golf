/*
  Warnings:

  - You are about to alter the column `stake` on the `Game` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the `SideBet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SideBetResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SideBet" DROP CONSTRAINT "SideBet_roundId_fkey";

-- DropForeignKey
ALTER TABLE "SideBetResult" DROP CONSTRAINT "SideBetResult_sideBetId_fkey";

-- AlterTable
ALTER TABLE "Game" ALTER COLUMN "stake" SET DATA TYPE INTEGER;

-- DropTable
DROP TABLE "SideBet";

-- DropTable
DROP TABLE "SideBetResult";

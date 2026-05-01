-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "config" JSONB;

-- CreateTable
CREATE TABLE "HoleDecision" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "hole" INTEGER NOT NULL,
    "decisions" JSONB NOT NULL,

    CONSTRAINT "HoleDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HoleDecision_roundId_hole_key" ON "HoleDecision"("roundId", "hole");

-- AddForeignKey
ALTER TABLE "HoleDecision" ADD CONSTRAINT "HoleDecision_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

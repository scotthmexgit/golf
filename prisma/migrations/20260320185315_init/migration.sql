-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "handicapIdx" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseHole" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "index" INTEGER NOT NULL,

    CONSTRAINT "CourseHole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "holesCount" INTEGER NOT NULL DEFAULT 18,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tee" TEXT NOT NULL DEFAULT 'blue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundPlayer" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "tee" TEXT NOT NULL DEFAULT 'blue',
    "handicapIdx" DOUBLE PRECISION NOT NULL,
    "courseHcp" INTEGER NOT NULL,
    "isCourseHcp" BOOLEAN NOT NULL DEFAULT false,
    "betting" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RoundPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "playerId" INTEGER NOT NULL,
    "hole" INTEGER NOT NULL,
    "gross" INTEGER NOT NULL,
    "putts" INTEGER,
    "fromBunker" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "stake" DOUBLE PRECISION NOT NULL,
    "playerIds" INTEGER[],

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameResult" (
    "id" SERIAL NOT NULL,
    "gameId" INTEGER NOT NULL,
    "hole" INTEGER,
    "winnerId" INTEGER,
    "detail" JSONB NOT NULL,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SideBet" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "stake" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "playerIds" INTEGER[],

    CONSTRAINT "SideBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SideBetResult" (
    "id" SERIAL NOT NULL,
    "sideBetId" INTEGER NOT NULL,
    "hole" INTEGER,
    "winnerIds" INTEGER[],
    "amount" DOUBLE PRECISION NOT NULL,
    "detail" JSONB,

    CONSTRAINT "SideBetResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_email_key" ON "Player"("email");

-- AddForeignKey
ALTER TABLE "CourseHole" ADD CONSTRAINT "CourseHole_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundPlayer" ADD CONSTRAINT "RoundPlayer_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundPlayer" ADD CONSTRAINT "RoundPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBet" ADD CONSTRAINT "SideBet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SideBetResult" ADD CONSTRAINT "SideBetResult_sideBetId_fkey" FOREIGN KEY ("sideBetId") REFERENCES "SideBet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

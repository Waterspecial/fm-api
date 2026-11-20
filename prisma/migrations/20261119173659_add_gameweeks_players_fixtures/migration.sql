-- CreateEnum
CREATE TYPE "Position" AS ENUM ('GKP', 'DEF', 'MID', 'FWD');

-- CreateTable
CREATE TABLE "gameweeks" (
    "id" SERIAL NOT NULL,
    "season" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "is_current" BOOLEAN NOT NULL,
    "is_next" BOOLEAN NOT NULL,
    "finished" BOOLEAN NOT NULL,
    "data_checked" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gameweeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "fpl_id" INTEGER NOT NULL,
    "web_name" TEXT NOT NULL,
    "position" "Position" NOT NULL,
    "team_id" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "news" TEXT NOT NULL,
    "chance_of_playing_next_round" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixtures" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "fpl_id" INTEGER NOT NULL,
    "gameweek_id" INTEGER,
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "kickoff" TIMESTAMP(3),
    "home_difficulty" INTEGER NOT NULL,
    "away_difficulty" INTEGER NOT NULL,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "started" BOOLEAN NOT NULL,
    "finished" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixtures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gameweeks_season_number_key" ON "gameweeks"("season", "number");

-- CreateIndex
CREATE UNIQUE INDEX "players_code_key" ON "players"("code");

-- CreateIndex
CREATE INDEX "players_team_id_idx" ON "players"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixtures_code_key" ON "fixtures"("code");

-- CreateIndex
CREATE INDEX "fixtures_gameweek_id_idx" ON "fixtures"("gameweek_id");

-- CreateIndex
CREATE INDEX "fixtures_home_team_id_idx" ON "fixtures"("home_team_id");

-- CreateIndex
CREATE INDEX "fixtures_away_team_id_idx" ON "fixtures"("away_team_id");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

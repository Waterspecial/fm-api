-- CreateEnum
CREATE TYPE "SnapshotSource" AS ENUM ('BOOTSTRAP_STATIC', 'FIXTURES');

-- CreateTable
CREATE TABLE "gameweek_snapshots" (
    "id" SERIAL NOT NULL,
    "source" "SnapshotSource" NOT NULL,
    "gameweek_id" INTEGER,
    "payload" JSONB NOT NULL,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gameweek_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gameweek_snapshots_source_taken_at_idx" ON "gameweek_snapshots"("source", "taken_at");

-- CreateIndex
CREATE INDEX "gameweek_snapshots_gameweek_id_idx" ON "gameweek_snapshots"("gameweek_id");

-- AddForeignKey
ALTER TABLE "gameweek_snapshots" ADD CONSTRAINT "gameweek_snapshots_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

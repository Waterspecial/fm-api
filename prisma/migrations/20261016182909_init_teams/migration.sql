-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "code" INTEGER NOT NULL,
    "fpl_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "strength_overall_home" INTEGER NOT NULL,
    "strength_overall_away" INTEGER NOT NULL,
    "strength_attack_home" INTEGER,
    "strength_attack_away" INTEGER,
    "strength_defence_home" INTEGER,
    "strength_defence_away" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const SNAPSHOT_DIR = new URL('./seed/fpl/', import.meta.url);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type FplTeam = {
  id: number;
  code: number;
  name: string;
  short_name: string;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
};

type BootstrapStatic = {
  teams: FplTeam[];
};

const nullIfZero = (n: number) => (n === 0 ? null : n);

function toTeamRow(t: FplTeam) {
  return {
    code: t.code,
    fplId: t.id,
    name: t.name,
    shortName: t.short_name,
    strengthOverallHome: t.strength_overall_home,
    strengthOverallAway: t.strength_overall_away,
    strengthAttackHome: nullIfZero(t.strength_attack_home),
    strengthAttackAway: nullIfZero(t.strength_attack_away),
    strengthDefenceHome: nullIfZero(t.strength_defence_home),
    strengthDefenceAway: nullIfZero(t.strength_defence_away),
  };
}

async function seedTeams(teams: FplTeam[]) {
  for (const t of teams) {
    const row = toTeamRow(t);
    await prisma.team.upsert({
      where: { code: row.code },
      update: row,
      create: row,
    });
  }
  return teams.length;
}

async function main() {
  const file = new URL('bootstrap-static.json', SNAPSHOT_DIR);
  const data = JSON.parse(readFileSync(file, 'utf8')) as BootstrapStatic;

  const count = await seedTeams(data.teams);
  console.log(`Seeded ${count} teams from bootstrap-static.json`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

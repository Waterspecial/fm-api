import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

const SNAPSHOT_DIR = new URL('./seed/fpl/', import.meta.url);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// A Prisma client inside a transaction (the `tx` that $transaction gives us).
type Db = Prisma.TransactionClient;

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

type FplGameweek = {
  id: number;
  deadline_time: string;
  is_current: boolean;
  is_next: boolean;
  finished: boolean;
  data_checked: boolean;
};

type FplPlayer = {
  id: number;
  code: number;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  status: string;
  news: string;
  chance_of_playing_next_round: number | null;
};

type BootstrapStatic = {
  teams: FplTeam[];
  events: FplGameweek[];
  elements: FplPlayer[];
};

type FplFixture = {
  id: number;
  code: number;
  event: number | null;
  team_h: number;
  team_a: number;
  kickoff_time: string | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
  team_h_score: number | null;
  team_a_score: number | null;
  started: boolean;
  finished: boolean;
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

// FPL doesn't say which season it is. GW1 is in August, so its year is
// the start of the season: a 2026 deadline means "2026/27".
function seasonFrom(gameweeks: FplGameweek[]) {
  const start = new Date(gameweeks[0].deadline_time).getUTCFullYear();
  const end = String(start + 1).slice(-2);
  return `${start}/${end}`;
}

function toGameweekRow(g: FplGameweek, season: string) {
  return {
    season,
    number: g.id,
    deadline: new Date(g.deadline_time),
    isCurrent: g.is_current,
    isNext: g.is_next,
    finished: g.finished,
    dataChecked: g.data_checked,
  };
}

// FPL's element_type: 1 = GKP, 2 = DEF, 3 = MID, 4 = FWD.
const POSITIONS = ['GKP', 'DEF', 'MID', 'FWD'] as const;

function toPlayerRow(p: FplPlayer, teamIds: Map<number, number>) {
  const position = POSITIONS[p.element_type - 1];
  const teamId = teamIds.get(p.team);
  if (!position || teamId === undefined) {
    throw new Error(`Player ${p.web_name}: unknown position or team`);
  }

  return {
    code: p.code,
    fplId: p.id,
    webName: p.web_name,
    position,
    teamId,
    price: p.now_cost,
    status: p.status,
    news: p.news,
    chanceOfPlayingNextRound: p.chance_of_playing_next_round,
  };
}

// Returns a map from FPL's team id to our team id, for players and fixtures.
function toFixtureRow(
  f: FplFixture,
  teamIds: Map<number, number>,
  gameweekIds: Map<number, number>,
) {
  const homeTeamId = teamIds.get(f.team_h);
  const awayTeamId = teamIds.get(f.team_a);
  if (homeTeamId === undefined || awayTeamId === undefined) {
    throw new Error(`Fixture ${f.code}: unknown team`);
  }

  // A postponed match has no gameweek (event is null) until it's rescheduled.
  const gameweekId = f.event === null ? null : gameweekIds.get(f.event);
  if (gameweekId === undefined) {
    throw new Error(`Fixture ${f.code}: unknown gameweek ${f.event}`);
  }

  return {
    code: f.code,
    fplId: f.id,
    gameweekId,
    homeTeamId,
    awayTeamId,
    kickoff: f.kickoff_time === null ? null : new Date(f.kickoff_time),
    homeDifficulty: f.team_h_difficulty,
    awayDifficulty: f.team_a_difficulty,
    homeScore: f.team_h_score,
    awayScore: f.team_a_score,
    started: f.started,
    finished: f.finished,
  };
}

async function seedTeams(db: Db, teams: FplTeam[]) {
  const teamIds = new Map<number, number>();
  for (const t of teams) {
    const row = toTeamRow(t);
    const saved = await db.team.upsert({
      where: { code: row.code },
      update: row,
      create: row,
    });
    teamIds.set(t.id, saved.id);
  }
  return teamIds;
}

// Returns a map from gameweek number to our gameweek id, for fixtures.
async function seedGameweeks(db: Db, gameweeks: FplGameweek[]) {
  const season = seasonFrom(gameweeks);
  const gameweekIds = new Map<number, number>();
  for (const g of gameweeks) {
    const row = toGameweekRow(g, season);
    const saved = await db.gameweek.upsert({
      where: { season_number: { season: row.season, number: row.number } },
      update: row,
      create: row,
    });
    gameweekIds.set(g.id, saved.id);
  }
  return gameweekIds;
}

async function seedPlayers(
  db: Db,
  players: FplPlayer[],
  teamIds: Map<number, number>,
) {
  for (const p of players) {
    const row = toPlayerRow(p, teamIds);
    await db.player.upsert({
      where: { code: row.code },
      update: row,
      create: row,
    });
  }
  return players.length;
}

async function seedFixtures(
  db: Db,
  fixtures: FplFixture[],
  teamIds: Map<number, number>,
  gameweekIds: Map<number, number>,
) {
  for (const f of fixtures) {
    const row = toFixtureRow(f, teamIds, gameweekIds);
    await db.fixture.upsert({
      where: { code: row.code },
      update: row,
      create: row,
    });
  }
  return fixtures.length;
}

// Reads one JSON file from the snapshot folder.
function readSnapshot<T>(name: string): T {
  const file = new URL(name, SNAPSHOT_DIR);
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

async function main() {
  const data = readSnapshot<BootstrapStatic>('bootstrap-static.json');
  const fixtures = readSnapshot<FplFixture[]>('fixtures.json');

  // One transaction: if any step fails, nothing is saved.
  await prisma.$transaction(
    async (tx) => {
      const teamIds = await seedTeams(tx, data.teams);
      console.log(`Seeded ${teamIds.size} teams`);

      const players = await seedPlayers(tx, data.elements, teamIds);
      console.log(`Seeded ${players} players`);

      const gameweekIds = await seedGameweeks(tx, data.events);
      console.log(`Seeded ${gameweekIds.size} gameweeks`);

      const count = await seedFixtures(tx, fixtures, teamIds, gameweekIds);
      console.log(`Seeded ${count} fixtures`);
    },
    { timeout: 60_000 },
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

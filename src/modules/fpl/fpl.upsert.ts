import type { Prisma } from '../../generated/prisma/client.js';
import type {
  BootstrapStatic,
  FplFixture,
  FplGameweek,
  FplPlayer,
  FplTeam,
} from './fpl.schemas.js';

// Turns validated FPL data into rows and upserts them.
// Shared by the seed (prisma/seed.ts) and the sync (FplSyncService).

/** A Prisma client inside a transaction (the `tx` that $transaction gives). */
export type Db = Prisma.TransactionClient;

// ---------- Mapping: FPL's shape -> our columns ----------

// FPL uses 0 to mean "not set" for some strengths.
const nullIfZero = (n: number) => (n === 0 ? null : n);

// FPL doesn't say which season it is. GW1 is in August, so its year is
// the start of the season: a 2026 deadline means "2026/27".
export function seasonFrom(gameweeks: FplGameweek[]) {
  const start = new Date(gameweeks[0].deadline_time).getUTCFullYear();
  const end = String(start + 1).slice(-2);
  return `${start}/${end}`;
}

// FPL's element_type: 1 = GKP, 2 = DEF, 3 = MID, 4 = FWD.
const POSITIONS = ['GKP', 'DEF', 'MID', 'FWD'] as const;

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

// ---------- Saving: upsert each table ----------

// Returns a map from FPL's team id to our team id, for players and fixtures.
async function upsertTeams(db: Db, teams: FplTeam[]) {
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
async function upsertGameweeks(db: Db, gameweeks: FplGameweek[]) {
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

async function upsertPlayers(
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

async function upsertFixtures(
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

// ---------- Everything, in the right order ----------

/**
 * Upserts teams, players, gameweeks and fixtures. Call it inside a
 * transaction so a failure part-way saves nothing.
 */
export async function upsertAll(
  db: Db,
  bootstrap: BootstrapStatic,
  fixtures: FplFixture[],
) {
  const teamIds = await upsertTeams(db, bootstrap.teams);
  const players = await upsertPlayers(db, bootstrap.elements, teamIds);
  const gameweekIds = await upsertGameweeks(db, bootstrap.events);
  const fixtureCount = await upsertFixtures(db, fixtures, teamIds, gameweekIds);

  return {
    teams: teamIds.size,
    players,
    gameweeks: gameweekIds.size,
    fixtures: fixtureCount,
  };
}

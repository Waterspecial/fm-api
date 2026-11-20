import { readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  bootstrapStaticSchema,
  fixturesSchema,
} from '../src/modules/fpl/fpl.schemas.js';
import { upsertAll } from '../src/modules/fpl/fpl.upsert.js';

// Loads the saved FPL snapshot (prisma/seed/fpl/) into the database.
// The mapping and upsert code is shared with the sync, in src/modules/fpl/.

const SNAPSHOT_DIR = new URL('./seed/fpl/', import.meta.url);

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function readSnapshot(name: string): unknown {
  return JSON.parse(readFileSync(new URL(name, SNAPSHOT_DIR), 'utf8'));
}

async function main() {
  // Check the files with the same Zod schemas the sync uses.
  const bootstrap = bootstrapStaticSchema.parse(
    readSnapshot('bootstrap-static.json'),
  );
  const fixtures = fixturesSchema.parse(readSnapshot('fixtures.json'));

  // One transaction: if any step fails, nothing is saved.
  const counts = await prisma.$transaction(
    (tx) => upsertAll(tx, bootstrap, fixtures),
    { timeout: 60_000 },
  );

  console.log(
    `Seeded ${counts.teams} teams, ${counts.players} players, ` +
      `${counts.gameweeks} gameweeks, ${counts.fixtures} fixtures`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

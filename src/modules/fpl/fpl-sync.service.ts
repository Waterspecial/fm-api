import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { FplClient } from './fpl.client.js';
import { bootstrapStaticSchema, fixturesSchema } from './fpl.schemas.js';
import { upsertAll } from './fpl.upsert.js';

/**
 * Pulls FPL's bootstrap-static and fixtures into our tables.
 * Run by `npm run fpl:sync` for now, and by the worker on a schedule (FM-008).
 */
@Injectable()
export class FplSyncService {
  private readonly logger = new Logger(FplSyncService.name);

  constructor(
    private readonly fpl: FplClient,
    private readonly prisma: PrismaService,
  ) {}

  async syncAll() {
    // 1. Download. Outside any transaction: network calls can be slow.
    const [bootstrapRaw, fixturesRaw] = await Promise.all([
      this.fpl.getBootstrapStatic(),
      this.fpl.getFixtures(),
    ]);

    // 2. Keep a copy of exactly what FPL sent, before checking it.
    const snapshots = await this.prisma.gameweekSnapshot.createManyAndReturn({
      data: [
        {
          source: 'BOOTSTRAP_STATIC',
          payload: bootstrapRaw as Prisma.InputJsonValue,
        },
        { source: 'FIXTURES', payload: fixturesRaw as Prisma.InputJsonValue },
      ],
      select: { id: true },
    });
    const snapshotIds = snapshots.map((s) => s.id);

    // 3. Check the shape. On failure the snapshots above are already saved.
    const bootstrap = bootstrapStaticSchema.safeParse(bootstrapRaw);
    const fixtures = fixturesSchema.safeParse(fixturesRaw);
    if (!bootstrap.success || !fixtures.success) {
      const error = (bootstrap.error ?? fixtures.error) as z.ZodError;
      throw new Error(
        `FPL response failed validation (snapshots ${snapshotIds.join(', ')}):\n` +
          z.prettifyError(error),
      );
    }

    // 4. Save everything in one transaction, then tag the snapshots with
    //    the gameweek that is now current.
    const { counts, currentGameweek } = await this.prisma.$transaction(
      async (tx) => {
        const counts = await upsertAll(tx, bootstrap.data, fixtures.data);
        const currentGameweek = await tx.gameweek.findFirst({
          where: { isCurrent: true },
          orderBy: { id: 'desc' },
        });
        if (currentGameweek) {
          await tx.gameweekSnapshot.updateMany({
            where: { id: { in: snapshotIds } },
            data: { gameweekId: currentGameweek.id },
          });
        }
        return { counts, currentGameweek };
      },
      { timeout: 60_000 },
    );

    this.logger.log(
      `FPL sync: ${counts.teams} teams, ${counts.players} players, ` +
        `${counts.gameweeks} gameweeks, ${counts.fixtures} fixtures ` +
        `(current: ${currentGameweek ? `GW${currentGameweek.number}` : 'none'})`,
    );
    return { ...counts, currentGameweek: currentGameweek?.number ?? null };
  }
}

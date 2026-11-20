import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { FplSyncService } from './fpl-sync.service.js';
import { FplClient } from './fpl.client.js';

/**
 * Everything that talks to FPL. Loaded by the sync script and, later, the
 * worker. Never import it into AppModule: the API must not call FPL.
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [FplClient, FplSyncService],
  exports: [FplSyncService],
})
export class FplModule {}

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module.js';
import { ConfigService } from '../config/config.service.js';
import { FplModule } from '../modules/fpl/fpl.module.js';
import { FplSyncProcessor } from './fpl-sync.processor.js';
import { FplSyncScheduler } from './fpl-sync.scheduler.js';
import { FPL_QUEUE } from './queues.js';

/**
 * The root module of the worker process (`src/worker.ts`). Owns the BullMQ
 * connection and the scheduled jobs. Never import it into AppModule.
 */
@Module({
  imports: [
    ConfigModule,
    // One Redis connection for every queue in the worker.
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.env.REDIS_URL },
      }),
    }),
    BullModule.registerQueue({
      name: FPL_QUEUE,
      defaultJobOptions: {
        // Keep Redis small: only the most recent finished jobs.
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    }),
    FplModule,
  ],
  providers: [FplSyncProcessor, FplSyncScheduler],
})
export class WorkerModule {}

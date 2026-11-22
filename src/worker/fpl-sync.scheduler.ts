import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { FPL_QUEUE, FPL_SYNC_JOB } from './queues.js';

export const FPL_SYNC_SCHEDULER_ID = 'fpl-sync';
export const FPL_SYNC_EVERY_MS = 6 * 60 * 60 * 1000; // 6 hours

@Injectable()
export class FplSyncScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(FplSyncScheduler.name);

  constructor(@InjectQueue(FPL_QUEUE) private readonly queue: Queue) {}

  async onApplicationBootstrap() {
    // Asked before the upsert, which would make it always exist.
    const existed = await this.queue.getJobScheduler(FPL_SYNC_SCHEDULER_ID);

    // Upsert: create the schedule, or update it if it already exists.
    await this.queue.upsertJobScheduler(
      FPL_SYNC_SCHEDULER_ID,
      { every: FPL_SYNC_EVERY_MS },
      { name: FPL_SYNC_JOB },
    );

    // A new schedule runs its first job straight away. An existing one keeps
    // its next run time (up to 6 hours away), so sync once now ourselves.
    // If the next run is already overdue (the worker was off), BullMQ runs it
    // as soon as we start, so adding our own job would sync twice.
    if (existed && (existed.next ?? 0) > Date.now()) {
      await this.queue.add(FPL_SYNC_JOB, {});
    }

    this.logger.log('FPL sync scheduled every 6 hours, first run queued now');
  }
}

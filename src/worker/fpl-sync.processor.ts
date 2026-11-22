import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { FplSyncService } from '../modules/fpl/fpl-sync.service.js';
import { FPL_QUEUE, FPL_SYNC_JOB } from './queues.js';

@Processor(FPL_QUEUE, { concurrency: 1 })
export class FplSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(FplSyncProcessor.name);

  constructor(private readonly sync: FplSyncService) {
    super();
  }

  // BullMQ calls this for every job. Whatever it returns is saved on the
  // job in Redis. If it throws, the job is marked as failed.
  async process(job: Job) {
    if (job.name !== FPL_SYNC_JOB) {
      throw new Error(`Unknown job "${job.name}" on the ${FPL_QUEUE} queue`);
    }
    return this.sync.syncAll();
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Job ${job?.name} (id ${job?.id}) failed: ${error.message}`,
    );
  }
}

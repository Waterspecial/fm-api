import type { Queue } from 'bullmq';
import {
  FPL_SYNC_EVERY_MS,
  FPL_SYNC_SCHEDULER_ID,
  FplSyncScheduler,
} from './fpl-sync.scheduler.js';

// A fake queue: only the three methods the scheduler calls. No Redis.
function fakeQueue(existingScheduler: object | undefined) {
  return {
    getJobScheduler: vi.fn().mockResolvedValue(existingScheduler),
    upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
    add: vi.fn().mockResolvedValue(undefined),
  };
}

describe('FplSyncScheduler', () => {
  it('creates the 6-hour schedule on the first start, with no extra job', async () => {
    const queue = fakeQueue(undefined);

    await new FplSyncScheduler(
      queue as unknown as Queue,
    ).onApplicationBootstrap();

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
      FPL_SYNC_SCHEDULER_ID,
      { every: FPL_SYNC_EVERY_MS },
      { name: 'sync' },
    );
    expect(FPL_SYNC_EVERY_MS).toBe(6 * 60 * 60 * 1000);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('adds one sync job now when the schedule already exists', async () => {
    const queue = fakeQueue({
      key: FPL_SYNC_SCHEDULER_ID,
      next: Date.now() + 60_000,
    });

    await new FplSyncScheduler(
      queue as unknown as Queue,
    ).onApplicationBootstrap();

    expect(queue.upsertJobScheduler).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith('sync', {});
  });

  it('adds no extra job when the next run is overdue', async () => {
    // The worker was off past the next run time: BullMQ runs that job now.
    const queue = fakeQueue({
      key: FPL_SYNC_SCHEDULER_ID,
      next: Date.now() - 1000,
    });

    await new FplSyncScheduler(
      queue as unknown as Queue,
    ).onApplicationBootstrap();

    expect(queue.upsertJobScheduler).toHaveBeenCalledTimes(1);
    expect(queue.add).not.toHaveBeenCalled();
  });
});

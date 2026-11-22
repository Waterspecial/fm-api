import type { Job } from 'bullmq';
import type { FplSyncService } from '../modules/fpl/fpl-sync.service.js';
import { FplSyncProcessor } from './fpl-sync.processor.js';

const counts = {
  teams: 20,
  players: 672,
  gameweeks: 38,
  fixtures: 380,
  currentGameweek: 10,
};

// Only the field the processor reads.
const job = (name: string) => ({ name }) as Job;

describe('FplSyncProcessor', () => {
  let syncAll: ReturnType<typeof vi.fn>;
  let processor: FplSyncProcessor;

  beforeEach(() => {
    // A fake sync service: never calls FPL or the database.
    syncAll = vi.fn().mockResolvedValue(counts);
    processor = new FplSyncProcessor({
      syncAll,
    } as unknown as FplSyncService);
  });

  it('runs syncAll once for a sync job and returns its counts', async () => {
    await expect(processor.process(job('sync'))).resolves.toEqual(counts);
    expect(syncAll).toHaveBeenCalledTimes(1);
  });

  it('rejects an unknown job without syncing', async () => {
    await expect(processor.process(job('oops'))).rejects.toThrow(
      'Unknown job "oops"',
    );
    expect(syncAll).not.toHaveBeenCalled();
  });

  it('lets a failed sync fail the job', async () => {
    syncAll.mockRejectedValue(new Error('FPL is down'));

    await expect(processor.process(job('sync'))).rejects.toThrow('FPL is down');
  });
});

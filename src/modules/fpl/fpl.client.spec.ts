import type { MockInstance } from 'vitest';
import type { ConfigService } from '../../config/config.service.js';
import { FplClient, FplHttpError } from './fpl.client.js';

// A fake config: only the field FplClient reads.
const config = {
  env: { FPL_BASE_URL: 'https://fpl.test/api/' },
} as ConfigService;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

describe('FplClient', () => {
  let fetchMock: MockInstance<typeof fetch>;
  let client: FplClient;

  beforeEach(() => {
    // Replace the real fetch, so tests never call FPL.
    fetchMock = vi.spyOn(globalThis, 'fetch');
    // Fake timers skip the 1 s and 2 s retry waits.
    vi.useFakeTimers();
    client = new FplClient(config);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the JSON from the right URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ teams: [] }));

    await expect(client.getBootstrapStatic()).resolves.toEqual({ teams: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://fpl.test/api/bootstrap-static/',
    );
  });

  it('retries a 503 and succeeds on the second try', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse([{ id: 1 }]));

    const result = client.getFixtures();
    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 404', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404));

    await expect(client.getFixtures()).rejects.toThrow(FplHttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('gives up after 3 attempts', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503));

    const result = expect(client.getFixtures()).rejects.toThrow('503');
    await vi.runAllTimersAsync();

    await result;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

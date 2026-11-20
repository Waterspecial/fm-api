import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service.js';

const TIMEOUT_MS = 10_000;

const USER_AGENT = 'Mozilla/5.0 (compatible; fm-api)';

// How long to wait before each retry. Two entries = up to 3 attempts in total.
const RETRY_DELAYS_MS = [1_000, 2_000];

// Worth trying again: network errors, timeouts, 429 (too many requests)
// and 5xx (FPL's side). Not other 4xx: a 404 won't fix itself.
function isRetryable(error: unknown): boolean {
  if (error instanceof FplHttpError) {
    return error.status === 429 || error.status >= 500;
  }
  return true;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** FPL answered, but not with a 2xx status. */
export class FplHttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
  ) {
    super(`FPL request failed: ${status} for ${url}`);
    this.name = 'FplHttpError';
  }
}

/**
 * The only code in the app that calls FPL. Returns FPL's JSON untouched
 * (`unknown`): the caller stores it, then validates it with Zod.
 */
@Injectable()
export class FplClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.env.FPL_BASE_URL;
  }

  getBootstrapStatic(): Promise<unknown> {
    return this.get('bootstrap-static/');
  }

  getFixtures(): Promise<unknown> {
    return this.get('fixtures/');
  }

  // Tries once, then once more after each delay in RETRY_DELAYS_MS.
  private async get(path: string): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.getOnce(path);
      } catch (error) {
        const delay = RETRY_DELAYS_MS[attempt];
        if (delay === undefined || !isRetryable(error)) {
          throw error;
        }
        await wait(delay);
      }
    }
  }

  private async getOnce(path: string): Promise<unknown> {
    const url = new URL(path, this.baseUrl).toString();

    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new FplHttpError(url, response.status);
    }
    return response.json();
  }
}

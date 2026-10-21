import { Injectable } from '@nestjs/common';
import { type Env, parseEnv } from './env.js';

@Injectable()
export class ConfigService {
  readonly env: Env;

  constructor() {
    try {
      process.loadEnvFile();
    } catch {
      // No .env file (e.g. in production). Variables come from the platform.
    }
    this.env = parseEnv(process.env);
  }
}

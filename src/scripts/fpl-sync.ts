import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FplSyncService } from '../modules/fpl/fpl-sync.service.js';
import { FplModule } from '../modules/fpl/fpl.module.js';

// `npm run fpl:sync`: pull FPL into the database once, then exit.
// Starts NestJS without a web server (an "application context").

const app = await NestFactory.createApplicationContext(FplModule);
try {
  await app.get(FplSyncService).syncAll();
} catch (error) {
  new Logger('fpl:sync').error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await app.close();
}

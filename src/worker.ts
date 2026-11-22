import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module.js';

// The second entry point: no web server, just scheduled jobs. & Keeps running until stopped

const app = await NestFactory.createApplicationContext(WorkerModule);

app.enableShutdownHooks();

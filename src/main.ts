import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file (e.g. in production). Variables come from the platform.
  }
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();

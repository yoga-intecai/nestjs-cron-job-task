import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { resolveCorsOrigins } from './config/configuration.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());

  app.enableCors({
    origin: resolveCorsOrigins(configService),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}

process.on('unhandledRejection', (reason) => {
  Logger.error(
    `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
    undefined,
    'Process',
  );
});

process.on('uncaughtException', (error) => {
  Logger.error(`Uncaught exception: ${error.message}`, error.stack, 'Process');
});

void bootstrap().catch((error) => {
  Logger.error(
    `Fatal error during bootstrap: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error.stack : undefined,
    'Bootstrap',
  );
  process.exit(1);
});

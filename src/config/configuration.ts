import type { MongooseModuleOptions } from '@nestjs/mongoose';
import type { ConfigService } from '@nestjs/config';
import { existsSync } from 'node:fs';

export function buildMongooseOptions(
  config: ConfigService,
): MongooseModuleOptions {
  const options: MongooseModuleOptions = {
    uri: config.get<string>('MONGODB_URI'),
    maxPoolSize: config.get<number>('MONGODB_POOL_SIZE', 10),
    serverSelectionTimeoutMS: config.get<number>(
      'MONGODB_SERVER_SELECTION_TIMEOUT_MS',
      5000,
    ),
    connectTimeoutMS: config.get<number>('MONGODB_CONNECT_TIMEOUT_MS', 10000),
    socketTimeoutMS: config.get<number>('MONGODB_SOCKET_TIMEOUT_MS', 45000),
  };

  if (config.get<boolean>('MONGODB_TLS', false)) {
    options.tls = true;
    // Certificate validation is never disabled.
    options.tlsAllowInvalidCertificates = false;
    options.tlsAllowInvalidHostnames = false;

    const caFile = config.get<string>('MONGODB_TLS_CA_FILE');
    if (caFile && existsSync(caFile)) {
      options.tlsCAFile = caFile;
    }
  }

  return options;
}

export function resolveCorsOrigins(config: ConfigService): string[] | boolean {
  const raw = (config.get<string>('CORS_ORIGIN') ?? '*').trim();

  // "*" is only permitted outside production (enforced by env validation).
  if (raw === '*') {
    return true;
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

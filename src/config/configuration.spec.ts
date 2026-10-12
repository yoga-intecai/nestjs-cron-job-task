import type { ConfigService } from '@nestjs/config';
import { envValidationSchema } from './env.validation.js';
import { buildMongooseOptions, resolveCorsOrigins } from './configuration.js';

function validate(env: Record<string, unknown>) {
  return envValidationSchema.validate(env, {
    allowUnknown: true,
    abortEarly: false,
  });
}

class FakeConfigService {
  constructor(private readonly env: Record<string, unknown> = {}) {}

  get<T>(key: string, defaultValue?: T): T {
    return (this.env[key] as T) ?? (defaultValue as T);
  }
}

describe('envValidationSchema', () => {
  it('requires MONGODB_URI', () => {
    const { error } = validate({});
    expect(error).toBeDefined();
  });

  it('applies sensible defaults', () => {
    const { error, value } = validate({
      MONGODB_URI: 'mongodb://localhost:27017/app',
    });

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.CRON_TIMEZONE).toBe('UTC');
    expect(value.MONGODB_POOL_SIZE).toBe(10);
    expect(value.CRON_LOCK_TTL_SECONDS).toBe(30);
  });

  it('rejects an out-of-range PORT', () => {
    const { error } = validate({
      MONGODB_URI: 'mongodb://localhost:27017/app',
      PORT: 70000,
    });

    expect(error).toBeDefined();
  });

  it('rejects a wildcard CORS origin in production', () => {
    const { error } = validate({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/app',
      CORS_ORIGIN: '*',
    });

    expect(error).toBeDefined();
  });

  it('accepts an explicit CORS origin in production', () => {
    const { error } = validate({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/app',
      CORS_ORIGIN: 'https://app.example.com',
    });

    expect(error).toBeUndefined();
  });
});

describe('buildMongooseOptions', () => {
  it('maps pool size and timeouts from configuration', () => {
    const config = new FakeConfigService({
      MONGODB_URI: 'mongodb://localhost:27017/app',
      MONGODB_POOL_SIZE: 25,
      MONGODB_SERVER_SELECTION_TIMEOUT_MS: 8000,
      MONGODB_TLS: false,
    }) as unknown as ConfigService;

    const options = buildMongooseOptions(config);

    expect(options.uri).toBe('mongodb://localhost:27017/app');
    expect(options.maxPoolSize).toBe(25);
    expect(options.serverSelectionTimeoutMS).toBe(8000);
  });

  it('never disables TLS certificate validation', () => {
    const config = new FakeConfigService({
      MONGODB_URI: 'mongodb://localhost:27017/app',
      MONGODB_TLS: true,
    }) as unknown as ConfigService;

    const options = buildMongooseOptions(config);

    expect(options.tls).toBe(true);
    expect(options.tlsAllowInvalidCertificates).toBe(false);
    expect(options.tlsAllowInvalidHostnames).toBe(false);
  });
});

describe('resolveCorsOrigins', () => {
  it('returns true for the development wildcard', () => {
    const config = new FakeConfigService({
      CORS_ORIGIN: '*',
    }) as unknown as ConfigService;

    expect(resolveCorsOrigins(config)).toBe(true);
  });

  it('splits a comma separated allowlist', () => {
    const config = new FakeConfigService({
      CORS_ORIGIN: 'https://a.example.com, https://b.example.com',
    }) as unknown as ConfigService;

    expect(resolveCorsOrigins(config)).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
  });
});

import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  MONGODB_URI: Joi.string()
    .pattern(/^mongodb(\+srv)?:\/\//)
    .required()
    .messages({
      'string.pattern.base':
        'MONGODB_URI must be a valid mongodb:// or mongodb+srv:// connection string',
      'any.required': 'MONGODB_URI is required',
    }),
  MONGODB_POOL_SIZE: Joi.number().integer().min(1).max(100).default(10),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(5000),
  MONGODB_CONNECT_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(120000)
    .default(10000),
  MONGODB_SOCKET_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(300000)
    .default(45000),
  MONGODB_TLS: Joi.boolean().default(false),
  MONGODB_TLS_CA_FILE: Joi.string().optional(),
  CRON_SCHEDULE: Joi.string().default('0 * * * * *'),
  CRON_TIMEZONE: Joi.string().default('UTC'),
  CRON_LOCK_TTL_SECONDS: Joi.number().integer().min(5).max(3600).default(30),
  CORS_ORIGIN: Joi.string()
    .default('*')
    .custom((value: string, helpers) => {
      const nodeEnv = helpers.state.ancestors[0]?.NODE_ENV;
      if (nodeEnv === 'production' && value.trim() === '*') {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .messages({
      'any.invalid':
        'CORS_ORIGIN must not be "*" in production; provide an explicit comma-separated allowlist',
    }),
}).unknown(true);

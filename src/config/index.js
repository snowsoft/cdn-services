const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define validation schema
const envVarsSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('production', 'development', 'test')
        .default('development'),
    PORT: Joi.number().default(3000),

    // App
    APP_NAME: Joi.string().default('MyApp'),
    APP_URL: Joi.string().uri().default('http://localhost:3000'),
    API_VERSION: Joi.string().default('v1'),

    // Security
    JWT_SECRET: Joi.string().default('your-secret-key-change-in-production').description('JWT secret key'),
    JWT_EXPIRE: Joi.string().default('7d'),
    SESSION_SECRET: Joi.string().default('your-session-secret-change-in-production'),
    BCRYPT_ROUNDS: Joi.number().default(10),

    // Database
    DATABASE_URL: Joi.string(),
    DB_HOST: Joi.string(),
    DB_PORT: Joi.number().default(5432),
    DB_NAME: Joi.string(),
    DB_USER: Joi.string(),
    DB_PASSWORD: Joi.string(),
    DB_SSL: Joi.boolean().default(false),

    // Redis
    REDIS_URL: Joi.string(),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6379),
    REDIS_PASSWORD: Joi.string().allow(''),
    REDIS_TLS: Joi.boolean().default(false),

    // Email
    SMTP_HOST: Joi.string(),
    SMTP_PORT: Joi.number().default(587),
    SMTP_USER: Joi.string(),
    SMTP_PASS: Joi.string(),
    EMAIL_FROM: Joi.string().email(),

    // AWS
    AWS_ACCESS_KEY_ID: Joi.string(),
    AWS_SECRET_ACCESS_KEY: Joi.string(),
    AWS_REGION: Joi.string().default('us-east-1'),
    S3_BUCKET: Joi.string(),

    // Storage
    STORAGE_DEFAULT: Joi.string().default('local'),
    STORAGE_LOCAL_ROOT: Joi.string().default('storage'),
    STORAGE_LOCAL_URL: Joi.string().default('/storage'),
    STORAGE_S3_BUCKET: Joi.string(),
    STORAGE_S3_REGION: Joi.string().default('us-east-1'),
    STORAGE_S3_URL: Joi.string(),
    STORAGE_AZURE_CONTAINER: Joi.string().default('files'),
    STORAGE_AZURE_CONNECTION_STRING: Joi.string(),
    STORAGE_AZURE_URL: Joi.string(),
    STORAGE_GCS_BUCKET: Joi.string(),
    STORAGE_GCS_PROJECT_ID: Joi.string(),
    STORAGE_GCS_KEY_FILENAME: Joi.string(),
    STORAGE_GCS_URL: Joi.string(),

    // Monitoring
    SENTRY_DSN: Joi.string(),
    NEW_RELIC_LICENSE_KEY: Joi.string(),
    PROMETHEUS_METRICS: Joi.boolean().default(true),

    // Feature flags
    ENABLE_SIGNUP: Joi.boolean().default(true),
    ENABLE_API_DOCS: Joi.boolean().default(true),
    MAINTENANCE_MODE: Joi.boolean().default(false),

    // Rate limiting
    RATE_LIMIT_WINDOW: Joi.string().default('15m'),
    RATE_LIMIT_MAX: Joi.number().default(100),

    // CORS
    CORS_ORIGIN: Joi.string().default('*'),

    // Logging
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
        .default('info'),
})
    .unknown();

// Validate environment variables
const { value: envVars, error } = envVarsSchema
    .prefs({ errors: { label: 'key' } })
    .validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    version: process.env.npm_package_version || '1.0.0',

    app: {
        name: envVars.APP_NAME,
        url: envVars.APP_URL,
        apiVersion: envVars.API_VERSION,
    },

    security: {
        jwtSecret: envVars.JWT_SECRET,
        jwtExpire: envVars.JWT_EXPIRE,
        sessionSecret: envVars.SESSION_SECRET,
        bcryptRounds: envVars.BCRYPT_ROUNDS,
    },

    database: {
        url: envVars.DATABASE_URL,
        host: envVars.DB_HOST,
        port: envVars.DB_PORT,
        name: envVars.DB_NAME,
        user: envVars.DB_USER,
        password: envVars.DB_PASSWORD,
        ssl: envVars.DB_SSL,
    },

    redis: {
        url: envVars.REDIS_URL,
        host: envVars.REDIS_HOST,
        port: envVars.REDIS_PORT,
        password: envVars.REDIS_PASSWORD,
        tls: envVars.REDIS_TLS,
    },

    email: {
        smtp: {
            host: envVars.SMTP_HOST,
            port: envVars.SMTP_PORT,
            auth: {
                user: envVars.SMTP_USER,
                pass: envVars.SMTP_PASS,
            },
        },
        from: envVars.EMAIL_FROM,
    },

    aws: {
        accessKeyId: envVars.AWS_ACCESS_KEY_ID,
        secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
        region: envVars.AWS_REGION,
        s3Bucket: envVars.S3_BUCKET,
    },

    monitoring: {
        sentryDsn: envVars.SENTRY_DSN,
        newRelicKey: envVars.NEW_RELIC_LICENSE_KEY,
        prometheusEnabled: envVars.PROMETHEUS_METRICS,
    },

    features: {
        signupEnabled: envVars.ENABLE_SIGNUP,
        apiDocsEnabled: envVars.ENABLE_API_DOCS,
        maintenanceMode: envVars.MAINTENANCE_MODE,
    },

    rateLimit: {
        windowMs: envVars.RATE_LIMIT_WINDOW,
        max: envVars.RATE_LIMIT_MAX,
    },

    corsOrigin: envVars.CORS_ORIGIN,
    logLevel: envVars.LOG_LEVEL,

    storage: {
        default: envVars.STORAGE_DEFAULT,
        local: {
            root: envVars.STORAGE_LOCAL_ROOT,
            url: envVars.STORAGE_LOCAL_URL,
        },
        disks: {
            local: {
                driver: 'local',
                config: {
                    root: envVars.STORAGE_LOCAL_ROOT,
                    url: envVars.STORAGE_LOCAL_URL,
                },
            },
            ...(envVars.STORAGE_S3_BUCKET && {
                s3: {
                    driver: 's3',
                    config: {
                        bucket: envVars.STORAGE_S3_BUCKET,
                        region: envVars.STORAGE_S3_REGION,
                        url: envVars.STORAGE_S3_URL,
                        credentials: envVars.AWS_ACCESS_KEY_ID && envVars.AWS_SECRET_ACCESS_KEY ? {
                            key: envVars.AWS_ACCESS_KEY_ID,
                            secret: envVars.AWS_SECRET_ACCESS_KEY,
                        } : undefined,
                    },
                },
            }),
            ...(envVars.STORAGE_AZURE_CONNECTION_STRING && {
                azure: {
                    driver: 'azure',
                    config: {
                        container: envVars.STORAGE_AZURE_CONTAINER,
                        connectionString: envVars.STORAGE_AZURE_CONNECTION_STRING,
                        url: envVars.STORAGE_AZURE_URL,
                    },
                },
            }),
            ...(envVars.STORAGE_GCS_BUCKET && {
                gcs: {
                    driver: 'gcs',
                    config: {
                        bucket: envVars.STORAGE_GCS_BUCKET,
                        projectId: envVars.STORAGE_GCS_PROJECT_ID,
                        keyFilename: envVars.STORAGE_GCS_KEY_FILENAME,
                        url: envVars.STORAGE_GCS_URL,
                    },
                },
            }),
        },
    },
};
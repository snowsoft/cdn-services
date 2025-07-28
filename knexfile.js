const path = require('path');
require('dotenv').config();

const BASE_PATH = path.join(__dirname, 'src', 'db');

module.exports = {
    development: {
        client: 'postgresql',
        connection: process.env.DATABASE_URL || {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'cdn-services_dev',
            user: process.env.DB_USER || 'devuser',
            password: process.env.DB_PASSWORD || 'devpass',
        },
        migrations: {
            directory: path.join(BASE_PATH, 'migrations'),
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: path.join(BASE_PATH, 'seeds'),
        },
        pool: {
            min: 2,
            max: 10,
        },
        debug: true,
    },

    test: {
        client: 'postgresql',
        connection: process.env.DATABASE_URL || {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'cdn-services_test',
            user: process.env.DB_USER || 'testuser',
            password: process.env.DB_PASSWORD || 'testpass',
        },
        migrations: {
            directory: path.join(BASE_PATH, 'migrations'),
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: path.join(BASE_PATH, 'seeds'),
        },
        pool: {
            min: 2,
            max: 10,
        },
    },

    production: {
        client: 'postgresql',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        },
        migrations: {
            directory: path.join(BASE_PATH, 'migrations'),
            tableName: 'knex_migrations',
        },
        seeds: {
            directory: path.join(BASE_PATH, 'seeds'),
        },
        pool: {
            min: 2,
            max: 20,
        },
    },
};
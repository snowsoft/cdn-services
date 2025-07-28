const knex = require('knex');
const knexConfig = require('../knexfile');
const config = require('./config');

const environment = config.env || 'development';
const dbConfig = knexConfig[environment];

const db = knex(dbConfig);

// Test connection
db.raw('SELECT 1')
    .then(() => {
        console.log('Database connected successfully');
    })
    .catch((err) => {
        console.error('Database connection failed:', err);
        process.exit(1);
    });

module.exports = db;
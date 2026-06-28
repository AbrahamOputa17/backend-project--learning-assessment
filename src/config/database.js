const { Pool } = require('pg');
const config = require('./index');
const logger = require('../utils/logger');

const useSsl = process.env.DATABASE_URL
  ? process.env.DB_SSL !== 'false'
  : process.env.NODE_ENV === 'production' || process.env.VERCEL;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle database client', err);
});

/**
 * Execute a query against the database pool.
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client from the pool (useful for transactions).
 */
const getClient = () => pool.connect();

/**
 * Test the database connection.
 */
const testConnection = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    logger.info('Database connection established');
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, testConnection, pool };

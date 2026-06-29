const { pool } = require('./src/config/database');
require('dotenv').config();

async function run() {
  try {
    console.log('Running unified schema migrations...');

    // 1. Users Table Columns
    console.log('Migrating users table...');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS matric_number VARCHAR(100)');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)');

    // 2. Courses Table Columns
    console.log('Migrating courses table...');
    await pool.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS outline JSONB');
    await pool.query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS pdf_url TEXT');

    // 3. Coding Submissions Table Columns
    console.log('Migrating coding_submissions table...');
    // We wrapped in a try/catch in case the table name is different or doesn't exist
    try {
      await pool.query('ALTER TABLE coding_submissions ADD COLUMN IF NOT EXISTS ai_feedback TEXT');
    } catch (e) {
      console.log('Skipping coding_submissions: ', e.message);
    }

    console.log('Migrations executed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();

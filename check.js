require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/learning_assessment' });
pool.query("SELECT id, outline, pdf_url FROM courses WHERE id='c1c8d148-08bf-48ec-a227-7840801d54c3'")
  .then(r => { 
    console.log(r.rows); 
    pool.end(); 
  })
  .catch(e => { 
    console.error(e.message); 
    pool.end(); 
  });

  
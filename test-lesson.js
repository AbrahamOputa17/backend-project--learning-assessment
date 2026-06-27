require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/learning_assessment' });

async function test() {
  try {
    // 1. Get an enrolled student for this course
    const courseId = 'c1c8d148-08bf-48ec-a227-7840801d54c3';
    const res = await pool.query(`SELECT user_id FROM enrollments WHERE course_id = $1 LIMIT 1`, [courseId]);
    if (res.rows.length === 0) {
      console.log('No student enrolled in this course.');
      process.exit(0);
    }
    const userId = res.rows[0].user_id;

    // 2. Generate token
    const token = jwt.sign({ id: userId, role: 'student' }, process.env.JWT_SECRET || 'fallback_secret');
    
    // 3. Make request to getLesson
    const req = http.request(`http://127.0.0.1:3000/api/learning/${courseId}/lesson/0`, {
      headers: { Authorization: 'Bearer ' + token }
    }, response => {
      let d = '';
      response.on('data', c => d += c);
      response.on('end', () => console.log('LESSON HTTP', response.statusCode, d));
    });
    req.on('error', console.error);
    req.end();

    // 4. Make request to getStatus
    const req2 = http.request(`http://127.0.0.1:3000/api/learning/${courseId}/status`, {
      headers: { Authorization: 'Bearer ' + token }
    }, response => {
      let d = '';
      response.on('data', c => d += c);
      response.on('end', () => console.log('STATUS HTTP', response.statusCode, d));
    });
    req2.on('error', console.error);
    req2.end();

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}
test();

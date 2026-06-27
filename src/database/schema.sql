-- Learning Assessment System Database Schema
-- Run: psql -U postgres -d learning_assessment -f src/database/schema.sql

-- Create database (run separately as superuser if needed):
-- CREATE DATABASE learning_assessment;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password      VARCHAR(255) NOT NULL,
  matric_number VARCHAR(100) UNIQUE,
  department    VARCHAR(100),
  role          VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'hod', 'admin')),
  avatar        TEXT,
  supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category      VARCHAR(100),
  difficulty    VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COURSE ENROLLMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- ============================================================
-- QUIZZES
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  time_limit    INTEGER,           -- in minutes, NULL = no limit
  max_attempts  INTEGER DEFAULT 1,
  pass_score    INTEGER DEFAULT 70, -- percentage
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id       UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(30) NOT NULL DEFAULT 'multiple_choice'
                  CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  points        INTEGER NOT NULL DEFAULT 1,
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- QUESTION OPTIONS (for MCQ / true-false)
-- ============================================================
CREATE TABLE IF NOT EXISTS question_options (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text  TEXT NOT NULL,
  is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
  order_index  INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id      UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score        NUMERIC(5,2),
  passed       BOOLEAN,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

-- ============================================================
-- QUIZ ANSWERS (per attempt)
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_answers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id  UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES question_options(id),
  text_answer TEXT,
  is_correct  BOOLEAN,
  points_earned INTEGER DEFAULT 0
);

-- ============================================================
-- CODING QUIZZES
-- ============================================================
CREATE TABLE IF NOT EXISTS coding_quizzes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  time_limit    INTEGER,       -- in minutes
  max_attempts  INTEGER DEFAULT 3,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CODING QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coding_questions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coding_quiz_id   UUID NOT NULL REFERENCES coding_quizzes(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  description      TEXT NOT NULL,
  starter_code     TEXT,
  solution_code    TEXT,
  language         VARCHAR(50) NOT NULL DEFAULT 'javascript',
  difficulty       VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points           INTEGER NOT NULL DEFAULT 10,
  order_index      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TEST CASES (for coding questions)
-- ============================================================
CREATE TABLE IF NOT EXISTS test_cases (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coding_question_id UUID NOT NULL REFERENCES coding_questions(id) ON DELETE CASCADE,
  input            TEXT,
  expected_output  TEXT NOT NULL,
  is_hidden        BOOLEAN NOT NULL DEFAULT FALSE,
  order_index      INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- CODE SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS code_submissions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coding_question_id UUID NOT NULL REFERENCES coding_questions(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code               TEXT NOT NULL,
  language           VARCHAR(50) NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'running', 'accepted', 'wrong_answer', 'error', 'timeout')),
  score              NUMERIC(5,2) DEFAULT 0,
  test_results       JSONB DEFAULT '[]',
  error_message      TEXT,
  execution_time_ms  INTEGER,
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_coding_quizzes_course ON coding_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_coding_questions_quiz ON coding_questions(coding_quiz_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_user ON code_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_code_submissions_question ON code_submissions(coding_question_id);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_coding_quizzes_updated_at
  BEFORE UPDATE ON coding_quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- EXTEND coding_questions: deadline + CA weight
-- ============================================================
ALTER TABLE coding_questions
  ADD COLUMN IF NOT EXISTS deadline   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ca_weight  NUMERIC(5,2) NOT NULL DEFAULT 0;

-- ============================================================
-- EXTEND code_submissions: late-submission tracking
-- ============================================================
ALTER TABLE code_submissions
  ADD COLUMN IF NOT EXISTS is_late      BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS late_penalty NUMERIC(5,2) NOT NULL DEFAULT 0;

-- ============================================================
-- CODING SCORES
-- One canonical CA mark per student per coding question.
-- Upsert via: INSERT ... ON CONFLICT (user_id, coding_question_id) DO UPDATE
-- ============================================================
CREATE TABLE IF NOT EXISTS coding_scores (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
  coding_question_id  UUID NOT NULL REFERENCES coding_questions(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES courses(id)          ON DELETE CASCADE,
  best_submission_id  UUID REFERENCES code_submissions(id)          ON DELETE SET NULL,
  raw_score           NUMERIC(5,2) NOT NULL DEFAULT 0,   -- (passed_tests / total_tests) × question.points
  final_score         NUMERIC(5,2) NOT NULL DEFAULT 0,   -- raw_score × (1 − late_penalty / 100)
  ca_contribution     NUMERIC(5,2) NOT NULL DEFAULT 0,   -- final_score × (ca_weight / 100)
  graded_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, coding_question_id)
);

-- ============================================================
-- INDEXES for coding_scores
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_coding_scores_user     ON coding_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_coding_scores_course   ON coding_scores(course_id);
CREATE INDEX IF NOT EXISTS idx_coding_scores_question ON coding_scores(coding_question_id);

-- ============================================================
-- updated_at trigger for coding_scores
-- ============================================================
CREATE OR REPLACE TRIGGER trg_coding_scores_graded_at
  BEFORE UPDATE ON coding_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
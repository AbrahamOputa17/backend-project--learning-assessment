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
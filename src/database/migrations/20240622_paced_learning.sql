-- Add pacing and module tracking to enrollments
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS current_module_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS module_started_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_modules      INTEGER[] DEFAULT '{}';

-- Track teaching content per course module if needed
-- Actually, we'll store generated lesson content in a new table to keep outline clean
CREATE TABLE IF NOT EXISTS generated_lessons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_index    INTEGER NOT NULL,
  content         TEXT NOT NULL, -- Markdown AI teaching content
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, module_index)
);

-- Index for learning progress lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_pacing ON enrollments(user_id, course_id);

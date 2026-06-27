-- Learning Assessment System - LMS Features Migration
-- Adds: Content Management, Communication Tools, Assignments, Grade Book, Analytics

-- ============================================================
-- COURSE MODULES/TOPICS
-- ============================================================
CREATE TABLE IF NOT EXISTS course_modules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COURSE MATERIALS (Files, Documents, Videos)
-- ============================================================
CREATE TABLE IF NOT EXISTS course_materials (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id     UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  file_url      TEXT NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_type     VARCHAR(50) NOT NULL, -- 'pdf', 'video', 'document', 'image', 'archive'
  file_size     BIGINT,                -- in bytes
  version       INTEGER NOT NULL DEFAULT 1,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  order_index   INTEGER NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CONTENT VERSION HISTORY
-- ============================================================
CREATE TABLE IF NOT EXISTS content_versions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id   UUID NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  file_url      TEXT NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  changed_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DISCUSSION FORUMS
-- ============================================================
CREATE TABLE IF NOT EXISTS discussion_forums (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FORUM THREADS
-- ============================================================
CREATE TABLE IF NOT EXISTS forum_threads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id      UUID NOT NULL REFERENCES discussion_forums(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  content       TEXT NOT NULL,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  pinned        BOOLEAN NOT NULL DEFAULT FALSE,
  locked        BOOLEAN NOT NULL DEFAULT FALSE,
  reply_count   INTEGER NOT NULL DEFAULT 0,
  view_count    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FORUM REPLIES
-- ============================================================
CREATE TABLE IF NOT EXISTS forum_replies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id     UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_best_answer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MESSAGING SYSTEM
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject       VARCHAR(255),
  content       TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MESSAGE ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS message_attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id    UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url      TEXT NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_size     BIGINT
);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  content       TEXT NOT NULL,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  scheduled_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL, -- 'announcement', 'message', 'grade', 'forum_reply', etc
  title         VARCHAR(255) NOT NULL,
  content       TEXT,
  related_id    UUID,              -- forum_id, message_id, course_id, etc
  is_read       BOOLEAN NOT NULL DEFAULT FALSE,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assignments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id     UUID REFERENCES course_modules(id) ON DELETE SET NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT NOT NULL,
  instructions  TEXT,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  due_date      TIMESTAMPTZ NOT NULL,
  late_submission_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  late_submission_days INTEGER DEFAULT 0,
  max_score     INTEGER NOT NULL DEFAULT 100,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ASSIGNMENT SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        VARCHAR(20) NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('draft', 'submitted', 'graded', 'returned')),
  is_late       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, user_id)
);

-- ============================================================
-- SUBMISSION FILES
-- ============================================================
CREATE TABLE IF NOT EXISTS submission_files (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  file_url      TEXT NOT NULL,
  file_name     VARCHAR(255) NOT NULL,
  file_size     BIGINT,
  file_type     VARCHAR(50),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GRADES/GRADE BOOK
-- ============================================================
CREATE TABLE IF NOT EXISTS grades (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  submission_id UUID REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  type          VARCHAR(30) NOT NULL, -- 'assignment', 'quiz', 'participation', 'coding'
  item_id       UUID,                 -- assignment_id, quiz_id, etc
  score         NUMERIC(5,2) NOT NULL,
  max_score     INTEGER NOT NULL DEFAULT 100,
  percentage    NUMERIC(5,2),
  weight        NUMERIC(5,2) DEFAULT 100, -- for weighted grading
  feedback      TEXT,
  graded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  graded_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GRADE WEIGHTS (per course)
-- ============================================================
CREATE TABLE IF NOT EXISTS grade_weights (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  category      VARCHAR(50) NOT NULL, -- 'assignments', 'quizzes', 'participation', 'coding'
  weight        NUMERIC(5,2) NOT NULL DEFAULT 25,
  UNIQUE(course_id, category)
);

-- ============================================================
-- STUDENT PROGRESS
-- ============================================================
CREATE TABLE IF NOT EXISTS student_progress (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  materials_viewed INTEGER NOT NULL DEFAULT 0,
  total_materials INTEGER NOT NULL DEFAULT 0,
  assignments_submitted INTEGER NOT NULL DEFAULT 0,
  total_assignments INTEGER NOT NULL DEFAULT 0,
  quizzes_completed INTEGER NOT NULL DEFAULT 0,
  total_quizzes INTEGER NOT NULL DEFAULT 0,
  current_grade NUMERIC(5,2),
  last_accessed TIMESTAMPTZ,
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'at_risk')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- ============================================================
-- ATTENDANCE/PARTICIPATION
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  event_type    VARCHAR(50) NOT NULL, -- 'forum_post', 'quiz_completed', 'material_viewed', 'live_session'
  event_id      UUID,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COURSE ANALYTICS
-- ============================================================
CREATE TABLE IF NOT EXISTS course_analytics (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  total_students INTEGER NOT NULL DEFAULT 0,
  active_students INTEGER NOT NULL DEFAULT 0,
  at_risk_students INTEGER NOT NULL DEFAULT 0,
  average_grade NUMERIC(5,2),
  completion_rate NUMERIC(5,2),
  engagement_score NUMERIC(5,2),
  most_viewed_material UUID,
  least_engaged_topic VARCHAR(255),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id)
);

-- ============================================================
-- LIVE SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS live_sessions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  created_by    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  meeting_url   VARCHAR(500),
  status        VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LIVE SESSION ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS live_session_attendance (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id    UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL,
  left_at       TIMESTAMPTZ,
  duration_minutes INTEGER,
  UNIQUE(session_id, user_id)
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_materials_module ON course_materials(module_id);
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON course_materials(created_by);
CREATE INDEX IF NOT EXISTS idx_content_versions_material ON content_versions(material_id);
CREATE INDEX IF NOT EXISTS idx_forums_course ON discussion_forums(course_id);
CREATE INDEX IF NOT EXISTS idx_threads_forum ON forum_threads(forum_id);
CREATE INDEX IF NOT EXISTS idx_threads_created_by ON forum_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_replies_thread ON forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_replies_created_by ON forum_replies(created_by);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_module ON assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_grades_user_course ON grades(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_grades_course ON grades(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_course ON student_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_course ON attendance_records(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_course ON live_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_session ON live_session_attendance(session_id);

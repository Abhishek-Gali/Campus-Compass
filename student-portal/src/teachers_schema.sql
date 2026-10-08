-- Teachers Table Schema
-- This table stores teacher accounts with subject-specific access

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  role TEXT DEFAULT 'Teacher',
  access_level INTEGER DEFAULT 2, -- Teachers are Level 2
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can read their own data
CREATE POLICY "Teachers can view own data"
ON teachers FOR SELECT
USING (true); -- Allow all reads for now (can be restricted later)

-- Policy: Only admins can manage teachers (using anon key for now)
CREATE POLICY "Enable all access for teacher management"
ON teachers FOR ALL
USING (true)
WITH CHECK (true);

-- Ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create index on subject_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_teachers_subject_code ON teachers(subject_code);

-- Insert sample teacher accounts for each subject (passwords securely hashed with bcrypt)
INSERT INTO teachers (id, password, name, subject_code, role, access_level, status)
VALUES
  ('TCHR_21CYSP2', crypt('teacher123', gen_salt('bf', 10)), 'Web Mining Lab', '21CYSP2', 'Teacher', 2, 'Active'),
  ('TCHR_21GEN06', crypt('teacher123', gen_salt('bf', 10)), 'Disaster Management', '21GEN06', 'Teacher', 2, 'Active'),
  ('TCHR_21INT01', crypt('teacher123', gen_salt('bf', 10)), 'Info Retrieval', '21INT01', 'Teacher', 2, 'Active'),
  ('TCHR_21AID10', crypt('teacher123', gen_salt('bf', 10)), 'Data Analytics', '21AID10', 'Teacher', 2, 'Active'),
  ('TCHR_21CYS04', crypt('teacher123', gen_salt('bf', 10)), 'Web Mining', '21CYS04', 'Teacher', 2, 'Active'),
  ('TCHR_21OEE13', crypt('teacher123', gen_salt('bf', 10)), 'Sensors', '21OEE13', 'Teacher', 2, 'Active'),
  ('TCHR_21CSE10', crypt('teacher123', gen_salt('bf', 10)), 'Cryptography', '21CSE10', 'Teacher', 2, 'Active'),
  ('TCHR_21CSEMP', crypt('teacher123', gen_salt('bf', 10)), 'Mini Project', '21CSEMP', 'Teacher', 2, 'Active'),
  ('TCHR_21ENGP3', crypt('teacher123', gen_salt('bf', 10)), 'Prof Comm', '21ENGP3', 'Teacher', 2, 'Active')
ON CONFLICT (id) DO NOTHING;

-- Note: Subject tracking for notes and marks will be added when those features are implemented
-- For now, we'll just create the teachers table

-- Comment explaining the access level hierarchy
COMMENT ON COLUMN teachers.access_level IS 'Access level: 0=Admin, 1=Level-1 ClassRep, 2=Teacher/Level-2 ClassRep, 3=Student';

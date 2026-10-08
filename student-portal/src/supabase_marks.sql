-- Create the exam_marks table
CREATE TABLE IF NOT EXISTS exam_marks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL, -- Link to local user ID (e.g. 1152...)
  subject_code TEXT NOT NULL,
  cat1 NUMERIC DEFAULT 0, -- Max 50
  cat2 NUMERIC DEFAULT 0, -- Max 50
  model NUMERIC DEFAULT 0, -- Max 100
  assignment1 NUMERIC DEFAULT 0, -- Max 5
  assignment2 NUMERIC DEFAULT 0, -- Max 5
  seminar NUMERIC DEFAULT 0, -- Max 5
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure one record per student per subject
  UNIQUE(student_id, subject_code)
);

-- Enable RLS
ALTER TABLE exam_marks ENABLE ROW LEVEL SECURITY;

-- Policies (Assuming Anon Key usage for current architecture)
-- Allow read access to everyone (filtered by client logic)
CREATE POLICY "Allow public read access" ON exam_marks FOR SELECT USING (true);

-- Allow insert/update access to everyone (filtered by client admin check)
CREATE POLICY "Allow public update access" ON exam_marks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access" ON exam_marks FOR UPDATE USING (true);

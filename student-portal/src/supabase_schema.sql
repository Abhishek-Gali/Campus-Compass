-- Create the mock_attendance table
CREATE TABLE IF NOT EXISTS mock_attendance (
  date DATE NOT NULL,
  period TEXT NOT NULL, -- Combined Code + Time (e.g. "21CYSP2_08:30")
  student_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'Present', 'Absent', 'On-Duty'
  reason TEXT,
  updated_by_role INTEGER, -- Hierarchy Level: 0=Admin, 1=Level 1, 2=Level 2...
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (date, period, student_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE mock_attendance ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Note: Ideally, you should restrict this to Authenticated users only.
-- Since we are using the Anon key for basic operations in this prototype, we start with permissive policies.
-- The application logic (MockAttendance.jsx) handles role-based permission checks (frontend-side).

-- 1. Allow ALL operations for everyone (Public/Anon)
CREATE POLICY "Enable all access for all users"
ON mock_attendance FOR ALL
USING (true)
WITH CHECK (true);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (same as mock_attendance)
CREATE POLICY "Enable all access for contacts"
ON contacts FOR ALL
USING (true)
WITH CHECK (true);

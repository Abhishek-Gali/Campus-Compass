-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX THE ERROR

-- 1. Create the simplified exam_marks table for Internal Tracking
CREATE TABLE IF NOT EXISTS public.exam_marks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  
  -- The Marks Columns (Matches your formula)
  cat1 NUMERIC DEFAULT 0, -- Max 50
  cat2 NUMERIC DEFAULT 0, -- Max 50
  model NUMERIC DEFAULT 0, -- Max 100
  assignment1 NUMERIC DEFAULT 0, -- Max 5
  assignment2 NUMERIC DEFAULT 0, -- Max 5
  seminar NUMERIC DEFAULT 0, -- Max 5
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: One record per student per subject
  UNIQUE(student_id, subject_code)
);

-- 2. Enable Security (RLS)
ALTER TABLE public.exam_marks ENABLE ROW LEVEL SECURITY;

-- 3. Add Policies relative to your current setup (Allowing public access for now as per your schema style)
-- (We rely on Frontend Logic to filter data as per previous discussion)

-- Allow everyone to READ marks (Frontend filters it)
CREATE POLICY "Public Read Marks" ON public.exam_marks FOR SELECT USING (true);

-- Allow everyone to INSERT/UPDATE marks (Frontend Admin check handles security)
CREATE POLICY "Public Manage Marks" ON public.exam_marks FOR ALL USING (true) WITH CHECK (true);

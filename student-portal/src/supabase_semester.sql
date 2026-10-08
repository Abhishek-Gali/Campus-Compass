-- Semester Performance & Goals Schema

-- Table to store semester summary
CREATE TABLE IF NOT EXISTS public.semester_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Link to user (e.g. 1152...)
    semester_name TEXT NOT NULL, -- e.g. "Semester 4", "Semester 1"
    total_credits FROM NUMERIC DEFAULT 0,
    sgpa NUMERIC DEFAULT 0,
    is_current BOOLEAN DEFAULT false, -- Flag to mark the latest/current semester
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, semester_name)
);

-- Table to store subject-wise results for a semester
CREATE TABLE IF NOT EXISTS public.semester_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    semester_record_id UUID REFERENCES public.semester_records(id) ON DELETE CASCADE,
    subject_code TEXT NOT NULL,
    subject_name TEXT,
    credits NUMERIC NOT NULL,
    grade TEXT NOT NULL, -- O, A+, A, etc.
    grade_point NUMERIC NOT NULL, -- 10, 9, 8...
    result_status TEXT DEFAULT 'Pass', -- Pass/Fail
    user_id TEXT NOT NULL, -- Denormalized for easier RLS
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(semester_record_id, subject_code)
);

-- Table to store user goals
CREATE TABLE IF NOT EXISTS public.student_goals (
    user_id TEXT PRIMARY KEY, -- One record per user
    target_cgpa NUMERIC DEFAULT 0,
    target_sgpa_next NUMERIC DEFAULT 0, -- Target SGPA for the immediate next/current semester
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies

-- Enable RLS
ALTER TABLE public.semester_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

-- semester_records Policies
CREATE POLICY "Anon Select Semesters" ON public.semester_records FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Insert Semesters" ON public.semester_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon Update Semesters" ON public.semester_records FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon Delete Semesters" ON public.semester_records FOR DELETE TO anon USING (true);

-- semester_subjects Policies
CREATE POLICY "Anon Select Subjects" ON public.semester_subjects FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Insert Subjects" ON public.semester_subjects FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon Update Subjects" ON public.semester_subjects FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon Delete Subjects" ON public.semester_subjects FOR DELETE TO anon USING (true);

-- student_goals Policies
CREATE POLICY "Anon Select Goals" ON public.student_goals FOR SELECT TO anon USING (true);
CREATE POLICY "Anon Insert Goals" ON public.student_goals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon Update Goals" ON public.student_goals FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon Delete Goals" ON public.student_goals FOR DELETE TO anon USING (true);

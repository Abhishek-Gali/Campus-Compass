-- Fix RLS Policies for Schedule, Assignments, and Overrides
-- Run this script in your Supabase SQL Editor

-- 1. Academic Schedule
ALTER TABLE public.academic_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Read Schedule" ON public.academic_schedule;
-- Create full access policy
CREATE POLICY "Anon Manage Schedule"
ON public.academic_schedule
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- 2. Assignments
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Read Assignments" ON public.assignments;
-- Create full access policy
CREATE POLICY "Anon Manage Assignments"
ON public.assignments
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- 3. Timetable Overrides
ALTER TABLE public.timetable_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anon Read Overrides" ON public.timetable_overrides;
-- Create full access policy
CREATE POLICY "Anon Manage Overrides"
ON public.timetable_overrides
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

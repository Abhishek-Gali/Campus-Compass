-- Fix RLS Policy for student_attendance
-- The previous policy only allowed SELECT. This one allows ALL operations (SELECT, INSERT, UPDATE, DELETE) for anon users.

-- 1. Drop the existing read-only policy if it exists
DROP POLICY IF EXISTS "Anon Read Student Attendance" ON public.student_attendance;

-- 2. Create a new permissive policy for anon users to manage their own attendance
-- Note: 'anon' is the role used by the client when no user is logged in or when using public client.
-- If you are using authentication, you might want TO authenticated. 
-- But based on your current codebase (attendance.js), you seem to rely on local storage / anon access to start with.
-- If this is a single-user app or local-first, 'anon' with logic checks is fine.

CREATE POLICY "Anon Manage Student Attendance"
ON public.student_attendance
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

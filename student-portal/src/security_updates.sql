-- Based on your schema, enable these commands to add brute-force protection columns
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NULL;

-- Optional: Set default for existing rows if needed
UPDATE public.users SET failed_attempts = 0 WHERE failed_attempts IS NULL;

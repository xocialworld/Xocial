-- Add oauth_state column to profiles for OAuth state management
-- Safe to run multiple times

DO $profiles$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS oauth_state JSONB;

    COMMENT ON COLUMN public.profiles.oauth_state IS 'Temporary OAuth state payload used for CSRF protection and post-auth redirects';
  ELSE
    RAISE NOTICE 'Skipping oauth_state column addition; public.profiles missing.';
  END IF;
END;
$profiles$;

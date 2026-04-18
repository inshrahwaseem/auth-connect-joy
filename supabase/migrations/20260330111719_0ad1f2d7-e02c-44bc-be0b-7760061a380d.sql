
-- Tighten login_audit_log anon INSERT: restrict fields anon can set
DROP POLICY IF EXISTS "Anon can insert failed login audit" ON public.login_audit_log;

CREATE POLICY "Anon can insert failed login audit" ON public.login_audit_log
  FOR INSERT TO anon
  WITH CHECK (
    success = false
    AND user_id IS NULL
    AND event_type = 'login_failed'
  );

-- Prevent anon SELECT on login_audit_log (currently no policy, but be explicit)
-- Already no anon SELECT policy, so this is already secure.

-- Add index on login_audit_log for performance
CREATE INDEX IF NOT EXISTS idx_login_audit_log_user_id ON public.login_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_log_email ON public.login_audit_log(email);
CREATE INDEX IF NOT EXISTS idx_login_audit_log_created_at ON public.login_audit_log(created_at DESC);

-- Add index on profiles for login checks
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Add index on user_roles for role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- Add index on email_otp_codes for OTP lookups
CREATE INDEX IF NOT EXISTS idx_email_otp_codes_user_id ON public.email_otp_codes(user_id);

-- Add index on backup_codes for user lookups
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON public.backup_codes(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: cleanup improvements
-- Adds: expired OTP cleanup function, composite index for lockout checks,
--       email_otp_codes cleanup on expiry, audit log composite index
-- ─────────────────────────────────────────────────────────────────────────────

-- Composite index for the lockout check query pattern:
-- WHERE user_id = ? (on profiles via auth.users email lookup)
-- This avoids seq scans on large profiles tables
CREATE INDEX IF NOT EXISTS idx_profiles_lockout
  ON public.profiles(user_id, locked_until, failed_login_attempts)
  WHERE locked_until IS NOT NULL;

-- Composite index for audit log suspicious-activity query:
-- WHERE success = false AND created_at >= now() - interval '1 hour'
CREATE INDEX IF NOT EXISTS idx_audit_log_failure_time
  ON public.login_audit_log(success, created_at DESC)
  WHERE success = false;

-- Function to clean up expired / used OTP codes
-- Call this on a schedule (e.g. pg_cron or Supabase scheduled function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.email_otp_codes
  WHERE expires_at < now() - interval '1 hour'
     OR used = true;
END;
$$;

-- Function to clean up old audit logs (keep last 90 days by default)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(retain_days int DEFAULT 90)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM public.login_audit_log
  WHERE created_at < now() - (retain_days || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute only to service role (called from Edge Functions)
REVOKE ALL ON FUNCTION public.cleanup_expired_otps() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_old_audit_logs(int) FROM PUBLIC;

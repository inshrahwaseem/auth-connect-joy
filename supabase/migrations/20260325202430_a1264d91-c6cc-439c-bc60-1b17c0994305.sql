
-- Audit log table for login attempts and security events
CREATE TABLE public.login_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  email text,
  ip_address text,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.login_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON public.login_audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert audit logs
CREATE POLICY "Users can insert audit logs"
  ON public.login_audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow anon inserts for failed login attempts (user not authenticated yet)
CREATE POLICY "Anon can insert failed login audit"
  ON public.login_audit_log FOR INSERT TO anon
  WITH CHECK (success = false);

-- Performance indexes
CREATE INDEX idx_audit_log_user_id ON public.login_audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON public.login_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_event_type ON public.login_audit_log(event_type);

-- Indexes on existing tables for scalability
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON public.backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_mfa_settings_user_id ON public.mfa_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_email_otp_codes_user_id ON public.email_otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_email_otp_codes_expires ON public.email_otp_codes(expires_at);

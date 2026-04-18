
-- Email OTP codes table for MFA
CREATE TABLE public.email_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table (via edge function), 
-- but add basic policy for authenticated users to read their own
CREATE POLICY "Users can view their own OTPs"
  ON public.email_otp_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

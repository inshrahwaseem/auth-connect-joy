
-- Server-side rate limiting functions
CREATE OR REPLACE FUNCTION public.check_login_allowed(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile profiles%ROWTYPE;
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', 5);
  END IF;

  SELECT * INTO v_profile FROM profiles WHERE user_id = v_user_id;
  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'remaining', 5);
  END IF;

  IF v_profile.locked_until IS NOT NULL AND v_profile.locked_until > now() THEN
    RETURN jsonb_build_object('allowed', false, 'locked', true, 'locked_until', v_profile.locked_until, 'remaining', 0);
  END IF;

  IF v_profile.locked_until IS NOT NULL AND v_profile.locked_until <= now() THEN
    UPDATE profiles SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = v_user_id;
    RETURN jsonb_build_object('allowed', true, 'remaining', 5);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'remaining', GREATEST(0, 5 - v_profile.failed_login_attempts));
END;
$$;

CREATE OR REPLACE FUNCTION public.record_failed_login(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_attempts int;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('locked', false, 'remaining', 5);
  END IF;

  UPDATE profiles
  SET failed_login_attempts = failed_login_attempts + 1,
      locked_until = CASE WHEN failed_login_attempts + 1 >= 5 THEN now() + interval '15 minutes' ELSE locked_until END
  WHERE user_id = v_user_id
  RETURNING failed_login_attempts INTO v_attempts;

  RETURN jsonb_build_object('locked', v_attempts >= 5, 'attempts', v_attempts, 'remaining', GREATEST(0, 5 - v_attempts));
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_login_attempts(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = p_user_id;
END;
$$;

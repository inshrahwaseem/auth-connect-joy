import { useState, useCallback } from "react";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormField } from "@/components/auth/FormField";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { MFAChallenge } from "@/components/auth/MFAChallenge";
import { Button } from "@/components/ui/button";
import { loginSchema } from "@/lib/validations";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ROUTES } from "@/config/constants";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Redirect back to the page the user tried to access before being sent here
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.DASHBOARD;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [hasTurnstile, setHasTurnstile] = useState(false);

  const [showMFA, setShowMFA] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [hasEmailOtp, setHasEmailOtp] = useState(false);

  const inactivityLogout = searchParams.get("reason") === "inactivity";

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setHasTurnstile(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Only enforce Turnstile if the widget actually rendered (siteKey is configured)
    if (hasTurnstile && !turnstileToken) {
      toast.error("Please complete the CAPTCHA verification.");
      return;
    }

    if (turnstileToken) {
      const turnstileValid = await verifyTurnstileToken(turnstileToken);
      if (!turnstileValid) {
        toast.error("CAPTCHA verification failed. Please try again.");
        setTurnstileToken(null);
        return;
      }
    }

    setLoading(true);

    try {
      // All login goes through the Edge Function — handles rate limiting,
      // account lockout, and server-side audit logging in one place.
      const { data, error: fnError } = await supabase.functions.invoke("secure-login", {
        body: { email, password },
      });

      if (fnError || !data?.session) {
        setLoading(false);

        if (data?.locked) {
          const until = data.locked_until
            ? new Date(data.locked_until).toLocaleTimeString()
            : "15 minutes";
          toast.error(`Account locked. Try again after ${until}.`);
          return;
        }

        const msg = data?.error || fnError?.message || "Invalid email or password.";
        if (msg.includes("Email not confirmed")) {
          toast.error("Please verify your email before signing in.");
          navigate(ROUTES.VERIFY_EMAIL);
          return;
        }
        toast.error(msg);
        return;
      }

      // Hydrate local session from Edge Function response
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      // Check for active MFA factors
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const totpFactor = factorsData?.totp?.[0];

      let emailOtpEnabled = false;
      if (data.user) {
        const { data: mfaSettings } = await supabase
          .from("mfa_settings")
          .select("email_otp_enabled")
          .eq("user_id", data.user.id)
          .single();
        emailOtpEnabled = mfaSettings?.email_otp_enabled ?? false;
      }

      setLoading(false);

      if (totpFactor || emailOtpEnabled) {
        setMfaFactorId(totpFactor?.id ?? null);
        setHasEmailOtp(emailOtpEnabled);
        setShowMFA(true);
        return;
      }

      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      setLoading(false);
      toast.error("Something went wrong. Please try again.");
      console.error("Login error:", err);
    }
  };

  if (showMFA) {
    return (
      <MFAChallenge
        factorId={mfaFactorId ?? ""}
        hasEmailOtp={hasEmailOtp}
        onSuccess={() => {
          toast.success("Welcome back!");
          navigate(from, { replace: true });
        }}
        onCancel={() => {
          setShowMFA(false);
          supabase.auth.signOut();
        }}
      />
    );
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your credentials to access your account"
    >
      {inactivityLogout && (
        <div className="mb-4 rounded-lg border border-border bg-muted/50 p-3 text-center text-sm text-muted-foreground">
          You were signed out due to inactivity.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          id="email"
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={setEmail}
          error={errors.email}
          disabled={loading}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          error={errors.password}
          disabled={loading}
        />
        <div className="flex justify-end">
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <TurnstileWidget
          onVerify={handleTurnstileVerify}
          onExpire={() => setTurnstileToken(null)}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={loading || (hasTurnstile && !turnstileToken)}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to={ROUTES.SIGNUP} className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

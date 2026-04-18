import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormField } from "@/components/auth/FormField";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";
import { resetPasswordSchema } from "@/lib/validations";
import { ROUTES } from "@/config/constants";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event injected from the reset email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // FIX: Use the full resetPasswordSchema which enforces strength rules too
    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate(ROUTES.DASHBOARD), 2000);
  };

  if (checking) {
    return (
      <AuthLayout title="Verifying…" subtitle="Checking your reset link">
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AuthLayout>
    );
  }

  if (!validSession) {
    return (
      <AuthLayout title="Invalid link" subtitle="This password reset link is invalid or expired">
        <div className="flex flex-col items-center gap-4 py-4">
          <p className="text-center text-sm text-muted-foreground">
            Please request a new password reset link.
          </p>
          <Button onClick={() => navigate(ROUTES.FORGOT_PASSWORD)} className="w-full">
            Request new link
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Password updated" subtitle="Your password has been reset successfully">
        <div className="flex flex-col items-center gap-4 py-4">
          <CheckCircle className="h-12 w-12 text-primary" />
          <p className="text-center text-sm text-muted-foreground">
            Redirecting to dashboard…
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set new password" subtitle="Choose a strong password for your account">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          id="password"
          label="New password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={setPassword}
          error={errors.password}
          disabled={loading}
        />
        <FormField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
          disabled={loading}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}

import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormField } from "@/components/auth/FormField";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { signupSchema } from "@/lib/validations";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ROUTES } from "@/config/constants";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [hasTurnstile, setHasTurnstile] = useState(false);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setHasTurnstile(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse({ name, email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // FIX: Strictly require Turnstile if the widget rendered (siteKey is configured)
    // Original code only verified IF a token existed — a user could skip CAPTCHA on signup
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
    const { error } = await signUp(email, password, name);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Account created! Check your email to verify.");
    navigate(ROUTES.VERIFY_EMAIL);
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Enter your details to get started"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          id="name"
          label="Full name"
          placeholder="Jane Doe"
          value={name}
          onChange={setName}
          error={errors.name}
          disabled={loading}
        />
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
          placeholder="Min. 8 characters"
          value={password}
          onChange={setPassword}
          error={errors.password}
          disabled={loading}
        />
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

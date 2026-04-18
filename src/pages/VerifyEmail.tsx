import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { ROUTES } from "@/config/constants";

export default function VerifyEmailPage() {
  return (
    <AuthLayout
      title="Check your email"
      subtitle="We sent a verification link to your inbox"
    >
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Click the link in your email to activate your account. Check your spam
          folder if you don't see it within a few minutes.
        </p>
        <Button variant="outline" asChild className="w-full">
          <Link to={ROUTES.LOGIN}>Back to sign in</Link>
        </Button>
      </div>
    </AuthLayout>
  );
}

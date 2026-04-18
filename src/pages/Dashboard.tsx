import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  LogOut,
  User,
  Shield,
  Lock,
  FileText,
  MonitorSmartphone,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ROUTES } from "@/config/constants";
import type { Profile } from "@/types";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, signOut, session } = useAuth();
  const { isAdmin, error: roleError } = useRole();
  const { logAuditEvent } = useAuditLog();
  const [profile, setProfile] = useState<Profile | null>(null);

  useInactivityTimeout();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data as Profile);
      });
  }, [user]);

  const handleSignOut = async () => {
    if (user) {
      logAuditEvent({
        event_type: "logout",
        email: user.email,
        success: true,
        user_id: user.id,
      });
    }
    await signOut();
    toast.success("Signed out successfully");
    navigate(ROUTES.LOGIN);
  };

  const handleSignOutAll = async () => {
    if (user) {
      logAuditEvent({
        event_type: "logout_all_devices",
        email: user.email,
        success: true,
        user_id: user.id,
      });
    }
    await supabase.auth.signOut({ scope: "global" });
    toast.success("Signed out from all devices");
    navigate(ROUTES.LOGIN);
  };

  const sessionExpiry = session?.expires_at
    ? new Date(session.expires_at * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4 text-primary-foreground"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground">Secure Auth</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.MFA_SETTINGS)}>
              <Lock className="h-4 w-4" />
              Security
            </Button>
            {isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.ADMIN)}>
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.AUDIT_LOG)}>
                  <FileText className="h-4 w-4" />
                  Audit
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        {roleError && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{roleError}</p>
          </div>
        )}

        <div className="rounded-xl bg-card p-8" style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {profile?.name ?? "Welcome"}
              </h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Status", value: "Authenticated" },
              { label: "Session expires", value: sessionExpiry },
              {
                label: "Joined",
                value: user.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-border bg-muted/50 p-4"
              >
                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <div className="flex items-center gap-2 mb-4">
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Session Management</h2>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOutAll}>
              <LogOut className="h-4 w-4" />
              Sign out all devices
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Auto-logout after 30 minutes of inactivity is enabled.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

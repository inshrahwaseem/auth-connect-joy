import { Navigate } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { ROUTES } from "@/config/constants";
import type { AppRole } from "@/types";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole: AppRole;
  /** Route to redirect to if role check fails. Defaults to /dashboard. */
  fallback?: string;
}

/**
 * Restricts a route to users who have the required role.
 * Must be nested inside a <ProtectedRoute> — assumes the user is authenticated.
 */
export function RoleGuard({
  children,
  requiredRole,
  fallback = ROUTES.DASHBOARD,
}: RoleGuardProps) {
  const { roles, loading } = useRole();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!roles.includes(requiredRole)) {
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}

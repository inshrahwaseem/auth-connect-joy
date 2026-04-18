import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/config/constants";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps a route so only authenticated users can access it.
 * Redirects unauthenticated users to /login, preserving the intended destination
 * in `state.from` so they can be sent back after logging in.
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    // Pass current location so Login can redirect back after auth
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

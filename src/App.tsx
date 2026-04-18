import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ROUTES } from "@/config/constants";

// Lazy-load all pages for code splitting — each page becomes its own JS chunk
const Index = lazy(() => import("./pages/Index"));
const LoginPage = lazy(() => import("./pages/Login"));
const SignupPage = lazy(() => import("./pages/Signup"));
const DashboardPage = lazy(() => import("./pages/Dashboard"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPassword"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmail"));
const AdminPanelPage = lazy(() => import("./pages/AdminPanel"));
const MFASettingsPage = lazy(() => import("./pages/MFASettings"));
const AuditLogPage = lazy(() => import("./pages/AuditLog"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevent retrying on 4xx errors — they're not transient
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes("4")) return false;
        return failureCount < 2;
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path={ROUTES.HOME} element={<Index />} />
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path={ROUTES.SIGNUP} element={<SignupPage />} />
            <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
            <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />

            {/* Protected routes — require authentication */}
            <Route
              path={ROUTES.DASHBOARD}
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.MFA_SETTINGS}
              element={
                <ProtectedRoute>
                  <MFASettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Admin-only routes — require authentication + admin role */}
            <Route
              path={ROUTES.ADMIN}
              element={
                <ProtectedRoute>
                  <RoleGuard requiredRole="admin">
                    <AdminPanelPage />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.AUDIT_LOG}
              element={
                <ProtectedRoute>
                  <RoleGuard requiredRole="admin">
                    <AuditLogPage />
                  </RoleGuard>
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

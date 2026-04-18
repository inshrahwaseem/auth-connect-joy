// ─── Auth ────────────────────────────────────────────────────────────────────

/** Minutes of inactivity before auto-logout */
export const INACTIVITY_TIMEOUT_MINUTES = 30;
export const INACTIVITY_TIMEOUT_MS = INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;

/** DOM events that reset the inactivity timer */
export const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "mousemove",
] as const;

// ─── Rate limiting ───────────────────────────────────────────────────────────

/** Max failed login attempts before account lockout */
export const MAX_FAILED_ATTEMPTS = 5;

/** Account lockout duration in minutes */
export const LOCKOUT_DURATION_MINUTES = 15;

// ─── OTP ─────────────────────────────────────────────────────────────────────

/** Email OTP expiry in minutes */
export const EMAIL_OTP_EXPIRY_MINUTES = 5;

/** Number of backup codes to generate per user */
export const BACKUP_CODE_COUNT = 10;

// ─── Audit log ───────────────────────────────────────────────────────────────

/** Default page size for admin audit log */
export const AUDIT_LOG_PAGE_SIZE = 50;

// ─── Routes ──────────────────────────────────────────────────────────────────

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  VERIFY_EMAIL: "/verify-email",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: "/dashboard",
  MFA_SETTINGS: "/mfa-settings",
  ADMIN: "/admin",
  AUDIT_LOG: "/admin/audit-log",
} as const;

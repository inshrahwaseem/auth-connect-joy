// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  event_type: AuditEventType;
  email?: string;
  success: boolean;
  user_id?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export type AuditEventType =
  | "login_success"
  | "login_failed"
  | "logout"
  | "logout_all_devices"
  | "password_reset_requested"
  | "password_reset_completed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "backup_codes_generated";

// ─── RBAC ────────────────────────────────────────────────────────────────────

export type AppRole = "admin" | "user";

export interface UseRoleResult {
  roles: AppRole[];
  isAdmin: boolean;
  isUser: boolean;
  loading: boolean;
  error: string | null;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─── MFA ─────────────────────────────────────────────────────────────────────

export interface MFASettings {
  id: string;
  user_id: string;
  email_otp_enabled: boolean;
  totp_enabled: boolean;
  backup_codes_generated: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Audit log ───────────────────────────────────────────────────────────────

export interface AuditLogRecord {
  id: string;
  event_type: string;
  email: string | null;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface UserWithRole {
  user_id: string;
  role: AppRole;
  profile_name: string | null;
}

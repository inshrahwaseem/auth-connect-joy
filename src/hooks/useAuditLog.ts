import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AuditLogEntry } from "@/types";

/**
 * Returns a stable logAuditEvent function bound to the current browser context.
 * Fires-and-forgets — errors are swallowed so they never break the calling flow.
 *
 * Note: IP address cannot be reliably obtained client-side.
 * All sensitive events (login attempts) are additionally logged server-side
 * in the secure-login Edge Function with the real IP.
 */
export function useAuditLog() {
  const logAuditEvent = useCallback(async (entry: AuditLogEntry): Promise<void> => {
    try {
      await supabase.from("login_audit_log").insert([{
        event_type: entry.event_type,
        email: entry.email ?? null,
        success: entry.success,
        user_id: entry.user_id ?? null,
        user_agent: navigator.userAgent.substring(0, 500),
        ip_address: null,
        metadata: entry.metadata ?? {},
      }]);
    } catch (err) {
      // Never throw — audit log failures must not interrupt user flows
      console.error("Audit log error (non-fatal):", err);
    }
  }, []);

  return { logAuditEvent };
}

/**
 * Standalone function for use outside React components (e.g. inside callbacks
 * that already have the user context available).
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    await supabase.from("login_audit_log").insert([{
      event_type: entry.event_type,
      email: entry.email ?? null,
      success: entry.success,
      user_id: entry.user_id ?? null,
      user_agent: navigator.userAgent.substring(0, 500),
      ip_address: null,
      metadata: entry.metadata ?? {},
    }]);
  } catch (err) {
    console.error("Audit log error (non-fatal):", err);
  }
}

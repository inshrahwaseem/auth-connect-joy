import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { INACTIVITY_TIMEOUT_MS, ACTIVITY_EVENTS, ROUTES } from "@/config/constants";

/**
 * Auto-logs out the current user after a period of inactivity.
 * Resets on any mouse, keyboard, scroll, or touch event.
 * Redirects to login with ?reason=inactivity so the UI can show a notice.
 */
export function useInactivityTimeout() {
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async () => {
    if (!user) return;
    await supabase.auth.signOut();
    window.location.href = `${ROUTES.LOGIN}?reason=inactivity`;
  }, [user]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (user) {
      timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
    }
  }, [user, logout]);

  useEffect(() => {
    if (!user) return;

    resetTimer();
    ACTIVITY_EVENTS.forEach((e) =>
      document.addEventListener(e, resetTimer, { passive: true })
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((e) => document.removeEventListener(e, resetTimer));
    };
  }, [user, resetTimer]);
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { AppRole, UseRoleResult } from "@/types";

export function useRole(): UseRoleResult {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          console.error("Failed to fetch user roles:", fetchError);
          setError("Failed to load permissions. Please refresh.");
          setRoles([]);
        } else if (data) {
          setRoles(data.map((r) => r.role as AppRole));
        }
        setLoading(false);
      });
  }, [user]);

  return {
    roles,
    isAdmin: roles.includes("admin"),
    isUser: roles.includes("user"),
    loading,
    error,
  };
}

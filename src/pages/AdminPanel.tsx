import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Shield, Users } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { truncateId } from "@/lib/utils";
import type { UserWithRole, AppRole } from "@/types";

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // Single join query — avoids N+1 fetches
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, role, profiles(name)");

    if (error) {
      toast.error("Failed to fetch users");
      setLoading(false);
      return;
    }

    const merged: UserWithRole[] = (data ?? []).map((r) => ({
      user_id: r.user_id,
      role: r.role as AppRole,
      profile_name: (r.profiles as { name: string | null } | null)?.name ?? null,
    }));

    setUsers(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleRole = async (userId: string, currentRole: AppRole) => {
    if (userId === user?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    const newRole: AppRole = currentRole === "admin" ? "user" : "admin";

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update role");
      return;
    }

    toast.success(`Role updated to ${newRole}`);
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Admin Panel</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.DASHBOARD)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-xl bg-card p-8" style={{ boxShadow: "var(--card-shadow)" }}>
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">User Management</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="py-3 text-left font-medium text-muted-foreground">User ID</th>
                    <th className="py-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.user_id} className="border-b border-border last:border-0">
                      <td className="py-3 text-foreground">{u.profile_name ?? "—"}</td>
                      <td className="py-3 font-mono text-xs text-muted-foreground">
                        {truncateId(u.user_id)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRole(u.user_id, u.role)}
                          disabled={u.user_id === user?.id}
                        >
                          {u.role === "admin" ? "Demote" : "Promote"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

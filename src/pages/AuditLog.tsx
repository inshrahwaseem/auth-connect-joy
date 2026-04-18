import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { ROUTES, AUDIT_LOG_PAGE_SIZE } from "@/config/constants";
import { relativeTime } from "@/lib/utils";
import type { AuditLogRecord } from "@/types";

type Filter = "all" | "success" | "failure";

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // FIX: useCallback so fetchLogs is stable and safe as a useEffect dependency
  const fetchLogs = useCallback(async (currentFilter: Filter, currentPage: number) => {
    setLoading(true);
    const from = currentPage * AUDIT_LOG_PAGE_SIZE;
    const to = from + AUDIT_LOG_PAGE_SIZE - 1;

    let query = supabase
      .from("login_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (currentFilter === "success") query = query.eq("success", true);
    if (currentFilter === "failure") query = query.eq("success", false);

    const { data, error } = await query;
    if (!error && data) {
      setLogs(data as AuditLogRecord[]);
      setHasMore(data.length === AUDIT_LOG_PAGE_SIZE);

      // Detect suspicious: 5+ failed attempts in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("login_audit_log")
        .select("*", { count: "exact", head: true })
        .eq("success", false)
        .gte("created_at", oneHourAgo);

      setSuspiciousCount(count ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs(filter, page);
  }, [fetchLogs, filter, page]);

  const changeFilter = (f: Filter) => {
    setFilter(f);
    setPage(0);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Audit Log</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.ADMIN)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {suspiciousCount >= 5 && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Suspicious activity detected:</strong>{" "}
              {suspiciousCount} failed login attempts in the last hour.
            </p>
          </div>
        )}

        <div className="rounded-xl bg-card p-6" style={{ boxShadow: "var(--card-shadow)" }}>
          {/* Filter tabs */}
          <div className="flex gap-2 mb-6">
            {(["all", "success", "failure"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => changeFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No log entries found.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Status</th>
                      <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Event</th>
                      <th className="py-3 pr-4 text-left font-medium text-muted-foreground">Email</th>
                      <th className="py-3 pr-4 text-left font-medium text-muted-foreground">IP</th>
                      <th className="py-3 text-left font-medium text-muted-foreground">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4">
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-foreground">
                          {log.event_type}
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.email ?? "—"}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                          {log.ip_address ?? "—"}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">
                          {relativeTime(log.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">Page {page + 1}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

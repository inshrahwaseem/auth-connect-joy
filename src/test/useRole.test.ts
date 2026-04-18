import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRole } from "@/hooks/useRole";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const mockUseAuth = vi.mocked(useAuth);
const mockSupabase = vi.mocked(supabase);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty roles when user is not logged in", async () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useRole());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.roles).toEqual([]);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isUser).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("returns admin=true when user has admin role", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } } as ReturnType<typeof useAuth>);

    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ role: "admin" }],
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => useRole());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.roles).toEqual(["admin"]);
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("sets error state when supabase returns an error", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-2" } } as ReturnType<typeof useAuth>);

    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error" },
        }),
      }),
    });

    const { result } = renderHook(() => useRole());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.roles).toEqual([]);
    expect(result.current.error).toBeTruthy();
  });
});

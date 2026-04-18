import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { INACTIVITY_TIMEOUT_MS } from "@/config/constants";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  },
}));

import { useAuth } from "@/hooks/useAuth";
const mockUseAuth = vi.mocked(useAuth);

describe("useInactivityTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not set a timer when user is null", () => {
    mockUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    const spy = vi.spyOn(global, "setTimeout");
    renderHook(() => useInactivityTimeout());
    expect(spy).not.toHaveBeenCalled();
  });

  it("sets a timer when user is logged in", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" } } as ReturnType<typeof useAuth>);
    const spy = vi.spyOn(global, "setTimeout");
    renderHook(() => useInactivityTimeout());
    expect(spy).toHaveBeenCalledWith(expect.any(Function), INACTIVITY_TIMEOUT_MS);
  });

  it("clears the timer on unmount", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" } } as ReturnType<typeof useAuth>);
    const clearSpy = vi.spyOn(global, "clearTimeout");
    const { unmount } = renderHook(() => useInactivityTimeout());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it("resets the timer on user activity", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" } } as ReturnType<typeof useAuth>);
    const spy = vi.spyOn(global, "setTimeout");
    renderHook(() => useInactivityTimeout());
    const initialCallCount = spy.mock.calls.length;
    act(() => {
      document.dispatchEvent(new Event("mousedown"));
    });
    expect(spy.mock.calls.length).toBeGreaterThan(initialCallCount);
  });
});

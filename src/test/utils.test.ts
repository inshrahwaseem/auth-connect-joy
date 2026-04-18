import { describe, it, expect } from "vitest";
import { relativeTime, truncateId, safeJsonParse, sha256 } from "@/lib/utils";

describe("relativeTime", () => {
  it("returns 'just now' for timestamps within 60 seconds", () => {
    const ts = new Date(Date.now() - 30 * 1000).toISOString();
    expect(relativeTime(ts)).toBe("just now");
  });
  it("returns minutes ago", () => {
    const ts = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(relativeTime(ts)).toBe("5m ago");
  });
  it("returns hours ago", () => {
    const ts = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(relativeTime(ts)).toBe("3h ago");
  });
  it("returns a date string for old timestamps", () => {
    const ts = new Date("2024-01-01T00:00:00Z").toISOString();
    const result = relativeTime(ts);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("truncateId", () => {
  it("returns first 8 chars followed by ellipsis", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(truncateId(id)).toBe("a1b2c3d4…");
  });
});

describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    expect(safeJsonParse<{ x: number }>('{"x":1}')).toEqual({ x: 1 });
  });
  it("returns null for invalid JSON", () => {
    expect(safeJsonParse("not json")).toBeNull();
  });
  it("returns null for non-string input", () => {
    expect(safeJsonParse(null)).toBeNull();
    expect(safeJsonParse(123)).toBeNull();
  });
});

describe("sha256", () => {
  it("returns a 64-character hex string", async () => {
    const hash = await sha256("hello");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });
  it("is deterministic", async () => {
    expect(await sha256("test")).toBe(await sha256("test"));
  });
  it("different inputs produce different hashes", async () => {
    expect(await sha256("a")).not.toBe(await sha256("b"));
  });
});

import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  resetSchema,
  resetPasswordSchema,
  otpSchema,
  profileSchema,
} from "@/lib/validations";

// ─── loginSchema ─────────────────────────────────────────────────────────────

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.safeParse({ email: "user@example.com", password: "secret" }).success).toBe(true);
  });
  it("rejects invalid email", () => {
    expect(loginSchema.safeParse({ email: "notanemail", password: "pw" }).success).toBe(false);
  });
  it("rejects empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
  it("trims email whitespace", () => {
    const result = loginSchema.safeParse({ email: "  a@b.com  ", password: "pw" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("a@b.com");
  });
});

// ─── signupSchema ─────────────────────────────────────────────────────────────

describe("signupSchema", () => {
  const validData = {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "Str0ng!Pass",
  };

  it("accepts valid signup data", () => {
    expect(signupSchema.safeParse(validData).success).toBe(true);
  });
  it("rejects name shorter than 2 chars", () => {
    expect(signupSchema.safeParse({ ...validData, name: "J" }).success).toBe(false);
  });
  it("rejects password without uppercase", () => {
    expect(signupSchema.safeParse({ ...validData, password: "str0ng!pass" }).success).toBe(false);
  });
  it("rejects password without lowercase", () => {
    expect(signupSchema.safeParse({ ...validData, password: "STR0NG!PASS" }).success).toBe(false);
  });
  it("rejects password without number", () => {
    expect(signupSchema.safeParse({ ...validData, password: "Strong!Pass" }).success).toBe(false);
  });
  it("rejects password without special char", () => {
    expect(signupSchema.safeParse({ ...validData, password: "Str0ngPass" }).success).toBe(false);
  });
  it("rejects password shorter than 8 chars", () => {
    expect(signupSchema.safeParse({ ...validData, password: "S0!a" }).success).toBe(false);
  });
  it("rejects password longer than 72 chars", () => {
    expect(signupSchema.safeParse({ ...validData, password: "Aa1!" + "x".repeat(70) }).success).toBe(false);
  });
});

// ─── resetSchema ─────────────────────────────────────────────────────────────

describe("resetSchema", () => {
  it("accepts valid email", () => {
    expect(resetSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });
  it("rejects invalid email", () => {
    expect(resetSchema.safeParse({ email: "notvalid" }).success).toBe(false);
  });
});

// ─── resetPasswordSchema ─────────────────────────────────────────────────────

describe("resetPasswordSchema", () => {
  const strong = "ValidP@ss1";
  it("accepts matching strong passwords", () => {
    expect(resetPasswordSchema.safeParse({ password: strong, confirmPassword: strong }).success).toBe(true);
  });
  it("rejects mismatched passwords", () => {
    expect(resetPasswordSchema.safeParse({ password: strong, confirmPassword: "Different1!" }).success).toBe(false);
  });
  it("rejects weak password (no special char)", () => {
    expect(resetPasswordSchema.safeParse({ password: "ValidPass1", confirmPassword: "ValidPass1" }).success).toBe(false);
  });
  it("error is on confirmPassword path when passwords don't match", () => {
    const result = resetPasswordSchema.safeParse({ password: strong, confirmPassword: "Wrong1!" });
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("confirmPassword");
    }
  });
});

// ─── otpSchema ───────────────────────────────────────────────────────────────

describe("otpSchema", () => {
  it("accepts a 6-digit code", () => {
    expect(otpSchema.safeParse({ code: "123456" }).success).toBe(true);
  });
  it("rejects codes that are not 6 digits", () => {
    expect(otpSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(otpSchema.safeParse({ code: "1234567" }).success).toBe(false);
  });
  it("rejects codes with non-digit characters", () => {
    expect(otpSchema.safeParse({ code: "12345a" }).success).toBe(false);
    expect(otpSchema.safeParse({ code: "123 56" }).success).toBe(false);
  });
});

// ─── profileSchema ───────────────────────────────────────────────────────────

describe("profileSchema", () => {
  it("accepts a valid name", () => {
    expect(profileSchema.safeParse({ name: "Alice" }).success).toBe(true);
  });
  it("rejects a name shorter than 2 chars", () => {
    expect(profileSchema.safeParse({ name: "A" }).success).toBe(false);
  });
  it("rejects a name longer than 100 chars", () => {
    expect(profileSchema.safeParse({ name: "A".repeat(101) }).success).toBe(false);
  });
  it("trims whitespace", () => {
    const result = profileSchema.safeParse({ name: "  Alice  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Alice");
  });
});

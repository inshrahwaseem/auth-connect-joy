import { z } from "zod";

// ─── Reusable password schema ─────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be less than 72 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  // Login only checks presence — actual validation is server-side
  password: z.string().min(1, "Password is required"),
});

// ─── Signup ──────────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: passwordSchema,
});

// ─── Password reset ──────────────────────────────────────────────────────────

export const resetSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

// FIX: Password confirmation must also enforce strength rules — previously only checked match
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ─── MFA ─────────────────────────────────────────────────────────────────────

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Code must contain only digits"),
});

// ─── Profile update ──────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
});

// ─── Inferred types ──────────────────────────────────────────────────────────

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;

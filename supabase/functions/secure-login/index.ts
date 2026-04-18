import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

const loginBodySchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

// In-memory IP-level rate limiter (resets on cold start — acceptable for DDoS
// bursting; persistent lockout is handled by DB-backed check_login_allowed RPC)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";

  if (isRateLimited(clientIp)) {
    return json(
      { error: "Too many requests. Please try again later." },
      429
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const parsed = loginBodySchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: "Invalid input" }, 400);
    }

    const { email, password } = parsed.data;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // DB-backed account lockout check (persists across cold starts)
    const { data: checkResult } = await supabaseAdmin.rpc("check_login_allowed", {
      p_email: email,
    });

    if (checkResult && !checkResult.allowed) {
      return json(
        {
          error: "Account temporarily locked due to too many failed attempts",
          locked: true,
          locked_until: checkResult.locked_until,
        },
        429
      );
    }

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: signInData, error: signInError } =
      await supabaseAnon.auth.signInWithPassword({ email, password });

    if (signInError) {
      const { data: failResult } = await supabaseAdmin.rpc("record_failed_login", {
        p_email: email,
      });

      await supabaseAdmin.from("login_audit_log").insert({
        event_type: "login_failed",
        email,
        success: false,
        user_agent: req.headers.get("user-agent")?.substring(0, 500),
        ip_address: clientIp.substring(0, 45),
        metadata: {
          reason: "invalid_credentials",
          attempt: failResult?.attempts ?? 0,
        },
      });

      const remaining = failResult?.remaining ?? 0;
      const locked = failResult?.locked ?? false;

      return json(
        {
          error: remaining > 0
            ? `Invalid email or password. ${remaining} attempt(s) remaining.`
            : "Account locked due to too many failed attempts.",
          locked,
          remaining,
        },
        401
      );
    }

    // Success — reset lockout counter and write audit log
    if (signInData.user) {
      await supabaseAdmin.rpc("reset_login_attempts", {
        p_user_id: signInData.user.id,
      });

      await supabaseAdmin.from("login_audit_log").insert({
        event_type: "login_success",
        email,
        success: true,
        user_id: signInData.user.id,
        user_agent: req.headers.get("user-agent")?.substring(0, 500),
        ip_address: clientIp.substring(0, 45),
      });
    }

    return json({ session: signInData.session, user: signInData.user });
  } catch (err) {
    console.error("Login error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

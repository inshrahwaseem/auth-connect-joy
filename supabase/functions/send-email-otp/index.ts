import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

const sendSchema = z.object({ action: z.literal("send") });
const verifySchema = z.object({
  action: z.literal("verify"),
  code: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
});
const bodySchema = z.discriminatedUnion("action", [sendSchema, verifySchema]);

function generateOTP(): string {
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b % 10).join("");
}

// FIX: Hash OTP before storing — same pattern as backup codes
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isRateLimited(`otp:${user.id}`, 5)) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please wait." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (parsed.data.action === "send") {
      const otp = generateOTP();
      const otpHash = await hashCode(otp);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Delete existing unused OTPs for this user
      await supabaseAdmin
        .from("email_otp_codes")
        .delete()
        .eq("user_id", user.id)
        .eq("used", false);

      // FIX: Store the HASH not the plaintext OTP
      const { error: insertError } = await supabaseAdmin
        .from("email_otp_codes")
        .insert({
          user_id: user.id,
          code: otpHash,      // hashed
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error("Failed to store OTP:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // TODO: Integrate a real email provider (Resend, SendGrid, Postmark)
      // For now, logging to console for development. Remove before production.
      console.log(`[DEV ONLY] Email OTP for ${user.email}: ${otp}`);

      return new Response(
        JSON.stringify({ success: true, message: "OTP sent to your email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (parsed.data.action === "verify") {
      const { code } = parsed.data;

      // FIX: Hash the incoming code and compare against stored hash
      const incomingHash = await hashCode(code);

      const { data: otpRecord, error: fetchError } = await supabaseAdmin
        .from("email_otp_codes")
        .select("*")
        .eq("user_id", user.id)
        .eq("code", incomingHash)   // compare hashes
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (fetchError || !otpRecord) {
        return new Response(
          JSON.stringify({ verified: false, error: "Invalid or expired OTP" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin
        .from("email_otp_codes")
        .update({ used: true })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email OTP error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

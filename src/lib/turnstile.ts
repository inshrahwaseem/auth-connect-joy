import { supabase } from "@/integrations/supabase/client";

/**
 * Verify a Cloudflare Turnstile token via the server-side edge function.
 * Never verify Turnstile client-side — the secret key must stay on the server.
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("verify-turnstile", {
      body: { token },
    });

    if (error) {
      console.error("Turnstile verification error:", error);
      return false;
    }

    return data?.success === true;
  } catch {
    console.error("Turnstile verification failed");
    return false;
  }
}

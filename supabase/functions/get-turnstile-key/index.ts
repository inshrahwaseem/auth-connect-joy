const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "public, max-age=300",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const siteKey = Deno.env.get("TURNSTILE_SITE_KEY") || "";

  // Only return if it looks like a valid Turnstile key
  const safeSiteKey = siteKey.startsWith("0x") ? siteKey : "";

  return new Response(
    JSON.stringify({ siteKey: safeSiteKey }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

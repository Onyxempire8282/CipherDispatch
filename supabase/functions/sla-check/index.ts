import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const authHeader = req.headers.get("x-api-key");
  const API_KEY = Deno.env.get("CLAIMS_API_KEY");
  if (API_KEY && authHeader !== API_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = new Date();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  // Unscheduled claims older than 5 days
  const { data: unscheduled } = await supabase
    .from("claims_v")
    .select("id, claim_number, customer_name, firm, created_at")
    .is("appointment_start", null)
    .is("archived_at", null)
    .not("status", "eq", "CANCELED")
    .not("status", "eq", "COMPLETED")
    .lt("created_at", fiveDaysAgo);

  // Supplements open longer than 48hrs with no activity
  const { data: staleSupplements } = await supabase
    .from("claims_v")
    .select("id, claim_number, customer_name, firm, created_at")
    .eq("is_supplement", true)
    .not("status", "eq", "COMPLETED")
    .not("status", "eq", "CANCELED")
    .is("archived_at", null)
    .lt("created_at", fortyEightHoursAgo);

  // Claims in WRITING status longer than 24hrs (stale in writer queue)
  const { data: staleWriting } = await supabase
    .from("claims_v")
    .select("id, claim_number, customer_name, firm, writing_started_at")
    .eq("status", "WRITING")
    .is("archived_at", null)
    .lt("writing_started_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

  return new Response(JSON.stringify({
    timestamp: now.toISOString(),
    alerts: {
      unscheduled_over_5_days: unscheduled || [],
      supplements_open_over_48hrs: staleSupplements || [],
      writing_stale_over_24hrs: staleWriting || [],
    },
    counts: {
      unscheduled: unscheduled?.length || 0,
      stale_supplements: staleSupplements?.length || 0,
      stale_writing: staleWriting?.length || 0,
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});

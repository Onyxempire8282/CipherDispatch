import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const payload = await req.json();
  const { new_status, claim_id } = payload;

  const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL");
  const N8N_API_KEY = Deno.env.get("N8N_API_KEY");

  // Pre-wired — no-op until N8N_WEBHOOK_URL is configured
  if (!N8N_WEBHOOK_URL) {
    return new Response(
      JSON.stringify({ ok: true, skipped: "no webhook configured" }),
      { status: 200 }
    );
  }

  // Route to the correct n8n workflow based on status
  // n8n uses the event_type field to branch into the right workflow
  const eventMap: Record<string, string> = {
    "SCHEDULED": "appointment_confirmed",    // → Workflow 2
    "WRITING":   "inspection_complete",      // → Workflow 3
    "COMPLETED": "estimate_complete",        // → Workflow 4
  };

  const event_type = eventMap[new_status];
  if (!event_type) {
    return new Response(
      JSON.stringify({ ok: true, skipped: "no handler for status" }),
      { status: 200 }
    );
  }

  // Fetch firm_id from claim record if not already in payload
  let firmId = payload.firm_id ?? null;
  if (!firmId && claim_id) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: claim } = await supabase
      .from("claims")
      .select("firm_id")
      .eq("id", claim_id)
      .single();
    firmId = claim?.firm_id ?? null;
  }

  await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": N8N_API_KEY || "",
    },
    body: JSON.stringify({
      event_type,
      timestamp: new Date().toISOString(),
      ...payload,
      firm_id: firmId,
    }),
  });

  return new Response(JSON.stringify({ ok: true, event_type }), { status: 200 });
});

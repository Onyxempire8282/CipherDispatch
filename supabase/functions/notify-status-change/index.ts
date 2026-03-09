import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const payload = await req.json();
  const { new_status } = payload;

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
    }),
  });

  return new Response(JSON.stringify({ ok: true, event_type }), { status: 200 });
});

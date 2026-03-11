import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { claim_id, cancelled_by_name } = await req.json();

    if (!claim_id) {
      return new Response(
        JSON.stringify({ error: "claim_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("HQ_SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("HQ_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get claim details including assigned appraiser
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select("claim_number, customer_name, address_line1, city, state, zip, vehicle_year, vehicle_make, vehicle_model, assigned_to")
      .eq("id", claim_id)
      .single();

    if (claimError || !claim) {
      return new Response(
        JSON.stringify({ error: "Claim not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!claim.assigned_to) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "no appraiser assigned" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get appraiser profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", claim.assigned_to)
      .single();

    // Get appraiser email
    const { data: authUser } = await supabase.auth.admin.getUserById(claim.assigned_to);
    const appraiserEmail = authUser?.user?.email;

    if (!appraiserEmail) {
      return new Response(
        JSON.stringify({ error: "Appraiser email not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appraiserName = profile?.full_name || "Appraiser";
    const fullAddress = [claim.address_line1, claim.city, claim.state, claim.zip]
      .filter(Boolean)
      .join(", ");
    const vehicle = [claim.vehicle_year, claim.vehicle_make, claim.vehicle_model]
      .filter(Boolean)
      .join(" ");

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0e0f11;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="border-top:3px solid #e8952a;background:#161a1d;padding:32px 28px;">
      <div style="font-family:monospace;font-size:11px;letter-spacing:0.2em;color:#e8952a;text-transform:uppercase;margin-bottom:4px;">
        CIPHER DISPATCH
      </div>
      <div style="font-size:24px;font-weight:700;color:#edeae4;letter-spacing:0.04em;margin-bottom:24px;">
        CLAIM CANCELLED
      </div>
      <div style="font-size:15px;color:#b8bdc2;margin-bottom:24px;font-weight:300;">
        The following claim has been cancelled and removed from your queue.
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2e353d;font-family:monospace;font-size:11px;letter-spacing:0.1em;color:#4a5058;text-transform:uppercase;width:120px;">Claim #</td>
          <td style="padding:10px 0;border-bottom:1px solid #2e353d;color:#edeae4;font-size:15px;">${claim.claim_number}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2e353d;font-family:monospace;font-size:11px;letter-spacing:0.1em;color:#4a5058;text-transform:uppercase;width:120px;">Customer</td>
          <td style="padding:10px 0;border-bottom:1px solid #2e353d;color:#edeae4;font-size:15px;">${claim.customer_name}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2e353d;font-family:monospace;font-size:11px;letter-spacing:0.1em;color:#4a5058;text-transform:uppercase;width:120px;">Address</td>
          <td style="padding:10px 0;border-bottom:1px solid #2e353d;color:#edeae4;font-size:15px;">${fullAddress || "---"}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #2e353d;font-family:monospace;font-size:11px;letter-spacing:0.1em;color:#4a5058;text-transform:uppercase;width:120px;">Vehicle</td>
          <td style="padding:10px 0;border-bottom:1px solid #2e353d;color:#edeae4;font-size:15px;">${vehicle || "---"}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-family:monospace;font-size:11px;letter-spacing:0.1em;color:#4a5058;text-transform:uppercase;width:120px;">Cancelled by</td>
          <td style="padding:10px 0;color:#edeae4;font-size:15px;">${cancelled_by_name || "Dispatch"}</td>
        </tr>
      </table>
      <div style="font-family:monospace;font-size:11px;letter-spacing:0.1em;color:#4a5058;text-transform:uppercase;padding:16px;border:1px solid #2e353d;">
        No further action required. Contact dispatch if you have questions.
      </div>
    </div>
    <div style="padding:20px 28px;text-align:center;">
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.14em;color:#4a5058;text-transform:uppercase;">
        Cipher Dispatch — Claims Operations
      </div>
      <div style="font-size:11px;color:#4a5058;margin-top:6px;">
        Do not reply to this email.
      </div>
    </div>
  </div>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "dispatch@claimcipherhq.com",
        to: [appraiserEmail],
        subject: `Claim Cancelled — #${claim.claim_number}`,
        html: htmlBody,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error("Resend API error:", resendError);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ sent: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

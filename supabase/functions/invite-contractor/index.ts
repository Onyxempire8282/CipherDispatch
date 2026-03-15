import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the calling user is admin/dispatch
    const userClient = createClient(
      Deno.env.get("HQ_SUPABASE_URL")!,
      Deno.env.get("HQ_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, firm_id")
      .eq("user_id", user.id)
      .single();
    if (callerProfile?.role !== "admin" && callerProfile?.role !== "dispatch") {
      return new Response(
        JSON.stringify({ error: `Forbidden: role '${callerProfile?.role}' is not authorized` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get firm name for email branding
    let firmName = "Cipher Dispatch";
    if (callerProfile?.firm_id) {
      const { data: vendor } = await supabaseAdmin
        .from("vendors")
        .select("name")
        .eq("id", callerProfile.firm_id)
        .single();
      if (vendor?.name) firmName = vendor.name;
    }

    // Read contractor details from request
    const body = await req.json();
    const {
      email, full_name, first_name, last_name,
      phone, role, pay_rate, coverage_states,
      coverage_cities, license_number, notes
    } = body;

    // Create user via Supabase Auth invite (generates confirmation token + link)
    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role },
      redirectTo: "https://onyxempire8282.github.io/CipherDispatch/",
    });
    if (inviteErr) {
      return new Response(
        JSON.stringify({ error: inviteErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pre-populate their profile
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: invited.user.id,
        full_name, first_name, last_name, phone, role,
        pay_rate, coverage_states, coverage_cities,
        license_number, notes,
        dispatch_enabled: true,
        onboard_status: "pending",
        firm_id: callerProfile?.firm_id || null,
      }, { onConflict: "user_id" });

    if (profileErr) {
      console.error("Profile upsert error:", profileErr);
    }

    // Send branded invite email via Resend
    if (resendApiKey) {
      const appUrl = "https://onyxempire8282.github.io/CipherDispatch/";

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
        YOU'VE BEEN INVITED
      </div>
      <div style="font-size:15px;color:#b8bdc2;margin-bottom:24px;font-weight:300;">
        You've been invited to join <strong style="color:#edeae4;">${firmName}</strong> on Cipher Dispatch.
      </div>
      <div style="font-size:15px;color:#b8bdc2;margin-bottom:8px;font-weight:300;">
        Check your inbox for a separate confirmation email from Supabase to set your password, then sign in below.
      </div>
      <div style="margin:28px 0;">
        <a href="${appUrl}" style="display:inline-block;background:#e8952a;color:#0e0f11;font-family:monospace;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;padding:14px 32px;font-weight:700;">
          OPEN CIPHER DISPATCH &rarr;
        </a>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #2e353d;font-family:monospace;font-size:11px;letter-spacing:0.1em;color:#4a5058;text-transform:uppercase;width:100px;">Name</td>
          <td style="padding:8px 0;border-bottom:1px solid #2e353d;color:#edeae4;font-size:14px;">${full_name || '—'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #2e353d;font-family:monospace;font-size:11px;letter-spacing:0.1em;color:#4a5058;text-transform:uppercase;width:100px;">Role</td>
          <td style="padding:8px 0;border-bottom:1px solid #2e353d;color:#edeae4;font-size:14px;">${role || 'appraiser'}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-family:monospace;font-size:11px;letter-spacing:0.1em;color:#4a5058;text-transform:uppercase;width:100px;">Firm</td>
          <td style="padding:8px 0;color:#edeae4;font-size:14px;">${firmName}</td>
        </tr>
      </table>
    </div>
    <div style="padding:20px 28px;text-align:center;">
      <div style="font-family:monospace;font-size:10px;letter-spacing:0.14em;color:#4a5058;text-transform:uppercase;">
        ${firmName}
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
          from: "Cipher Dispatch <support@claimcipherhq.com>",
          to: [email],
          subject: `You've been invited to ${firmName} on Cipher Dispatch`,
          html: htmlBody,
        }),
      });

      if (!resendResponse.ok) {
        const resendError = await resendResponse.text();
        console.error("Resend invite email error:", resendError);
      } else {
        console.log(`Invite email sent to ${email} via Resend`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: invited.user.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("invite-contractor error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

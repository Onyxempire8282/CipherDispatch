import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Verify caller is admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Verify the calling user is an admin
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "admin") return new Response("Forbidden", { status: 403 });

  // Read contractor details from request
  const body = await req.json();
  const {
    email, full_name, first_name, last_name,
    phone, role, pay_rate, coverage_states,
    coverage_cities, license_number, notes
  } = body;

  // Invite user via Supabase Auth — they get an email to set their password
  const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role }
  });
  if (inviteErr) {
    return new Response(JSON.stringify({ error: inviteErr.message }), { status: 400 });
  }

  // Pre-populate their profile
  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name, first_name, last_name, phone, role,
      pay_rate, coverage_states, coverage_cities,
      license_number, notes,
      dispatch_enabled: true,
      onboard_status: "pending",
    })
    .eq("user_id", invited.user.id);

  if (profileErr) {
    return new Response(JSON.stringify({ error: profileErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, user_id: invited.user.id }), { status: 200 });
});

// Supabase Edge Function: create-claim
// Receives parsed insurance claim data from Make.com automation
// Validates required fields, inserts claim, returns claim_id
// NO side effects (emails, assignment, routing, notifications)
// Idempotency: lookup-before-insert on (firm, claim_number)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// CORS headers for Make.com webhooks
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// All fields that can be received from Make.com
interface CreateClaimRequest {
  // Hard-required (blocking)
  firm: string;
  claim_number: string;
  customer_name: string;
  address_line1: string;
  city: string;
  state: string;
  zip: string;
  // Soft-required (non-blocking, allowed as null)
  file_number?: string;
  insurance_company?: string;
  customer_phone?: string;
  location_name?: string;
  location_phone?: string;
}

interface CreateClaimResponse {
  success: boolean;
  claim_id?: string;
  message: string;
  action?: "created" | "existing";
}

// Hard-required fields - automation fails if missing
const HARD_REQUIRED: (keyof CreateClaimRequest)[] = [
  "firm",
  "claim_number",
  "customer_name",
  "address_line1",
  "city",
  "state",
  "zip",
];

function validateHardRequired(body: Partial<CreateClaimRequest>): string[] {
  return HARD_REQUIRED.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || String(value).trim() === "";
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Method not allowed",
      } as CreateClaimResponse),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Verify API key authentication
    const apiKey = req.headers.get("x-api-key");
    const expectedApiKey = Deno.env.get("CLAIMS_API_KEY");

    if (!expectedApiKey) {
      console.error("CLAIMS_API_KEY environment variable not set");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Server configuration error",
        } as CreateClaimResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!apiKey || apiKey !== expectedApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized: Invalid or missing API key",
        } as CreateClaimResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    let body: Partial<CreateClaimRequest>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid JSON body",
        } as CreateClaimResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate hard-required fields (blocking)
    const missingFields = validateHardRequired(body);
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        } as CreateClaimResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Unique key components
    const firm = body.firm!.trim();
    const claimNumber = body.claim_number!.trim();

    console.log(`Processing claim: firm=${firm}, claim_number=${claimNumber}`);

    // Lookup-before-insert: check if claim already exists
    const { data: existing, error: checkError } = await supabase
      .from("claims")
      .select("id")
      .eq("firm", firm)
      .eq("claim_number", claimNumber)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing claim:", checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    // Idempotent: return existing claim_id without modification
    if (existing) {
      console.log(`Claim already exists: ${existing.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          claim_id: existing.id,
          message: "Claim already exists",
          action: "existing",
        } as CreateClaimResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build claim data - soft-required fields allowed as null
    const claimData = {
      // Hard-required fields (validated above)
      firm: firm,
      claim_number: claimNumber,
      customer_name: body.customer_name!.trim(),
      address_line1: body.address_line1!.trim(),
      city: body.city!.trim(),
      state: body.state!.trim(),
      zip: body.zip!.trim(),
      // Soft-required fields (null if missing)
      file_number: body.file_number?.trim() || null,
      insurance_company: body.insurance_company?.trim() || null,
      customer_phone: body.customer_phone?.trim() || null,
      location_name: body.location_name?.trim() || null,
      location_phone: body.location_phone?.trim() || null,
      // Auto-set fields
      claim_status: "created",
      status: "IN_PROGRESS",
    };

    // Insert new claim
    const { data: inserted, error: insertError } = await supabase
      .from("claims")
      .insert(claimData)
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting claim:", insertError);
      throw new Error(`Failed to create claim: ${insertError.message}`);
    }

    console.log(`Created new claim: ${inserted.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        claim_id: inserted.id,
        message: "Claim created successfully",
        action: "created",
      } as CreateClaimResponse),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Fatal error in create-claim function:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Internal server error: ${errorMessage}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

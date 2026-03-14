// Supabase Edge Function: cleanup-old-photos
// Deletes photos per-firm retention policy from storage and database
// Designed to run daily via cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const DEFAULT_RETENTION_DAYS = 14;
const BUCKET_NAME = "claim-photos";

interface PhotoRecord {
  id: number;
  claim_id: string;
  storage_path: string;
  created_at: string;
  firm_id: string | null;
}

interface CleanupResult {
  totalProcessed: number;
  successfullyDeleted: number;
  failedDeletions: number;
  errors: Array<{ photo_id: number; error: string }>;
}

serve(async (req) => {
  try {
    // Verify this is a POST request (security best practice)
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify cron secret to prevent unauthorized access
    const cronHeader = req.headers.get("x-cron-secret");
    const cronSecret = Deno.env.get("CRON_SECRET");

    if (cronSecret && cronHeader?.trim() !== cronSecret.trim()) {
      console.error("Unauthorized cleanup attempt");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Initialize CD Supabase client (claim_photos + storage)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Initialize HQ Supabase client (firms table)
    const hqUrl = Deno.env.get("HQ_SUPABASE_URL")!;
    const hqKey = Deno.env.get("HQ_SERVICE_ROLE_KEY")!;
    const hqSupabase = createClient(hqUrl, hqKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`Starting photo cleanup job at ${new Date().toISOString()}`);

    // Get all distinct firm_ids from claim_photos
    const { data: firmRows } = await supabase
      .from("claim_photos")
      .select("firm_id");

    const firmIds = [...new Set((firmRows || []).map((r: any) => r.firm_id))];
    console.log(`Found ${firmIds.length} distinct firm_ids (including null)`);

    // Build retention map: firm_id -> days
    const retentionMap = new Map<string | null, number>();
    retentionMap.set(null, DEFAULT_RETENTION_DAYS);

    for (const fid of firmIds) {
      if (!fid) continue;
      const { data: firm } = await hqSupabase
        .from("firms")
        .select("photo_retention_days")
        .eq("id", fid)
        .single();
      retentionMap.set(fid, firm?.photo_retention_days ?? DEFAULT_RETENTION_DAYS);
    }

    const result: CleanupResult = {
      totalProcessed: 0,
      successfullyDeleted: 0,
      failedDeletions: 0,
      errors: [],
    };

    // Process each firm (including null)
    for (const [fid, retentionDays] of retentionMap) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffISO = cutoffDate.toISOString();

      console.log(`Processing firm_id=${fid}, retention=${retentionDays}d, cutoff=${cutoffISO}`);

      let query = supabase
        .from("claim_photos")
        .select("id, claim_id, storage_path, created_at, firm_id")
        .lt("created_at", cutoffISO)
        .order("created_at", { ascending: true });

      if (fid === null) {
        query = query.is("firm_id", null);
      } else {
        query = query.eq("firm_id", fid);
      }

      const { data: oldPhotos, error: queryError } = await query;

      if (queryError) {
        console.error(`Query error for firm ${fid}:`, queryError);
        continue;
      }

      if (!oldPhotos || oldPhotos.length === 0) continue;

      console.log(`Found ${oldPhotos.length} photos to delete for firm ${fid}`);
      result.totalProcessed += oldPhotos.length;

      for (const photo of oldPhotos as PhotoRecord[]) {
        try {
          // Delete from storage using storage_path directly
          const { error: storageError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([photo.storage_path]);

          if (storageError) {
            const isNotFoundError =
              storageError.message?.includes("not found") ||
              storageError.message?.includes("does not exist");

            if (isNotFoundError) {
              console.log(`Photo ${photo.id} not found in storage, removing DB record`);
            } else {
              console.error(`Storage deletion failed for photo ${photo.id}:`, storageError);
              result.errors.push({ photo_id: photo.id, error: `Storage error: ${storageError.message}` });
              result.failedDeletions++;
              continue;
            }
          }

          // Delete from database
          const { error: dbError } = await supabase
            .from("claim_photos")
            .delete()
            .eq("id", photo.id);

          if (dbError) {
            console.error(`Database deletion failed for photo ${photo.id}:`, dbError);
            result.errors.push({ photo_id: photo.id, error: `Database error: ${dbError.message}` });
            result.failedDeletions++;
            continue;
          }

          result.successfullyDeleted++;
        } catch (error) {
          console.error(`Unexpected error processing photo ${photo.id}:`, error);
          result.errors.push({
            photo_id: photo.id,
            error: error instanceof Error ? error.message : String(error),
          });
          result.failedDeletions++;
        }
      }
    }

    console.log(`Cleanup completed: ${result.successfullyDeleted} deleted, ${result.failedDeletions} failed`);

    return new Response(
      JSON.stringify({
        message: "Cleanup completed",
        ...result,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fatal error in cleanup function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

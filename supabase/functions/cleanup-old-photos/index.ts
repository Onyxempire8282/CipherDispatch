// Supabase Edge Function: cleanup-old-photos
// Deletes photos older than 14 days from storage and database
// Designed to run daily via cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const RETENTION_DAYS = 14;
const BUCKET_NAME = "claim-photos";

interface PhotoRecord {
  id: number;
  claim_id: string;
  storage_path: string;
  created_at: string;
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

    // Optional: Verify cron secret to prevent unauthorized access

    // const cronHeader = req.headers.get("x-cron-secret");
    // const cronSecret = Deno.env.get("CRON_SECRET");

    // if (cronSecret && cronHeader?.trim() !== cronSecret.trim()) {
    //   return new Response(JSON.stringify({ error: "Unauthorized" }), {
    //     status: 401,
    //     headers: { "Content-Type": "application/json" },
    //   });
    // }

    // TEMPORARILY DISABLED FOR TESTING
    // if (cronSecret && cronHeader?.trim() !== cronSecret.trim()) {
    //   console.error("Unauthorized cleanup attempt");
    //   return new Response(JSON.stringify({ error: "Unauthorized" }), {
    //     status: 401,
    //     headers: { "Content-Type": "application/json" },
    //   });
    // }

    // Initialize Supabase client with service role key for elevated permissions
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

    console.log(`Starting photo cleanup job at ${new Date().toISOString()}`);
    console.log(`Retention period: ${RETENTION_DAYS} days`);

    // Calculate cutoff date (14 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    const cutoffISO = cutoffDate.toISOString();

    console.log(`Cutoff date: ${cutoffISO}`);

    // Query for photos older than retention period
    const { data: oldPhotos, error: queryError } = await supabase
      .from("claim_photos")
      .select("id, claim_id, storage_path, created_at")
      .lt("created_at", cutoffISO)
      .order("created_at", { ascending: true });

    if (queryError) {
      console.error("Database query error:", queryError);
      throw new Error(`Failed to query old photos: ${queryError.message}`);
    }

    if (!oldPhotos || oldPhotos.length === 0) {
      console.log("No photos found for deletion");
      return new Response(
        JSON.stringify({
          message: "No photos to delete",
          cutoffDate: cutoffISO,
          processed: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${oldPhotos.length} photos to delete`);

    // Process deletions
    const result: CleanupResult = {
      totalProcessed: oldPhotos.length,
      successfullyDeleted: 0,
      failedDeletions: 0,
      errors: [],
    };

    for (const photo of oldPhotos as PhotoRecord[]) {
      try {
        console.log(`Processing photo ID ${photo.id}: ${photo.storage_path}`);

        // Step 1: Delete from storage
        const { error: storageError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([photo.storage_path]);

        if (storageError) {
          // Check if error is "object not found" - this is OK (idempotent)
          const isNotFoundError =
            storageError.message?.includes("not found") ||
            storageError.message?.includes("does not exist");

          if (isNotFoundError) {
            console.log(
              `Photo ${photo.id} not found in storage (already deleted), removing DB record`
            );
          } else {
            // Real storage error - log it but continue
            console.error(
              `Storage deletion failed for photo ${photo.id}:`,
              storageError
            );
            result.errors.push({
              photo_id: photo.id,
              error: `Storage error: ${storageError.message}`,
            });
            result.failedDeletions++;
            continue; // Skip database deletion if storage deletion failed
          }
        }

        // Step 2: Delete from database (only if storage deletion succeeded or file not found)
        const { error: dbError } = await supabase
          .from("claim_photos")
          .delete()
          .eq("id", photo.id);

        if (dbError) {
          console.error(
            `Database deletion failed for photo ${photo.id}:`,
            dbError
          );
          result.errors.push({
            photo_id: photo.id,
            error: `Database error: ${dbError.message}`,
          });
          result.failedDeletions++;
          continue;
        }

        console.log(`Successfully deleted photo ID ${photo.id}`);
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

    console.log(`Cleanup job completed`);
    console.log(`Successfully deleted: ${result.successfullyDeleted}`);
    console.log(`Failed deletions: ${result.failedDeletions}`);

    // Return comprehensive result
    return new Response(
      JSON.stringify({
        message: "Cleanup completed",
        cutoffDate: cutoffISO,
        ...result,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Fatal error in cleanup function:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

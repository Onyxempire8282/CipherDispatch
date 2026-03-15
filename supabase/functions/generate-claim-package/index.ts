import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { zipSync } from "https://esm.sh/fflate@0.8.2";

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
    const { claim_id, firm_id } = await req.json();

    if (!claim_id || !firm_id) {
      return new Response(
        JSON.stringify({ error: "claim_id and firm_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // HQ client (claims only)
    const hqUrl = Deno.env.get("HQ_SUPABASE_URL")!;
    const hqKey = Deno.env.get("HQ_SERVICE_ROLE_KEY")!;
    const hqSupabase = createClient(hqUrl, hqKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // CD client (claim_photos, documents, storage)
    const cdUrl = Deno.env.get("SUPABASE_URL")!;
    const cdKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cdSupabase = createClient(cdUrl, cdKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch photos, documents, and claim info in parallel
    const [photosRes, docsRes, claimRes] = await Promise.all([
      cdSupabase
        .from("claim_photos")
        .select("*")
        .eq("claim_id", claim_id)
        .eq("firm_id", firm_id)
        .order("order_index"),
      cdSupabase
        .from("documents")
        .select("*")
        .eq("claim_id", claim_id)
        .eq("firm_id", firm_id)
        .neq("type", "package"),
      hqSupabase
        .from("claims")
        .select("claim_number")
        .eq("id", claim_id)
        .single(),
    ]);

    const photos = photosRes.data || [];
    const documents = docsRes.data || [];
    const claimNumber = claimRes.data?.claim_number || "unknown";

    console.log(`Packaging claim ${claimNumber}: ${photos.length} photos, ${documents.length} documents`);

    // Generate signed URLs for photos
    const photoUrls: { url: string; name: string }[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const { data } = await cdSupabase.storage
        .from("claim-photos")
        .createSignedUrl(photo.storage_path, 300);
      if (data?.signedUrl) {
        const idx = String(i + 1).padStart(2, "0");
        const type = photo.photo_type || "photo";
        photoUrls.push({ url: data.signedUrl, name: `${idx}_${type}.jpg` });
      }
    }

    // Generate signed URLs for documents
    const docUrls: { url: string; name: string }[] = [];
    for (const doc of documents) {
      const { data } = await cdSupabase.storage
        .from("documents")
        .createSignedUrl(doc.storage_path, 300);
      if (data?.signedUrl) {
        docUrls.push({ url: data.signedUrl, name: doc.file_name || `document_${doc.id}` });
      }
    }

    // Fetch all photos in parallel — collect results
    const photoResults = await Promise.all(photoUrls.map(async (item) => {
      try {
        const resp = await fetch(item.url);
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          if (bytes.length > 0) {
            console.log(`Fetched photo: ${item.name} (${bytes.length} bytes)`);
            return { name: `photos/${item.name}`, bytes };
          }
        } else {
          console.error(`Failed photo ${item.name}: ${resp.status}`);
        }
      } catch (err) {
        console.error(`Error photo ${item.name}:`, err);
      }
      return null;
    }));

    // Fetch all documents in parallel — collect results
    const docResults = await Promise.all(docUrls.map(async (item) => {
      try {
        const resp = await fetch(item.url);
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          if (bytes.length > 0) {
            console.log(`Fetched document: ${item.name} (${bytes.length} bytes)`);
            return { name: `documents/${item.name}`, bytes };
          }
        } else {
          console.error(`Failed doc ${item.name}: ${resp.status}`);
        }
      } catch (err) {
        console.error(`Error doc ${item.name}:`, err);
      }
      return null;
    }));

    // Build zip synchronously after all fetches complete
    const allResults = [...photoResults, ...docResults].filter(r => r !== null) as { name: string; bytes: Uint8Array }[];
    console.log(`Total files to zip: ${allResults.length}`);

    const files: Record<string, Uint8Array> = {};
    for (const result of allResults) {
      files[result.name] = result.bytes;
    }

    console.log(`Files in zip object: ${Object.keys(files).length}`);
    const zipBlob = zipSync(files, { level: 1 });
    console.log(`Zip generated: ${zipBlob.length} bytes`);

    // Upload zip to packages bucket
    const storagePath = `firm/${firm_id}/claim/${claim_id}/claim-package.zip`;
    const { error: uploadError } = await cdSupabase.storage
      .from("packages")
      .upload(storagePath, zipBlob, { contentType: "application/zip", upsert: true });

    if (uploadError) {
      throw new Error(`Failed to upload package: ${uploadError.message}`);
    }

    // Insert document record in CD
    await cdSupabase.from("documents").upsert({
      claim_id,
      firm_id,
      type: "package",
      storage_path: storagePath,
      file_name: "claim-package.zip",
    }, { onConflict: "claim_id,firm_id,type" });

    // Generate signed URL for download (7 days)
    const { data: signedData, error: signError } = await cdSupabase.storage
      .from("packages")
      .createSignedUrl(storagePath, 604800);

    if (signError || !signedData?.signedUrl) {
      throw new Error("Failed to generate download URL");
    }

    return new Response(
      JSON.stringify({
        signed_url: signedData.signedUrl,
        file_name: "claim-package.zip",
        expires_in: 604800,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Package generation error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

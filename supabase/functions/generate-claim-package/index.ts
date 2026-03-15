import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

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

    // HQ client (claims, documents)
    const hqUrl = Deno.env.get("HQ_SUPABASE_URL")!;
    const hqKey = Deno.env.get("HQ_SERVICE_ROLE_KEY")!;
    const hqSupabase = createClient(hqUrl, hqKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // CD client (claim_photos, storage)
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
      hqSupabase
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

    // Build zip
    const zip = new JSZip();
    const photosFolder = zip.folder("photos")!;
    const docsFolder = zip.folder("documents")!;

    // Fetch and add photos
    for (let i = 0; i < photoUrls.length; i++) {
      try {
        const resp = await fetch(photoUrls[i].url);
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          photosFolder.file(photoUrls[i].name, bytes);
          console.log(`Added photo: ${photoUrls[i].name}`);
        } else {
          console.error(`Failed to fetch photo ${photoUrls[i].name}: ${resp.status}`);
        }
      } catch (err) {
        console.error(`Error fetching photo ${photoUrls[i].name}:`, err);
      }
    }

    // Fetch and add documents
    for (let i = 0; i < docUrls.length; i++) {
      try {
        const resp = await fetch(docUrls[i].url);
        if (resp.ok) {
          const bytes = new Uint8Array(await resp.arrayBuffer());
          docsFolder.file(docUrls[i].name, bytes);
          console.log(`Added document: ${docUrls[i].name}`);
        } else {
          console.error(`Failed to fetch doc ${docUrls[i].name}: ${resp.status}`);
        }
      } catch (err) {
        console.error(`Error fetching doc ${docUrls[i].name}:`, err);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "uint8array" });

    // Upload zip to packages bucket
    const storagePath = `firm/${firm_id}/claim/${claim_id}/claim-package.zip`;
    const { error: uploadError } = await cdSupabase.storage
      .from("packages")
      .upload(storagePath, zipBlob, { contentType: "application/zip", upsert: true });

    if (uploadError) {
      throw new Error(`Failed to upload package: ${uploadError.message}`);
    }

    // Insert document record in HQ
    await hqSupabase.from("documents").upsert({
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

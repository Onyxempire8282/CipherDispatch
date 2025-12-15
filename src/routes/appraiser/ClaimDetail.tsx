import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import imageCompression from "browser-image-compression";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export default function ClaimDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [claim, setClaim] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("claims")
      .select("*")
      .eq("id", id)
      .single();
    setClaim(data);
    const ph = await supabase
      .from("claim_photos")
      .select("*")
      .eq("claim_id", id)
      .order("created_at", { ascending: false });
    setPhotos(ph.data || []);
  };

  useEffect(() => {
    load();
    // Load users for assignment dropdown
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .order("full_name");
      setUsers(data || []);
    })();
  }, [id]);

  const onPhoto = async (e: any) => {
    const files: FileList = e.target.files;
    if (!files || files.length === 0 || !id) return;

    // Process all selected files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const compressed = await imageCompression(file, {
          maxWidthOrHeight: 1600,
          maxSizeMB: 1.5,
          useWebWorker: true,
        });
        const path = `claim/${id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("claim-photos")
          .upload(path, compressed, { contentType: "image/jpeg" });
        if (upErr) {
          alert(`Error uploading ${file.name}: ${upErr.message}`);
          continue;
        }
        const { error: insErr } = await supabase
          .from("claim_photos")
          .insert({ claim_id: id, storage_path: path });
        if (insErr) {
          alert(`Error saving ${file.name}: ${insErr.message}`);
        }
      } catch (err: any) {
        alert(`Error processing ${file.name}: ${err.message}`);
      }
    }

    // Reset the input so the same files can be selected again if needed
    e.target.value = "";
    await load();
  };

  const update = async (patch: any) => {
    if (!id) return;
    const { error } = await supabase.from("claims").update(patch).eq("id", id);
    if (error) alert(error.message);
    else await load();
  };

  const deleteClaim = async () => {
    if (!id) return;

    const confirmDelete = confirm(
      `⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE this claim?\n\nClaim #${claim.claim_number}\nCustomer: ${claim.customer_name}\n\nThis action CANNOT be undone and will delete:\n- The claim record\n- All associated photos\n- All related data\n\nType "DELETE" in the next dialog to confirm.`
    );

    if (!confirmDelete) return;

    const confirmText = prompt('Type "DELETE" to confirm permanent deletion:');
    if (confirmText !== "DELETE") {
      alert("Deletion cancelled - text did not match.");
      return;
    }

    // Delete photos from storage
    for (const photo of photos) {
      await supabase.storage.from("claim-photos").remove([photo.storage_path]);
    }

    // Delete photo records
    await supabase.from("claim_photos").delete().eq("claim_id", id);

    // Delete claim
    const { error } = await supabase.from("claims").delete().eq("id", id);

    if (error) {
      alert(`Error deleting claim: ${error.message}`);
    } else {
      alert("Claim permanently deleted.");
      nav("/admin/claims");
    }
  };

  const deletePhoto = async (photo: any) => {
    if (!confirm(`Delete this photo? This cannot be undone.`)) return;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("claim-photos")
      .remove([photo.storage_path]);

    if (storageError) {
      alert(`Error deleting photo from storage: ${storageError.message}`);
      return;
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("claim_photos")
      .delete()
      .eq("id", photo.id);

    if (dbError) {
      alert(`Error deleting photo record: ${dbError.message}`);
      return;
    }

    // Close lightbox if open
    setLightboxIndex(null);

    // Reload photos
    await load();
  };

  if (!claim) return null;

  const openInMaps = () => {
    const q = encodeURIComponent(
      `${claim.address_line1} ${claim.city || ""} ${claim.state || ""} ${
        claim.postal_code || ""
      }`
    );
    window.open(`https://www.google.com/maps?q=${q}`, "_blank");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            background: "#2d3748",
            border: "1px solid #4a5568",
            padding: 16,
            borderRadius: 8,
          }}
        >
          <h3 style={{ margin: 0, color: "#e2e8f0" }}>
            Claim {claim.claim_number}
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              to="/admin/claims"
              style={{
                padding: "8px 16px",
                background: "#4a5568",
                color: "white",
                textDecoration: "none",
                borderRadius: 4,
                fontWeight: "bold",
              }}
            >
              ← Back to Claims
            </Link>
            <Link
              to="/"
              style={{
                padding: "8px 16px",
                background: "#6c757d",
                color: "white",
                textDecoration: "none",
                borderRadius: 4,
                fontWeight: "bold",
              }}
            >
              ← Home
            </Link>
          </div>
        </div>

        <div>
          <h4>Customer Information</h4>
          <div>
            <strong>Name:</strong> {claim.customer_name}
          </div>
          {claim.phone && (
            <div>
              <strong>Phone:</strong>{" "}
              <a href={`tel:${claim.phone}`}>{claim.phone}</a>
            </div>
          )}
          {claim.email && (
            <div>
              <strong>Email:</strong>{" "}
              <a href={`mailto:${claim.email}`}>{claim.email}</a>
            </div>
          )}
        </div>

        <div>
          <h4>Vehicle Information</h4>
          {claim.vin && (
            <div>
              <strong>VIN:</strong> {claim.vin}
            </div>
          )}
          {claim.vehicle_year && (
            <div>
              <strong>Year:</strong> {claim.vehicle_year}
            </div>
          )}
          {claim.vehicle_make && (
            <div>
              <strong>Make:</strong> {claim.vehicle_make}
            </div>
          )}
          {claim.vehicle_model && (
            <div>
              <strong>Model:</strong> {claim.vehicle_model}
            </div>
          )}
        </div>

        {claim.notes && (
          <div>
            <h4>Accident Description</h4>
            <div
              style={{
                whiteSpace: "pre-wrap",
                background: "#f5f5f5",
                padding: 12,
                borderRadius: 4,
              }}
            >
              {claim.notes}
            </div>
          </div>
        )}

        <div>
          <h4>Appointment</h4>
          <label>Appointment Start</label>
          <input
            type="datetime-local"
            onChange={(e) =>
              update({
                appointment_start: new Date(e.target.value).toISOString(),
              })
            }
          />
          <label>Appointment End</label>
          <input
            type="datetime-local"
            onChange={(e) =>
              update({
                appointment_end: new Date(e.target.value).toISOString(),
              })
            }
          />
        </div>

        <div>
          <h4>Assignment</h4>
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Assign to Appraiser:
            </label>
            <select
              value={claim.assigned_to || ""}
              onChange={(e) =>
                update({ assigned_to: e.target.value || null })
              }
              style={{
                padding: 12,
                fontSize: 16,
                border: "1px solid #4a5568",
                borderRadius: 6,
                background: "#2d3748",
                color: "#e2e8f0",
                width: "100%",
                maxWidth: 400,
              }}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name || u.user_id} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <h4>Status & Actions</h4>
          <div style={{ marginBottom: 8 }}>
            <strong>Current Status:</strong>{" "}
            <span
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 4,
                fontSize: 14,
                fontWeight: "bold",
                background:
                  claim.status === "COMPLETED"
                    ? "#4CAF50"
                    : claim.status === "IN_PROGRESS"
                    ? "#FF9800"
                    : claim.status === "SCHEDULED"
                    ? "#2196F3"
                    : claim.status === "CANCELED"
                    ? "#ef4444"
                    : "#9E9E9E",
                color: "white",
              }}
            >
              {claim.status}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => update({ status: "SCHEDULED" })}
              style={{
                padding: "8px 16px",
                background: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              📅 Mark Scheduled
            </button>
            <button
              onClick={() => update({ status: "IN_PROGRESS" })}
              style={{
                padding: "8px 16px",
                background: "#FF9800",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              🔧 Start Work
            </button>
            <button
              onClick={() => update({ status: "COMPLETED" })}
              style={{
                padding: "8px 16px",
                background: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ✅ Mark Complete
            </button>
            <button
              onClick={() => {
                if (confirm("Cancel this claim? This will mark it as CANCELED and remove it from active claims.")) {
                  update({ status: "CANCELED" });
                }
              }}
              style={{
                padding: "8px 16px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ❌ Cancel Claim
            </button>
          </div>

          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "2px solid #f0f0f0",
            }}
          >
            <h5 style={{ color: "#dc3545", marginBottom: 8 }}>
              ⚠️ Danger Zone
            </h5>
            <button
              onClick={deleteClaim}
              style={{
                padding: "8px 16px",
                background: "#dc3545",
                color: "white",
                border: "2px solid #c82333",
                borderRadius: 4,
                fontWeight: "bold",
                cursor: "pointer",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#c82333")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "#dc3545")}
            >
              🗑️ Permanently Delete Claim
            </button>
            <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
              ⚠️ This action cannot be undone. All photos and data will be
              permanently deleted.
            </p>
          </div>
        </div>

        <div>
          <h4>Location</h4>
          <div>
            <strong>Address:</strong> {claim.address_line1}{" "}
            {claim.address_line2 && `, ${claim.address_line2}`}
          </div>
          <div>
            {claim.city}, {claim.state} {claim.postal_code}
          </div>
          {claim.lat && claim.lng ? (
            <div style={{ height: 300, marginTop: 8 }}>
              <MapContainer
                center={[claim.lat, claim.lng]}
                zoom={15}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                <Marker position={[claim.lat, claim.lng]}>
                  <Popup>Claim Location</Popup>
                </Marker>
              </MapContainer>
            </div>
          ) : (
            <div>No coordinates yet</div>
          )}
          <button onClick={openInMaps} style={{ marginTop: 8 }}>
            Open in Google Maps
          </button>
        </div>

        <div>
          <h4>📸 Photos ({photos.length})</h4>
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <label
              htmlFor="photo-upload"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: "#0066cc",
                color: "white",
                borderRadius: 6,
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              📷 Take Photo
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhoto}
              style={{ display: "none" }}
              multiple
            />

            <label
              htmlFor="photo-gallery"
              style={{
                display: "inline-block",
                padding: "12px 24px",
                background: "#4CAF50",
                color: "white",
                borderRadius: 6,
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              🖼️ Choose from Gallery
            </label>
            <input
              id="photo-gallery"
              type="file"
              accept="image/*"
              onChange={onPhoto}
              style={{ display: "none" }}
              multiple
            />

            <p
              style={{
                fontSize: 13,
                color: "#666",
                marginTop: 8,
                width: "100%",
              }}
            >
              💡 Tip: Photos are automatically compressed and optimized for
              storage
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
              marginTop: 8,
            }}
          >
            {photos.map((p, index) => {
              const photoUrl = supabase.storage
                .from("claim-photos")
                .getPublicUrl(p.storage_path).data.publicUrl;

              return (
                <div key={p.id} style={{ position: "relative" }}>
                  <div
                    onClick={() => setLightboxIndex(index)}
                    style={{
                      width: "100%",
                      height: 200,
                      backgroundImage: `url(${photoUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      borderRadius: 4,
                      cursor: "pointer",
                      border: "2px solid #ddd",
                      position: "relative",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhoto(p);
                      }}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "rgba(244, 67, 54, 0.9)",
                        color: "white",
                        border: "2px solid white",
                        fontSize: 18,
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <a
                    href={photoUrl}
                    download={`claim-${claim?.claim_number}-photo-${p.id}.jpg`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: "10px",
                      background: "#4CAF50",
                      color: "white",
                      textAlign: "center",
                      borderRadius: 4,
                      textDecoration: "none",
                      fontSize: 14,
                      fontWeight: "bold",
                      boxSizing: "border-box",
                    }}
                  >
                    ⬇️ Download
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lightbox Modal */}
        {lightboxIndex !== null && (
          <div
            onClick={() => setLightboxIndex(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.95)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "white",
                border: "none",
                borderRadius: 50,
                width: 40,
                height: 40,
                fontSize: 24,
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ×
            </button>

            <div
              style={{
                position: "relative",
                maxWidth: "90%",
                maxHeight: "80%",
              }}
            >
              <img
                src={
                  supabase.storage
                    .from("claim-photos")
                    .getPublicUrl(photos[lightboxIndex].storage_path).data
                    .publicUrl
                }
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  objectFit: "contain",
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 20,
                alignItems: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1
                  );
                }}
                style={{
                  padding: "12px 24px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                ← Previous
              </button>

              <span
                style={{ color: "white", fontSize: 16, fontWeight: "bold" }}
              >
                {lightboxIndex + 1} / {photos.length}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0
                  );
                }}
                style={{
                  padding: "12px 24px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Next →
              </button>

              <a
                href={
                  supabase.storage
                    .from("claim-photos")
                    .getPublicUrl(photos[lightboxIndex].storage_path).data
                    .publicUrl
                }
                download={`claim-${claim?.claim_number}-photo-${photos[lightboxIndex].id}.jpg`}
                style={{
                  padding: "12px 24px",
                  background: "#4CAF50",
                  color: "white",
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: "bold",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                ⬇️ Download
              </a>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deletePhoto(photos[lightboxIndex]);
                }}
                style={{
                  padding: "12px 24px",
                  background: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

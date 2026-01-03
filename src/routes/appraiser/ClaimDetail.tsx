import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import imageCompression from "browser-image-compression";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { getSupabaseAuthz } from "../../lib/supabaseAuthz";
import { getFirmColor } from "../../constants/firmColors";
import { calculateExpectedPayout } from "../../utils/firmFeeConfig";
import { getPayPeriod } from "../../utils/payoutForecasting";
import JSZip from "jszip";

export default function ClaimDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [claim, setClaim] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Photo viewer state
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Edit state for all fields
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editVehicleYear, setEditVehicleYear] = useState("");
  const [editVehicleMake, setEditVehicleMake] = useState("");
  const [editVehicleModel, setEditVehicleModel] = useState("");
  const [editVin, setEditVin] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAddressLine1, setEditAddressLine1] = useState("");
  const [editAddressLine2, setEditAddressLine2] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editAppointmentStart, setEditAppointmentStart] = useState("");
  const [editAppointmentEnd, setEditAppointmentEnd] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editPayAmount, setEditPayAmount] = useState("");
  const [editFileTotal, setEditFileTotal] = useState("");
  const [editFirmName, setEditFirmName] = useState("");
  const [firms, setFirms] = useState<any[]>([]);

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
    // Load firms for firm dropdown
    (async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, name")
        .eq("active", true)
        .order("name");
      setFirms(data || []);
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

  const startEditing = () => {
    setEditCustomerName(claim?.customer_name || "");
    setEditPhone(claim?.phone || "");
    setEditEmail(claim?.email || "");
    setEditVehicleYear(claim?.vehicle_year?.toString() || "");
    setEditVehicleMake(claim?.vehicle_make || "");
    setEditVehicleModel(claim?.vehicle_model || "");
    setEditVin(claim?.vin || "");
    setEditNotes(claim?.notes || "");
    setEditAddressLine1(claim?.address_line1 || "");
    setEditAddressLine2(claim?.address_line2 || "");
    setEditCity(claim?.city || "");
    setEditState(claim?.state || "");
    setEditPostalCode(claim?.postal_code || "");
    setEditAppointmentStart(
      claim?.appointment_start
        ? (() => {
            const d = new Date(claim.appointment_start);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          })()
        : ""
    );
    setEditAppointmentEnd(
      claim?.appointment_end
        ? (() => {
            const d = new Date(claim.appointment_end);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          })()
        : ""
    );
    setEditAssignedTo(claim?.assigned_to || "");
    setEditPayAmount(claim?.pay_amount?.toString() || "");
    setEditFileTotal(claim?.file_total?.toString() || "");
    setEditFirmName(claim?.firm_name || "");
    setIsEditing(true);
  };

  const saveEdits = async () => {
    const patch: any = {
      customer_name: editCustomerName,
      phone: editPhone,
      email: editEmail,
      vehicle_make: editVehicleMake,
      vehicle_model: editVehicleModel,
      vin: editVin,
      notes: editNotes,
      address_line1: editAddressLine1,
      address_line2: editAddressLine2,
      city: editCity,
      state: editState,
      postal_code: editPostalCode,
      assigned_to: editAssignedTo || null,
      firm_name: editFirmName || null,
    };

    // Add vehicle year if valid
    if (editVehicleYear) {
      const year = parseInt(editVehicleYear);
      if (!isNaN(year)) {
        patch.vehicle_year = year;
      }
    }

    // Add pay amount if valid
    if (editPayAmount) {
      const amount = parseFloat(editPayAmount);
      if (!isNaN(amount)) {
        patch.pay_amount = amount;
      }
    } else {
      patch.pay_amount = null;
    }

    // Add file total if valid
    if (editFileTotal) {
      const amount = parseFloat(editFileTotal);
      if (!isNaN(amount)) {
        patch.file_total = amount;
      }
    } else {
      patch.file_total = null;
    }

    // Add appointment times if provided - preserve local timezone
    if (editAppointmentStart) {
      const [datePart, timePart] = editAppointmentStart.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hour, minute, 0);
      patch.appointment_start = localDate.toISOString();
    }
    if (editAppointmentEnd) {
      const [datePart, timePart] = editAppointmentEnd.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      const localDate = new Date(year, month - 1, day, hour, minute, 0);
      patch.appointment_end = localDate.toISOString();
    }

    await update(patch);
    setIsEditing(false);
  };

  const cancelEdits = () => {
    setIsEditing(false);
  };

  const markComplete = async () => {
    if (confirm("Mark this claim as COMPLETED? This will notify the admin.")) {
      // Set completed_month to current YYYY-MM when marking as complete
      const now = new Date();
      const completedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Store completion_date as date-only at midnight UTC to avoid timezone issues
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const completionDate = `${year}-${month}-${day}T00:00:00Z`;

      // Calculate expected payout date based on firm's pay schedule
      let expectedPayoutDate = null;
      if (claim.firm_name) {
        try {
          const payPeriod = getPayPeriod(claim.firm_name, now);
          const payYear = payPeriod.payoutDate.getFullYear();
          const payMonth = String(payPeriod.payoutDate.getMonth() + 1).padStart(2, '0');
          const payDay = String(payPeriod.payoutDate.getDate()).padStart(2, '0');
          expectedPayoutDate = `${payYear}-${payMonth}-${payDay}T00:00:00Z`;
        } catch (err) {
          console.warn("Could not calculate expected payout date:", err);
        }
      }

      await update({
        status: "COMPLETED",
        completed_month: completedMonth,
        completion_date: completionDate,
        expected_payout_date: expectedPayoutDate,
        payout_status: "unpaid"
      });
    }
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

  const downloadAllPhotos = async () => {
    if (photos.length === 0) {
      alert("No photos to download");
      return;
    }

    try {
      const zip = new JSZip();
      const photoFolder = zip.folder("photos");

      // Fetch all photos and add to zip
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const photoUrl = supabase.storage
          .from("claim-photos")
          .getPublicUrl(photo.storage_path).data.publicUrl;

        // Fetch photo as blob
        const response = await fetch(photoUrl);
        const blob = await response.blob();

        // Add to zip with sequential naming
        const filename = `photo-${i + 1}.jpg`;
        photoFolder?.file(filename, blob);
      }

      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });

      // Create download link and trigger download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `claim_${claim.claim_number}_photos.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`Error creating zip file: ${error.message}`);
    }
  };

  // Photo viewer helper functions
  const resetViewerState = () => {
    setRotation(0);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setIsDragging(false);
  };

  const rotateLeft = () => {
    setRotation((r) => (r - 90) % 360);
  };

  const rotateRight = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom((z) => {
      const newZoom = Math.max(z - 0.5, 1);
      if (newZoom === 1) {
        setPanX(0);
        setPanY(0);
      }
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
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

  const sectionStyle = {
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
  };

  const headerStyle = {
    fontSize: "22px",
    fontWeight: "bold",
    color: "#f8fafc",
    marginBottom: "16px",
    paddingBottom: "12px",
    borderBottom: "2px solid #4b5563",
  };

  const labelStyle = {
    fontSize: "15px",
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: "6px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  };

  const valueStyle = {
    fontSize: "17px",
    color: "#ffffff",
    marginBottom: "12px",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            ...sectionStyle,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderColor: "#667eea",
          }}
        >
          <div>
            <h2 style={{ margin: 0, color: "white", fontSize: "28px", fontWeight: "bold" }}>
              Claim #{claim.claim_number}
            </h2>
            <p style={{ margin: "4px 0 0 0", color: "rgba(255,255,255,0.9)", fontSize: "16px" }}>
              {claim.customer_name}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {(() => {
              const authz = getSupabaseAuthz();
              const userInfo = authz?.getCurrentUser();
              const isAdmin = userInfo?.role === "admin";
              const isArchived = claim.status === 'CANCELED';

              return isAdmin ? (
                !isEditing ? (
                  isArchived ? (
                    <div
                      style={{
                        padding: "10px 20px",
                        background: "rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.4)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "15px",
                        backdropFilter: "blur(10px)",
                        cursor: "not-allowed",
                      }}
                      title="Editing is disabled for archived claims"
                    >
                      🔒 Archived - Edit Disabled
                    </div>
                  ) : (
                    <button
                      onClick={startEditing}
                      style={{
                        padding: "10px 20px",
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.3)",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "15px",
                        backdropFilter: "blur(10px)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                    >
                      ✏️ Edit Claim
                    </button>
                  )
                ) : (
                  <>
                    <button
                      onClick={saveEdits}
                      style={{
                        padding: "10px 20px",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "15px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                      }}
                    >
                      ✅ Save Changes
                    </button>
                    <button
                      onClick={cancelEdits}
                      style={{
                        padding: "10px 20px",
                        background: "rgba(239, 68, 68, 0.9)",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "15px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(220, 38, 38, 0.9)";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(239, 68, 68, 0.9)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      ❌ Cancel
                    </button>
                  </>
                )
              ) : null;
            })()}
            {(() => {
              const authz = getSupabaseAuthz();
              const userInfo = authz?.getCurrentUser();
              const isAdmin = userInfo?.role === "admin";
              const fromCalendar = searchParams.get("from") === "calendar";

              let backLink = isAdmin ? "/admin/claims" : "/my-claims";
              if (fromCalendar) {
                backLink += "?view=calendar";
              }

              return (
                <Link
                  to={backLink}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    textDecoration: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "15px",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    transition: "all 0.2s",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                    display: "inline-block",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #818cf8 0%, #8b5fbf 100%)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                  }}
                >
                  ← Back to {fromCalendar ? "Calendar" : "Claims"}
                </Link>
              );
            })()}
            <Link
              to="/"
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                textDecoration: "none",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "15px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.2)",
                transition: "all 0.2s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                display: "inline-block",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #818cf8 0%, #8b5fbf 100%)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
              }}
            >
              ← Home
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
          {/* Payment Information - Admin Only */}
          {(() => {
            const authz = getSupabaseAuthz();
            const userInfo = authz?.getCurrentUser();
            const isAdmin = userInfo?.role === "admin";

            return isAdmin ? (
              <div style={sectionStyle}>
                <h4 style={headerStyle}>💰 Payment Information</h4>
                <div style={{ marginBottom: "16px" }}>
                  <div style={labelStyle}>Pay Amount</div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editPayAmount}
                      onChange={(e) => setEditPayAmount(e.target.value)}
                      placeholder="Enter amount"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: "17px",
                        border: "2px solid #6b7280",
                        borderRadius: "8px",
                        background: "#475569",
                        color: "#ffffff",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#667eea"}
                      onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                    />
                  ) : claim.pay_amount ? (
                    <div style={valueStyle}>
                      ${claim.pay_amount.toFixed(2)}
                    </div>
                  ) : (claim.status === 'SCHEDULED' || claim.status === 'IN_PROGRESS') && claim.firm_name ? (
                    <div style={{ ...valueStyle, color: "#f59e0b" }}>
                      ${calculateExpectedPayout(claim.firm_name, claim.pay_amount).toFixed(2)}
                      <span style={{ fontSize: "13px", color: "#a0aec0", marginLeft: "8px" }}>(estimated)</span>
                    </div>
                  ) : (
                    <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>Not set</div>
                  )}
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <div style={labelStyle}>File Total</div>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editFileTotal}
                      onChange={(e) => setEditFileTotal(e.target.value)}
                      placeholder="Enter file total"
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        fontSize: "17px",
                        border: "2px solid #6b7280",
                        borderRadius: "8px",
                        background: "#475569",
                        color: "#ffffff",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#667eea"}
                      onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                    />
                  ) : claim.file_total ? (
                    <div style={valueStyle}>
                      ${claim.file_total.toFixed(2)}
                    </div>
                  ) : (
                    <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>Not set</div>
                  )}
                </div>

                {/* Payout Tracking - Show only for completed claims */}
                {claim.status === 'COMPLETED' && (
                  <>
                    <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "2px solid #4b5563" }}>
                      <h5 style={{ ...labelStyle, fontSize: "16px", fontWeight: "bold", color: "#a78bfa", marginBottom: "16px" }}>
                        💳 Payout Tracking
                      </h5>

                      {/* Expected Payout Date */}
                      <div style={{ marginBottom: "16px" }}>
                        <div style={labelStyle}>Expected Payout Date</div>
                        <div style={valueStyle}>
                          {claim.expected_payout_date
                            ? new Date(claim.expected_payout_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Not calculated</span>}
                        </div>
                      </div>

                      {/* Actual Payout Date */}
                      <div style={{ marginBottom: "16px" }}>
                        <div style={labelStyle}>Actual Payout Date</div>
                        <div style={valueStyle}>
                          {claim.actual_payout_date
                            ? new Date(claim.actual_payout_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Payment not received</span>}
                        </div>
                      </div>

                      {/* Payout Status */}
                      <div style={{ marginBottom: "16px" }}>
                        <div style={labelStyle}>Payout Status</div>
                        <div style={{
                          ...valueStyle,
                          display: "inline-block",
                          padding: "6px 16px",
                          borderRadius: "20px",
                          background: claim.payout_status === 'paid' ? "#10b981" :
                                      claim.payout_status === 'overdue' ? "#ef4444" :
                                      claim.payout_status === 'unpaid' ? "#f59e0b" :
                                      "#6b7280",
                          color: "white",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          fontSize: "14px"
                        }}>
                          {claim.payout_status || 'not_applicable'}
                        </div>
                      </div>

                      {/* Mark as Paid Button */}
                      {claim.payout_status !== 'paid' && !claim.actual_payout_date && (
                        <button
                          onClick={async () => {
                            if (confirm("Mark this claim as PAID and record today as the payment date?")) {
                              const now = new Date();
                              const year = now.getFullYear();
                              const month = String(now.getMonth() + 1).padStart(2, '0');
                              const day = String(now.getDate()).padStart(2, '0');
                              const actualPayoutDate = `${year}-${month}-${day}T00:00:00Z`;

                              await update({
                                actual_payout_date: actualPayoutDate,
                                payout_status: 'paid'
                              });
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "14px",
                            fontSize: "16px",
                            fontWeight: "bold",
                            color: "white",
                            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                            transition: "transform 0.1s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
                        >
                          ✓ Mark as Paid Today
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : null;
          })()}

          {/* Firm Information */}
          <div style={sectionStyle}>
            <h4 style={headerStyle}>🏢 Firm</h4>
            <div style={{ marginBottom: "16px" }}>
              <div style={labelStyle}>Vendor</div>
              {isEditing ? (
                <select
                  value={editFirmName}
                  onChange={(e) => setEditFirmName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "17px",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    background: "#475569",
                    color: "#ffffff",
                    transition: "border-color 0.2s",
                    cursor: "pointer",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                >
                  <option value="">Select a firm...</option>
                  {firms.map((firm) => (
                    <option key={firm.id} value={firm.name}>
                      {firm.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "4px",
                      background: getFirmColor(claim.firm_name),
                      border: "2px solid rgba(255,255,255,0.3)",
                    }}
                  />
                  <div style={valueStyle}>{claim.firm_name || "Not assigned"}</div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div style={sectionStyle}>
            <h4 style={headerStyle}>👤 Customer Information</h4>
            <div style={{ marginBottom: "16px" }}>
              <div style={labelStyle}>Name</div>
              {isEditing ? (
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "17px",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    background: "#475569",
                    color: "#ffffff",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                />
              ) : (
                <div style={valueStyle}>{claim.customer_name}</div>
              )}
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={labelStyle}>Phone</div>
              {isEditing ? (
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Phone number"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "17px",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    background: "#475569",
                    color: "#ffffff",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                />
              ) : claim.phone ? (
                <a
                  href={`tel:${claim.phone}`}
                  style={{
                    fontSize: "17px",
                    color: "#818cf8",
                    textDecoration: "none",
                    fontWeight: "600",
                  }}
                >
                  📞 {claim.phone}
                </a>
              ) : (
                <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>No phone</div>
              )}
            </div>
            <div style={{ marginBottom: "16px" }}>
              <div style={labelStyle}>Email</div>
              {isEditing ? (
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email address"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "17px",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    background: "#475569",
                    color: "#ffffff",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                />
              ) : claim.email ? (
                <a
                  href={`mailto:${claim.email}`}
                  style={{
                    fontSize: "17px",
                    color: "#818cf8",
                    textDecoration: "none",
                    fontWeight: "600",
                  }}
                >
                  ✉️ {claim.email}
                </a>
              ) : (
                <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>No email</div>
              )}
            </div>
          </div>

          {/* Vehicle Information */}
          <div style={sectionStyle}>
            <h4 style={headerStyle}>🚗 Vehicle Information</h4>
            <div style={{ marginBottom: "16px" }}>
              <div style={labelStyle}>VIN</div>
              {isEditing ? (
                <input
                  type="text"
                  value={editVin}
                  onChange={(e) => setEditVin(e.target.value)}
                  placeholder="Vehicle Identification Number"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "16px",
                    fontFamily: "monospace",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    background: "#475569",
                    color: "#ffffff",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                />
              ) : claim.vin ? (
                <div style={{ ...valueStyle, fontFamily: "monospace", fontSize: "16px" }}>{claim.vin}</div>
              ) : (
                <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>No VIN</div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px" }}>
              <div>
                <div style={labelStyle}>Year</div>
                {isEditing ? (
                  <input
                    type="number"
                    value={editVehicleYear}
                    onChange={(e) => setEditVehicleYear(e.target.value)}
                    placeholder="Year"
                    min="1900"
                    max="2100"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "17px",
                      border: "2px solid #6b7280",
                      borderRadius: "8px",
                      background: "#475569",
                      color: "#ffffff",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                  />
                ) : claim.vehicle_year ? (
                  <div style={valueStyle}>{claim.vehicle_year}</div>
                ) : (
                  <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>-</div>
                )}
              </div>
              <div>
                <div style={labelStyle}>Make</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editVehicleMake}
                    onChange={(e) => setEditVehicleMake(e.target.value)}
                    placeholder="Make"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "17px",
                      border: "2px solid #6b7280",
                      borderRadius: "8px",
                      background: "#475569",
                      color: "#ffffff",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                  />
                ) : claim.vehicle_make ? (
                  <div style={valueStyle}>{claim.vehicle_make}</div>
                ) : (
                  <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>-</div>
                )}
              </div>
              <div>
                <div style={labelStyle}>Model</div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editVehicleModel}
                    onChange={(e) => setEditVehicleModel(e.target.value)}
                    placeholder="Model"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "17px",
                      border: "2px solid #6b7280",
                      borderRadius: "8px",
                      background: "#475569",
                      color: "#ffffff",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                  />
                ) : claim.vehicle_model ? (
                  <div style={valueStyle}>{claim.vehicle_model}</div>
                ) : (
                  <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>-</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Accident Description */}
        {(claim.notes || isEditing) && (
          <div style={{ ...sectionStyle, marginBottom: "24px" }}>
            <h4 style={headerStyle}>📋 Accident Description</h4>
            {isEditing ? (
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Enter accident description..."
                style={{
                  width: "100%",
                  minHeight: "120px",
                  padding: "12px",
                  background: "#475569",
                  border: "2px solid #6b7280",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "16px",
                  lineHeight: "1.6",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#6b7280"}
              />
            ) : (
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  background: "#2d3748",
                  border: "1px solid #4b5563",
                  padding: "16px",
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontSize: "16px",
                  lineHeight: "1.6",
                }}
              >
                {claim.notes || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No description provided</span>}
              </div>
            )}
          </div>
        )}

        {/* Appointment and Assignment Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
          {/* Appointment */}
          <div style={sectionStyle}>
            <h4 style={headerStyle}>📅 Appointment</h4>
            <div style={{ marginBottom: "20px" }}>
              <div style={labelStyle}>Start Date & Time</div>
              {isEditing ? (
                <input
                  type="datetime-local"
                  value={editAppointmentStart}
                  onChange={(e) => setEditAppointmentStart(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "17px",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    background: "#475569",
                    color: "#ffffff",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                />
              ) : claim.appointment_start ? (
                <div style={valueStyle}>
                  {new Date(claim.appointment_start).toLocaleString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              ) : (
                <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>No appointment set</div>
              )}
            </div>
            <div>
              <div style={labelStyle}>End Date & Time</div>
              {isEditing ? (
                <input
                  type="datetime-local"
                  value={editAppointmentEnd}
                  onChange={(e) => setEditAppointmentEnd(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "17px",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    background: "#475569",
                    color: "#ffffff",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                />
              ) : claim.appointment_end ? (
                <div style={valueStyle}>
                  {new Date(claim.appointment_end).toLocaleString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })}
                </div>
              ) : (
                <div style={{ ...valueStyle, color: "#9ca3af", fontStyle: "italic" }}>No end time set</div>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div style={sectionStyle}>
            <h4 style={headerStyle}>👥 Assignment</h4>
            <div style={labelStyle}>Assigned Appraiser</div>
            {isEditing ? (
              <select
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: "17px",
                  border: "2px solid #6b7280",
                  borderRadius: "8px",
                  background: "#475569",
                  color: "#ffffff",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#667eea"}
                onBlur={(e) => e.target.style.borderColor = "#6b7280"}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name || u.user_id} ({u.role})
                  </option>
                ))}
              </select>
            ) : (
              <div style={valueStyle}>
                {claim.assigned_to
                  ? users.find(u => u.user_id === claim.assigned_to)?.full_name || "Unknown User"
                  : "Unassigned"}
              </div>
            )}
          </div>
        </div>

        {/* Status & Actions */}
        <div style={sectionStyle}>
          <h4 style={headerStyle}>⚡ Status & Actions</h4>

          <div style={{ marginBottom: "24px" }}>
            <div style={labelStyle}>Current Status</div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "17px",
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
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              {claim.status === "COMPLETED" && "✅"}
              {claim.status === "IN_PROGRESS" && "🔧"}
              {claim.status === "SCHEDULED" && "📅"}
              {claim.status === "CANCELED" && "❌"}
              {!claim.status && "📋"}
              {" "}{claim.status || "NOT_STARTED"}
            </div>
          </div>

          <div style={{ marginBottom: "24px" }}>
            <div style={labelStyle}>Update Status</div>
            <select
              onChange={async (e) => {
                const value = e.target.value;
                if (value === "DELETE") {
                  deleteClaim();
                } else if (value === "CANCELED") {
                  if (confirm("Cancel this claim? This will mark it as CANCELED and remove it from active claims.")) {
                    update({ status: "CANCELED" });
                  }
                } else if (value === "COMPLETED") {
                  // Calculate expected payout date when marking as COMPLETED
                  const now = new Date();
                  const year = now.getFullYear();
                  const month = String(now.getMonth() + 1).padStart(2, '0');
                  const day = String(now.getDate()).padStart(2, '0');
                  const completionDate = `${year}-${month}-${day}T00:00:00Z`;
                  const completedMonth = `${year}-${month}`;

                  let expectedPayoutDate = null;
                  if (claim.firm_name) {
                    try {
                      const payPeriod = getPayPeriod(claim.firm_name, now);
                      const payYear = payPeriod.payoutDate.getFullYear();
                      const payMonth = String(payPeriod.payoutDate.getMonth() + 1).padStart(2, '0');
                      const payDay = String(payPeriod.payoutDate.getDate()).padStart(2, '0');
                      expectedPayoutDate = `${payYear}-${payMonth}-${payDay}T00:00:00Z`;
                    } catch (err) {
                      console.warn("Could not calculate expected payout date:", err);
                    }
                  }

                  update({
                    status: "COMPLETED",
                    completion_date: completionDate,
                    completed_month: completedMonth,
                    expected_payout_date: expectedPayoutDate,
                    payout_status: "unpaid"
                  });
                } else if (value) {
                  update({ status: value });
                }
                e.target.value = ""; // Reset dropdown
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: "17px",
                border: "2px solid #6b7280",
                borderRadius: "8px",
                background: "#475569",
                color: "#ffffff",
                cursor: "pointer",
                fontWeight: "600",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#667eea"}
              onBlur={(e) => e.target.style.borderColor = "#6b7280"}
            >
              <option value="">Choose an action...</option>
              <option value="SCHEDULED">📅 Mark as Scheduled</option>
              <option value="IN_PROGRESS">🔧 In Progress</option>
              <option value="COMPLETED">✅ Mark as Complete</option>
              <option value="CANCELED">❌ Cancel Claim</option>
              <option value="DELETE" style={{ color: "#ef4444", fontWeight: "bold" }}>
                🗑️ Permanently Delete Claim
              </option>
            </select>
            <p style={{ fontSize: "14px", color: "#cbd5e1", marginTop: "8px", fontStyle: "italic" }}>
              ⚠️ Permanent delete cannot be undone. All photos and data will be lost.
            </p>
          </div>

          {/* Complete Claim Button for Appraisers */}
          {(() => {
            const authz = getSupabaseAuthz();
            const userInfo = authz?.getCurrentUser();
            const isAppraiser = userInfo?.role === "appraiser";
            const hasPhotos = photos.length > 0;
            const isCompleted = claim.status === "COMPLETED";

            return isAppraiser && hasPhotos && !isCompleted ? (
              <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "2px solid #4b5563" }}>
                <div style={labelStyle}>Ready to Submit?</div>
                <button
                  onClick={markComplete}
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "18px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
                  }}
                >
                  ✅ Mark Claim as Complete
                </button>
                <p style={{ fontSize: "13px", color: "#cbd5e1", marginTop: "8px", fontStyle: "italic", textAlign: "center" }}>
                  This will notify the admin that you've finished this claim
                </p>
              </div>
            ) : null;
          })()}
        </div>

        {/* Location & Map */}
        <div style={sectionStyle}>
          <h4 style={headerStyle}>📍 Location</h4>

          {isEditing ? (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ marginBottom: "16px" }}>
                <div style={labelStyle}>Address Line 1</div>
                <input
                  type="text"
                  value={editAddressLine1}
                  onChange={(e) => setEditAddressLine1(e.target.value)}
                  placeholder="Street address"
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "17px",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    background: "#475569",
                    color: "#ffffff",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                />
              </div>
              <div style={{ marginBottom: "16px" }}>
                <div style={labelStyle}>Address Line 2 (Optional)</div>
                <input
                  type="text"
                  value={editAddressLine2}
                  onChange={(e) => setEditAddressLine2(e.target.value)}
                  placeholder="Apt, suite, etc."
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    fontSize: "17px",
                    border: "2px solid #6b7280",
                    borderRadius: "8px",
                    background: "#475569",
                    color: "#ffffff",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#667eea"}
                  onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px" }}>
                <div>
                  <div style={labelStyle}>City</div>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="City"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "17px",
                      border: "2px solid #6b7280",
                      borderRadius: "8px",
                      background: "#475569",
                      color: "#ffffff",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                  />
                </div>
                <div>
                  <div style={labelStyle}>State</div>
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    placeholder="State"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "17px",
                      border: "2px solid #6b7280",
                      borderRadius: "8px",
                      background: "#475569",
                      color: "#ffffff",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                  />
                </div>
                <div>
                  <div style={labelStyle}>ZIP</div>
                  <input
                    type="text"
                    value={editPostalCode}
                    onChange={(e) => setEditPostalCode(e.target.value)}
                    placeholder="ZIP"
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      fontSize: "17px",
                      border: "2px solid #6b7280",
                      borderRadius: "8px",
                      background: "#475569",
                      color: "#ffffff",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#6b7280"}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "16px" }}>
                <div style={labelStyle}>Street Address</div>
                <div style={valueStyle}>
                  {claim.address_line1}
                  {claim.address_line2 && <>, {claim.address_line2}</>}
                </div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <div style={labelStyle}>City, State, ZIP</div>
                <div style={valueStyle}>
                  {claim.city}, {claim.state} {claim.postal_code}
                </div>
              </div>
            </>
          )}

          {claim.lat && claim.lng ? (
            <div
              style={{
                height: "350px",
                borderRadius: "12px",
                overflow: "hidden",
                boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                marginBottom: "16px",
              }}
            >
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
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                background: "#2d3748",
                borderRadius: "8px",
                color: "#cbd5e1",
                fontSize: "16px",
                marginBottom: "16px",
              }}
            >
              No coordinates available
            </div>
          )}

          <button
            onClick={openInMaps}
            style={{
              width: "100%",
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "600",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#059669";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#10b981";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
            }}
          >
            🗺️ Open in Google Maps
          </button>
        </div>

        {/* Photos Section */}
        <div style={sectionStyle}>
          <h4 style={headerStyle}>📸 Photos ({photos.length})</h4>

          <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
            <label
              htmlFor="photo-upload"
              style={{
                flex: "1",
                minWidth: "200px",
                padding: "14px 24px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
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
                flex: "1",
                minWidth: "200px",
                padding: "14px 24px",
                background: "#10b981",
                color: "white",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "16px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#059669";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#10b981";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
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

            {photos.length > 0 && (
              <button
                onClick={downloadAllPhotos}
                style={{
                  flex: "1",
                  minWidth: "200px",
                  padding: "14px 24px",
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  color: "white",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "16px",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #d97706 0%, #b45309 100%)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                }}
              >
                📦 Download All Photos
              </button>
            )}
          </div>

          <p
            style={{
              fontSize: "15px",
              color: "#cbd5e1",
              marginBottom: "20px",
              padding: "12px",
              background: "#2d3748",
              borderRadius: "8px",
              borderLeft: "4px solid #667eea",
            }}
          >
            💡 Tip: Photos are automatically compressed and optimized for storage
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "16px",
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
            onClick={() => {
              setLightboxIndex(null);
              resetViewerState();
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => {
                setLightboxIndex(null);
                resetViewerState();
              }}
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
                zIndex: 10000,
              }}
            >
              ×
            </button>

            {/* Zoom Controls */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: 20,
                left: 20,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                zIndex: 10000,
              }}
            >
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 4}
                style={{
                  padding: "8px 16px",
                  background: zoom >= 4 ? "#4a5568" : "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 18,
                  fontWeight: "bold",
                  cursor: zoom >= 4 ? "not-allowed" : "pointer",
                  opacity: zoom >= 4 ? 0.5 : 1,
                }}
              >
                +
              </button>
              <div
                style={{
                  padding: "4px 8px",
                  background: "rgba(255,255,255,0.2)",
                  color: "white",
                  borderRadius: 4,
                  fontSize: 14,
                  textAlign: "center",
                  fontWeight: "bold",
                }}
              >
                {Math.round(zoom * 100)}%
              </div>
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                style={{
                  padding: "8px 16px",
                  background: zoom <= 1 ? "#4a5568" : "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 18,
                  fontWeight: "bold",
                  cursor: zoom <= 1 ? "not-allowed" : "pointer",
                  opacity: zoom <= 1 ? 0.5 : 1,
                }}
              >
                −
              </button>
            </div>

            {/* Rotation Controls */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                top: 20,
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                gap: 12,
                zIndex: 10000,
              }}
            >
              <button
                onClick={rotateLeft}
                style={{
                  padding: "10px 20px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ↺ Rotate Left
              </button>
              <button
                onClick={rotateRight}
                style={{
                  padding: "10px 20px",
                  background: "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 16,
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Rotate Right ↻
              </button>
            </div>

            <div
              style={{
                position: "relative",
                maxWidth: "90%",
                maxHeight: "80%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={
                  supabase.storage
                    .from("claim-photos")
                    .getPublicUrl(photos[lightboxIndex].storage_path).data
                    .publicUrl
                }
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  objectFit: "contain",
                  transform: `rotate(${rotation}deg) scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                  cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                  userSelect: "none",
                }}
                draggable={false}
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
                  resetViewerState();
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
                  resetViewerState();
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

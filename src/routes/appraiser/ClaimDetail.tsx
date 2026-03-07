import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import imageCompression from "browser-image-compression";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { getSupabaseAuthz } from "../../lib/supabaseAuthz";
import { getFirmColor } from "../../constants/firmColors";
import { calculateExpectedPayout } from "../../utils/firmFeeConfig";
import { getPayPeriod } from "../../utils/payoutForecasting";
import { useIsMobile } from "../../hooks/useIsMobile";
import MobileClaimDetail from "../../components/claims/MobileClaimDetail";
import { NavBar } from "../../components/NavBar";
import JSZip from "jszip";
import "./claim-detail.css";

export default function ClaimDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [claim, setClaim] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // Mobile breakpoint detection: <=600px shows MobileClaimDetail
  const isMobile = useIsMobile();

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
  const [editDateOfLoss, setEditDateOfLoss] = useState("");
  const [editInsuranceCompany, setEditInsuranceCompany] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAddressLine1, setEditAddressLine1] = useState("");
  const [editAddressLine2, setEditAddressLine2] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editZip, setEditZip] = useState("");
  const [editAppointmentStart, setEditAppointmentStart] = useState("");
  const [editAppointmentEnd, setEditAppointmentEnd] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editPayAmount, setEditPayAmount] = useState("");
  const [editFileTotal, setEditFileTotal] = useState("");
  const [editFirmName, setEditFirmName] = useState("");
  const [firms, setFirms] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("claims_v")
      .select(`
        id,
        claim_number,
        customer_name,
        customer_phone,
        email,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vin,
        date_of_loss,
        insurance_company,
        address_line1,
        address_line2,
        city,
        state,
        zip,
        notes,
        assigned_to,
        appointment_start,
        appointment_end,
        firm,
        pay_amount,
        file_total,
        status,
        lat,
        lng,
        created_at,
        updated_at
      `)
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

  const handlePhotoUpload = async (files: FileList) => {
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

    await load();
  };

  const handlePhotoInputChange = async (e: any) => {
    const files: FileList = e.target.files;
    if (!files || files.length === 0) return;
    await handlePhotoUpload(files);
    // Reset the input so the same files can be selected again if needed
    e.target.value = "";
  };

  const update = async (patch: any) => {
    if (!id) return;
    const { error } = await supabase.from("claims_v").update(patch).eq("id", id);
    if (error) alert(error.message);
    else await load();
  };

  const startEditing = () => {
    setEditCustomerName(claim?.customer_name || "");
    setEditPhone(claim?.customer_phone || "");
    setEditEmail(claim?.email || "");
    setEditVehicleYear(claim?.vehicle_year?.toString() || "");
    setEditVehicleMake(claim?.vehicle_make || "");
    setEditVehicleModel(claim?.vehicle_model || "");
    setEditVin(claim?.vin || "");
    setEditDateOfLoss(claim?.date_of_loss || "");
    setEditInsuranceCompany(claim?.insurance_company || "");
    setEditNotes(claim?.notes || "");
    setEditAddressLine1(claim?.address_line1 || "");
    setEditAddressLine2(claim?.address_line2 || "");
    setEditCity(claim?.city || "");
    setEditState(claim?.state || "");
    setEditZip(claim?.zip || "");
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
    setEditFirmName(claim?.firm || "");
    setIsEditing(true);
  };

  const saveEdits = async () => {
    const patch: any = {
      customer_name: editCustomerName,
      customer_phone: editPhone,
      email: editEmail,
      vehicle_make: editVehicleMake,
      vehicle_model: editVehicleModel,
      vin: editVin,
      date_of_loss: editDateOfLoss || null,
      insurance_company: editInsuranceCompany || null,
      notes: editNotes,
      address_line1: editAddressLine1,
      address_line2: editAddressLine2,
      city: editCity,
      state: editState,
      zip: editZip,
      assigned_to: editAssignedTo || null,
      firm: editFirmName || null,
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
      if (claim.firm) {
        try {
          const payPeriod = getPayPeriod(claim.firm, now);
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
    const { error } = await supabase.from("claims_v").delete().eq("id", id);

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

  // Calculate auth info for mobile view
  const authz = getSupabaseAuthz();
  const userInfo = authz?.getCurrentUser();
  const isAdmin = userInfo?.role === "admin";
  const fromCalendar = searchParams.get("from") === "calendar";
  const backLink = (isAdmin ? "/admin/claims" : "/my-claims") + (fromCalendar ? "?view=calendar" : "");

  // Handle status change for mobile view
  const handleStatusChange = async (status: string) => {
    if (status === "DELETE") {
      deleteClaim();
      return;
    }
    if (status === "CANCELED") {
      if (confirm("Cancel this claim? This will mark it as CANCELED and remove it from active claims.")) {
        update({ status: "CANCELED" });
      }
      return;
    }
    if (status === "COMPLETED") {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const completionDate = `${year}-${month}-${day}T00:00:00Z`;
      const completedMonth = `${year}-${month}`;

      let expectedPayoutDate = null;
      if (claim.firm) {
        try {
          const payPeriod = getPayPeriod(claim.firm, now);
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
      return;
    }
    update({ status });
  };

  // Mobile view: render MobileClaimDetail component
  if (isMobile) {
    return (
      <>
        <MobileClaimDetail
          claim={claim}
          photos={photos}
          users={users}
          isAdmin={isAdmin}
          isEditing={isEditing}
          backLink={backLink}
          onStartEditing={startEditing}
          onSaveEdits={saveEdits}
          onCancelEdits={cancelEdits}
          onStatusChange={handleStatusChange}
          onMarkComplete={markComplete}
          onPhotoClick={setLightboxIndex}
          onPhotoCapture={`/appraiser/claim/${id}/photos`}
          onPhoto={handlePhotoUpload}
        />

        {/* Lightbox Modal - shared between mobile and desktop */}
        {lightboxIndex !== null && (
          <div
            className="detail__lightbox detail__lightbox--mobile"
            onClick={() => {
              setLightboxIndex(null);
              resetViewerState();
            }}
          >
            <button
              className="detail__lightbox-close"
              onClick={() => {
                setLightboxIndex(null);
                resetViewerState();
              }}
            >
              ×
            </button>

            <div
              className="detail__lightbox-image-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                className="detail__lightbox-image"
                src={
                  supabase.storage
                    .from("claim-photos")
                    .getPublicUrl(photos[lightboxIndex].storage_path).data
                    .publicUrl
                }
              />
            </div>

            <div
              className="detail__lightbox-nav"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="detail__lightbox-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1
                  );
                }}
              >
                ← Prev
              </button>

              <span className="detail__lightbox-counter">
                {lightboxIndex + 1} / {photos.length}
              </span>

              <button
                className="detail__lightbox-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0
                  );
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop view: existing code below
  const openInMaps = () => {
    const q = encodeURIComponent(
      `${claim.address_line1} ${claim.city || ""} ${claim.state || ""} ${
        claim.zip || ""
      }`
    );
    window.open(`https://www.google.com/maps?q=${q}`, "_blank");
  };

  const statusClass =
    claim.status === "COMPLETED"
      ? "detail__status-badge--completed"
      : claim.status === "IN_PROGRESS"
      ? "detail__status-badge--progress"
      : claim.status === "SCHEDULED"
      ? "detail__status-badge--scheduled"
      : claim.status === "CANCELED"
      ? "detail__status-badge--canceled"
      : "detail__status-badge--default";

  const payoutBadgeClass =
    claim.payout_status === 'paid'
      ? "detail__payout-badge--paid"
      : claim.payout_status === 'overdue'
      ? "detail__payout-badge--overdue"
      : claim.payout_status === 'unpaid'
      ? "detail__payout-badge--unpaid"
      : "detail__payout-badge--default";

  return (
    <div className="detail">
      <div className="detail__inner">
        {/* Header Bar */}
        <div className="detail__header">
          <div>
            <h2 className="detail__header-title">
              Claim #{claim.claim_number}
            </h2>
            <p className="detail__header-subtitle">
              {claim.customer_name}
            </p>
          </div>
          <div className="detail__header-actions">
            {/* Guided Photo Capture Button */}
            <Link
              to={`/appraiser/claim/${id}/photos`}
              className="detail__btn detail__btn--photo-capture"
            >
              📷 Guided Photo Capture
            </Link>

            {(() => {
              const authz = getSupabaseAuthz();
              const userInfo = authz?.getCurrentUser();
              const isAdmin = userInfo?.role === "admin";
              const isArchived = claim.status === 'CANCELED';

              return isAdmin ? (
                !isEditing ? (
                  isArchived ? (
                    <div
                      className="detail__btn--disabled"
                      title="Editing is disabled for archived claims"
                    >
                      🔒 Archived - Edit Disabled
                    </div>
                  ) : (
                    <button
                      onClick={startEditing}
                      className="detail__btn detail__btn--edit"
                    >
                      ✏️ Edit Claim
                    </button>
                  )
                ) : (
                  <>
                    <button
                      onClick={saveEdits}
                      className="detail__btn detail__btn--save"
                    >
                      ✅ Save Changes
                    </button>
                    <button
                      onClick={cancelEdits}
                      className="detail__btn detail__btn--cancel"
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
                  className="detail__btn detail__btn--back"
                >
                  ← Back to {fromCalendar ? "Calendar" : "Claims"}
                </Link>
              );
            })()}
            <Link
              to="/"
              className="detail__btn detail__btn--back"
            >
              ← Home
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="detail__grid">
          {/* Payment Information - Admin Only */}
          {(() => {
            const authz = getSupabaseAuthz();
            const userInfo = authz?.getCurrentUser();
            const isAdmin = userInfo?.role === "admin";

            return isAdmin ? (
              <div className="detail__section">
                <h4 className="detail__section-title">💰 Payment Information</h4>
                <div className="detail__field">
                  <div className="detail__label">Pay Amount</div>
                  {isEditing ? (
                    <input
                      className="detail__input"
                      type="number"
                      step="0.01"
                      value={editPayAmount}
                      onChange={(e) => setEditPayAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  ) : claim.pay_amount ? (
                    <div className="detail__value">
                      ${claim.pay_amount.toFixed(2)}
                    </div>
                  ) : (claim.status === 'SCHEDULED' || claim.status === 'IN_PROGRESS') && claim.firm ? (
                    <div className="detail__value detail__value--amber">
                      ${calculateExpectedPayout(claim.firm, claim.pay_amount).toFixed(2)}
                      <span className="detail__estimated">(estimated)</span>
                    </div>
                  ) : (
                    <div className="detail__value detail__value--muted">Not set</div>
                  )}
                </div>
                <div className="detail__field">
                  <div className="detail__label">File Total</div>
                  {isEditing ? (
                    <input
                      className="detail__input"
                      type="number"
                      step="0.01"
                      value={editFileTotal}
                      onChange={(e) => setEditFileTotal(e.target.value)}
                      placeholder="Enter file total"
                    />
                  ) : claim.file_total ? (
                    <div className="detail__value">
                      ${claim.file_total.toFixed(2)}
                    </div>
                  ) : (
                    <div className="detail__value detail__value--muted">Not set</div>
                  )}
                </div>

                {/* Payout Tracking - Show only for completed claims */}
                {claim.status === 'COMPLETED' && (
                  <>
                    <div className="detail__payout-divider">
                      <h5 className="detail__payout-heading">
                        💳 Payout Tracking
                      </h5>

                      {/* Expected Payout Date */}
                      <div className="detail__field">
                        <div className="detail__label">Expected Payout Date</div>
                        <div className="detail__value">
                          {claim.expected_payout_date
                            ? new Date(claim.expected_payout_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : <span className="detail__value--muted">Not calculated</span>}
                        </div>
                      </div>

                      {/* Actual Payout Date */}
                      <div className="detail__field">
                        <div className="detail__label">Actual Payout Date</div>
                        <div className="detail__value">
                          {claim.actual_payout_date
                            ? new Date(claim.actual_payout_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : <span className="detail__value--muted">Payment not received</span>}
                        </div>
                      </div>

                      {/* Payout Status */}
                      <div className="detail__field">
                        <div className="detail__label">Payout Status</div>
                        <div className={`detail__payout-badge ${payoutBadgeClass}`}>
                          {claim.payout_status || 'not_applicable'}
                        </div>
                      </div>

                      {/* Mark as Paid Button */}
                      {claim.payout_status !== 'paid' && !claim.actual_payout_date && (
                        <button
                          className="detail__btn detail__btn--mark-paid"
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
          <div className="detail__section">
            <h4 className="detail__section-title">🏢 Firm</h4>
            <div className="detail__field">
              <div className="detail__label">Vendor</div>
              {isEditing ? (
                <select
                  className="detail__select"
                  value={editFirmName}
                  onChange={(e) => setEditFirmName(e.target.value)}
                >
                  <option value="">Select a firm...</option>
                  {firms.map((firm) => (
                    <option key={firm.id} value={firm.name}>
                      {firm.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="detail__firm-row">
                  <div
                    className="detail__firm-swatch"
                    style={{ background: getFirmColor(claim.firm) }}
                  />
                  <div className="detail__value">{claim.firm || "Not assigned"}</div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="detail__section">
            <h4 className="detail__section-title">👤 Customer Information</h4>
            <div className="detail__field">
              <div className="detail__label">Name</div>
              {isEditing ? (
                <input
                  className="detail__input"
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                />
              ) : (
                <div className="detail__value">{claim.customer_name}</div>
              )}
            </div>
            <div className="detail__field">
              <div className="detail__label">Phone</div>
              {isEditing ? (
                <input
                  className="detail__input"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Phone number"
                />
              ) : claim.customer_phone ? (
                <a
                  href={`tel:${claim.customer_phone}`}
                  className="detail__link"
                >
                  📞 {claim.customer_phone}
                </a>
              ) : (
                <div className="detail__value detail__value--muted">No phone</div>
              )}
            </div>
            <div className="detail__field">
              <div className="detail__label">Email</div>
              {isEditing ? (
                <input
                  className="detail__input"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email address"
                />
              ) : claim.email ? (
                <a
                  href={`mailto:${claim.email}`}
                  className="detail__link"
                >
                  ✉️ {claim.email}
                </a>
              ) : (
                <div className="detail__value detail__value--muted">No email</div>
              )}
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="detail__section">
            <h4 className="detail__section-title">🚗 Vehicle Information</h4>
            <div className="detail__field">
              <div className="detail__label">VIN</div>
              {isEditing ? (
                <input
                  className="detail__input detail__input--mono"
                  type="text"
                  value={editVin}
                  onChange={(e) => setEditVin(e.target.value)}
                  placeholder="Vehicle Identification Number"
                />
              ) : claim.vin ? (
                <div className="detail__value detail__value--mono">{claim.vin}</div>
              ) : (
                <div className="detail__value detail__value--muted">No VIN</div>
              )}
            </div>
            <div className="detail__grid--auto">
              <div>
                <div className="detail__label">Year</div>
                {isEditing ? (
                  <input
                    className="detail__input"
                    type="number"
                    value={editVehicleYear}
                    onChange={(e) => setEditVehicleYear(e.target.value)}
                    placeholder="Year"
                    min="1900"
                    max="2100"
                  />
                ) : claim.vehicle_year ? (
                  <div className="detail__value">{claim.vehicle_year}</div>
                ) : (
                  <div className="detail__value detail__value--muted">-</div>
                )}
              </div>
              <div>
                <div className="detail__label">Make</div>
                {isEditing ? (
                  <input
                    className="detail__input"
                    type="text"
                    value={editVehicleMake}
                    onChange={(e) => setEditVehicleMake(e.target.value)}
                    placeholder="Make"
                  />
                ) : claim.vehicle_make ? (
                  <div className="detail__value">{claim.vehicle_make}</div>
                ) : (
                  <div className="detail__value detail__value--muted">-</div>
                )}
              </div>
              <div>
                <div className="detail__label">Model</div>
                {isEditing ? (
                  <input
                    className="detail__input"
                    type="text"
                    value={editVehicleModel}
                    onChange={(e) => setEditVehicleModel(e.target.value)}
                    placeholder="Model"
                  />
                ) : claim.vehicle_model ? (
                  <div className="detail__value">{claim.vehicle_model}</div>
                ) : (
                  <div className="detail__value detail__value--muted">-</div>
                )}
              </div>
            </div>
            <div className="detail__grid--auto-lg">
              <div>
                <div className="detail__label">Date of Loss</div>
                {isEditing ? (
                  <input
                    className="detail__input"
                    type="date"
                    value={editDateOfLoss}
                    onChange={(e) => setEditDateOfLoss(e.target.value)}
                  />
                ) : claim.date_of_loss ? (
                  <div className="detail__value">{new Date(claim.date_of_loss).toLocaleDateString()}</div>
                ) : (
                  <div className="detail__value detail__value--muted">-</div>
                )}
              </div>
              <div>
                <div className="detail__label">Insurance Company</div>
                {isEditing ? (
                  <input
                    className="detail__input"
                    type="text"
                    value={editInsuranceCompany}
                    onChange={(e) => setEditInsuranceCompany(e.target.value)}
                    placeholder="Insurance Company"
                  />
                ) : claim.insurance_company ? (
                  <div className="detail__value">{claim.insurance_company}</div>
                ) : (
                  <div className="detail__value detail__value--muted">-</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Accident Description */}
        {(claim.notes || isEditing) && (
          <div className="detail__section detail__section--mb">
            <h4 className="detail__section-title">📋 Accident Description</h4>
            {isEditing ? (
              <textarea
                className="detail__textarea"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Enter accident description..."
              />
            ) : (
              <div className="detail__notes-box">
                {claim.notes || <span className="detail__value--muted">No description provided</span>}
              </div>
            )}
          </div>
        )}

        {/* Appointment and Assignment Section */}
        <div className="detail__grid">
          {/* Appointment */}
          <div className="detail__section">
            <h4 className="detail__section-title">📅 Appointment</h4>
            <div className="detail__field--lg">
              <div className="detail__label">Start Date & Time</div>
              {isEditing ? (
                <input
                  className="detail__input"
                  type="datetime-local"
                  value={editAppointmentStart}
                  onChange={(e) => setEditAppointmentStart(e.target.value)}
                />
              ) : claim.appointment_start ? (
                <div className="detail__value">
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
                <div className="detail__value detail__value--muted">No appointment set</div>
              )}
            </div>
            <div>
              <div className="detail__label">End Date & Time</div>
              {isEditing ? (
                <input
                  className="detail__input"
                  type="datetime-local"
                  value={editAppointmentEnd}
                  onChange={(e) => setEditAppointmentEnd(e.target.value)}
                />
              ) : claim.appointment_end ? (
                <div className="detail__value">
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
                <div className="detail__value detail__value--muted">No end time set</div>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="detail__section">
            <h4 className="detail__section-title">👥 Assignment</h4>
            <div className="detail__label">Assigned Appraiser</div>
            {isEditing ? (
              <select
                className="detail__select"
                value={editAssignedTo}
                onChange={(e) => setEditAssignedTo(e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name || u.user_id} ({u.role})
                  </option>
                ))}
              </select>
            ) : (
              <div className="detail__value">
                {claim.assigned_to
                  ? users.find(u => u.user_id === claim.assigned_to)?.full_name || "Unknown User"
                  : "Unassigned"}
              </div>
            )}
          </div>
        </div>

        {/* Status & Actions */}
        <div className="detail__section">
          <h4 className="detail__section-title">⚡ Status & Actions</h4>

          <div className="detail__field">
            <div className="detail__label">Current Status</div>
            <div className={`detail__status-badge ${statusClass}`}>
              {claim.status === "COMPLETED" && "✅"}
              {claim.status === "IN_PROGRESS" && "🔧"}
              {claim.status === "SCHEDULED" && "📅"}
              {claim.status === "CANCELED" && "❌"}
              {!claim.status && "📋"}
              {" "}{claim.status || "NOT_STARTED"}
            </div>
          </div>

          {/*
            ROLE GATING: Update Status - Admin only
            Appraisers must NOT see status change controls (view + photo capture only)
          */}
          {isAdmin && (
            <div className="detail__status-actions">
              <div className="detail__label">Update Status</div>
              <select
                className="detail__status-select"
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
                    if (claim.firm) {
                      try {
                        const payPeriod = getPayPeriod(claim.firm, now);
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
              >
                <option value="">Choose an action...</option>
                <option value="SCHEDULED">📅 Mark as Scheduled</option>
                <option value="IN_PROGRESS">🔧 In Progress</option>
                <option value="COMPLETED">✅ Mark as Complete</option>
                <option value="CANCELED">❌ Cancel Claim</option>
                <option value="DELETE">
                  🗑️ Permanently Delete Claim
                </option>
              </select>
              <p className="detail__status-hint">
                ⚠️ Permanent delete cannot be undone. All photos and data will be lost.
              </p>
            </div>
          )}
        </div>

        {/* Location & Map */}
        <div className="detail__section">
          <h4 className="detail__section-title">📍 Location</h4>

          {isEditing ? (
            <div className="detail__field--lg">
              <div className="detail__field">
                <div className="detail__label">Address Line 1</div>
                <input
                  className="detail__input"
                  type="text"
                  value={editAddressLine1}
                  onChange={(e) => setEditAddressLine1(e.target.value)}
                  placeholder="Street address"
                />
              </div>
              <div className="detail__field">
                <div className="detail__label">Address Line 2 (Optional)</div>
                <input
                  className="detail__input"
                  type="text"
                  value={editAddressLine2}
                  onChange={(e) => setEditAddressLine2(e.target.value)}
                  placeholder="Apt, suite, etc."
                />
              </div>
              <div className="detail__grid--auto">
                <div>
                  <div className="detail__label">City</div>
                  <input
                    className="detail__input"
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <div className="detail__label">State</div>
                  <input
                    className="detail__input"
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <div className="detail__label">ZIP</div>
                  <input
                    className="detail__input"
                    type="text"
                    value={editZip}
                    onChange={(e) => setEditZip(e.target.value)}
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="detail__field">
                <div className="detail__label">Street Address</div>
                <div className="detail__value">
                  {claim.address_line1}
                  {claim.address_line2 && <>, {claim.address_line2}</>}
                </div>
              </div>
              <div className="detail__field--lg">
                <div className="detail__label">City, State, ZIP</div>
                <div className="detail__value">
                  {claim.city}, {claim.state} {claim.zip}
                </div>
              </div>
            </>
          )}

          {claim.lat && claim.lng ? (
            <div className="detail__map-wrap">
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
            <div className="detail__map-empty">
              No coordinates available
            </div>
          )}

          <button
            className="detail__btn detail__btn--maps"
            onClick={openInMaps}
          >
            🗺️ Open in Google Maps
          </button>
        </div>

        {/* Photos Section */}
        <div className="detail__section">
          <h4 className="detail__section-title">📸 Photos ({photos.length})</h4>

          <div className="detail__photos-actions">
            <label
              htmlFor="photo-upload"
              className="detail__photo-label detail__photo-label--camera"
            >
              📷 Take Photo
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoInputChange}
              className="detail__file-input"
              multiple
            />

            <label
              htmlFor="photo-gallery"
              className="detail__photo-label detail__photo-label--gallery"
            >
              🖼️ Choose from Gallery
            </label>
            <input
              id="photo-gallery"
              type="file"
              accept="image/*"
              onChange={handlePhotoInputChange}
              className="detail__file-input"
              multiple
            />

            {photos.length > 0 && (
              <button
                onClick={downloadAllPhotos}
                className="detail__photo-btn-download"
              >
                📦 Download All Photos
              </button>
            )}
          </div>

          <p className="detail__photo-tip">
            💡 Tip: Photos are automatically compressed and optimized for storage
          </p>

          <div className="detail__photo-grid">
            {photos.map((p, index) => {
              const photoUrl = supabase.storage
                .from("claim-photos")
                .getPublicUrl(p.storage_path).data.publicUrl;

              return (
                <div key={p.id} className="detail__photo-item">
                  <div
                    onClick={() => setLightboxIndex(index)}
                    className="detail__photo-thumb"
                    style={{
                      backgroundImage: `url(${photoUrl})`,
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePhoto(p);
                      }}
                      className="detail__photo-delete"
                    >
                      ×
                    </button>
                  </div>
                  <a
                    href={photoUrl}
                    download={`claim-${claim?.claim_number}-photo-${p.id}.jpg`}
                    onClick={(e) => e.stopPropagation()}
                    className="detail__photo-download"
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
            className="detail__lightbox"
            onClick={() => {
              setLightboxIndex(null);
              resetViewerState();
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <button
              className="detail__lightbox-close"
              onClick={() => {
                setLightboxIndex(null);
                resetViewerState();
              }}
            >
              ×
            </button>

            {/* Zoom Controls */}
            <div
              className="detail__lightbox-zoom"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="detail__lightbox-zoom-btn"
                onClick={handleZoomIn}
                disabled={zoom >= 4}
              >
                +
              </button>
              <div className="detail__lightbox-zoom-level">
                {Math.round(zoom * 100)}%
              </div>
              <button
                className="detail__lightbox-zoom-btn"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
              >
                −
              </button>
            </div>

            {/* Rotation Controls */}
            <div
              className="detail__lightbox-rotate"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="detail__lightbox-rotate-btn"
                onClick={rotateLeft}
              >
                ↺ Rotate Left
              </button>
              <button
                className="detail__lightbox-rotate-btn"
                onClick={rotateRight}
              >
                Rotate Right ↻
              </button>
            </div>

            <div
              className="detail__lightbox-image-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                className="detail__lightbox-image"
                src={
                  supabase.storage
                    .from("claim-photos")
                    .getPublicUrl(photos[lightboxIndex].storage_path).data
                    .publicUrl
                }
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                  transition: isDragging ? "none" : "transform 0.2s ease-out",
                  cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                }}
                draggable={false}
              />
            </div>

            <div
              className="detail__lightbox-nav"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="detail__lightbox-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  resetViewerState();
                  setLightboxIndex(
                    lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1
                  );
                }}
              >
                ← Previous
              </button>

              <span className="detail__lightbox-counter">
                {lightboxIndex + 1} / {photos.length}
              </span>

              <button
                className="detail__lightbox-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  resetViewerState();
                  setLightboxIndex(
                    lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0
                  );
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
                className="detail__lightbox-download"
              >
                ⬇️ Download
              </a>

              <button
                className="detail__lightbox-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePhoto(photos[lightboxIndex]);
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

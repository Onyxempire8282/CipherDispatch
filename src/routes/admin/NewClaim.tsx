import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link, useNavigate } from "react-router-dom";
import { isHolidayISO, formatHolidayName } from "../../utils/holidays";
import { NavBar } from "../../components/NavBar";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import ActionFooter from "../../components/ui/ActionFooter";
import "leaflet/dist/leaflet.css";
import "./new-claim.css";

type Claim = {
  claim_number: string;
  customer_name: string;
  customer_phone?: string;
  email?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vin?: string;
  date_of_loss?: string;
  insurance_company?: string;
  address_line1: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string | null;
  notes?: string;
  assigned_to?: string | null;
  appointment_start?: string;
  appointment_end?: string;
  firm?: string;
  pay_amount?: number | null;
  status?: string;
};

const throttle = (() => {
  let last = 0;
  return async () => {
    const now = Date.now();
    const diff = now - last;
    if (diff < 1100) await new Promise((r) => setTimeout(r, 1100 - diff));
    last = Date.now();
  };
})();

async function geocode(fullAddr: string) {
  await throttle();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", fullAddr);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "en", "User-Agent": "auto-appraisal-mvp" },
  });
  const arr = await res.json();
  if (arr && arr[0])
    return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
  return { lat: null as any, lng: null as any };
}

function formatLocalDatetime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseDatetimeLocal(value: string): string {
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const localDate = new Date(year, month - 1, day, hour, minute, 0);
  return localDate.toISOString();
}

export default function NewClaim() {
  const [form, setForm] = useState<Claim>({
    claim_number: "",
    customer_name: "",
    address_line1: "",
    status: "IN_PROGRESS",
  });
  const [users, setUsers] = useState<any[]>([]);
  const [firms, setFirms] = useState<any[]>([]);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, role");
      setUsers(data || []);
    })();
    (async () => {
      const { data } = await supabase
        .from("vendors")
        .select("id, name, pay_amount")
        .eq("active", true)
        .order("name");
      setFirms(data || []);
    })();
  }, []);

  const previewMap = async () => {
    const full = `${form.address_line1} ${form.address_line2 || ""} ${form.city || ""} ${form.state || ""} ${form.zip || ""}`.trim();
    if (!full) return alert("Please enter an address first");
    setLoadingMap(true);
    const coords = await geocode(full);
    setLoadingMap(false);
    if (coords.lat && coords.lng) {
      setMapCoords(coords);
    } else {
      alert("Could not geocode address. Please verify it is correct.");
    }
  };

  const save = async (override = false) => {
    if (!form.claim_number) return alert("Please enter a Claim Number");
    if (!form.customer_name) return alert("Please enter a Customer Name");
    if (!form.address_line1) return alert("Please enter an Address");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("You must be logged in to create a claim");

    const inspectionAddress = [form.address_line1, form.city, form.state].filter(Boolean).join(", ");

    const claimPayload = {
      firm: form.insurance_company || null,
      claim_number: form.claim_number,
      file_number: null as string | null,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone || null,
      vehicle_make: form.vehicle_make || null,
      vehicle_model: form.vehicle_model || null,
      vehicle_year: form.vehicle_year || null,
      vin: form.vin || null,
      inspection_address: inspectionAddress || null,
      location_name: null as string | null,
      location_phone: null as string | null,
      zip: form.zip || null,
      scheduled_at: form.appointment_start || null,
      notes: form.notes || null,
      owner_id: user.id,
    };

    if (override) {
      const { error } = await supabase
        .from("claims")
        .update(claimPayload)
        .eq("claim_number", form.claim_number);
      if (error) {
        alert(`Error updating claim: ${error.message}`);
      } else {
        alert("Claim updated successfully!");
        nav("/admin/claims");
      }
      return;
    }

    const { error } = await supabase.rpc('create_claim', {
      p_owner_id: claimPayload.owner_id,
      p_firm: claimPayload.firm,
      p_claim_number: claimPayload.claim_number,
      p_file_number: claimPayload.file_number,
      p_customer_name: claimPayload.customer_name,
      p_customer_phone: claimPayload.customer_phone,
      p_vehicle_make: claimPayload.vehicle_make,
      p_vehicle_model: claimPayload.vehicle_model,
      p_vehicle_year: claimPayload.vehicle_year,
      p_vin: claimPayload.vin,
      p_inspection_address: claimPayload.inspection_address,
      p_zip: claimPayload.zip,
      p_scheduled_at: claimPayload.scheduled_at,
      p_notes: claimPayload.notes
    });

    if (error) {
      if (error.code === "23505") {
        const shouldOverride = confirm(
          `A claim with the number "${form.claim_number}" already exists!\n\nClick OK to UPDATE the existing claim.\nClick Cancel to go back.`
        );
        if (shouldOverride) save(true);
      } else {
        alert(`Error: ${error.message}`);
      }
    } else {
      alert("Claim saved successfully!");
      nav("/admin/claims");
    }
  };

  const startHoliday = form.appointment_start ? isHolidayISO(form.appointment_start) : null;
  const endHoliday = form.appointment_end ? isHolidayISO(form.appointment_end) : null;

  return (
    <div>
      <NavBar role="admin" />
      <PageHeader
        label="New Claim"
        title="Create Claim"
        sub="Fill in all required fields before saving"
        compact
      />

      <div className="new-claim__wrap">

        {/* CLAIM INFORMATION */}
        <div className="new-claim__section new-claim__section--accent">
          <div className="new-claim__section-header">
            <div className="new-claim__section-title">Claim Information</div>
            <div className="new-claim__section-line" />
          </div>
          <div className="new-claim__section-body">
            <div className="new-claim__grid-2">
              <Field label="Claim #">
                <input
                  className="field__input"
                  type="text"
                  placeholder="Claim number"
                  value={form.claim_number}
                  onChange={(e) => setForm({ ...form, claim_number: e.target.value })}
                />
              </Field>
              <Field label="Customer Name">
                <input
                  className="field__input"
                  type="text"
                  placeholder="Full name"
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input
                  className="field__input"
                  type="tel"
                  placeholder="(000) 000-0000"
                  value={form.customer_phone || ""}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                />
              </Field>
              <Field label="Email">
                <input
                  className="field__input"
                  type="email"
                  placeholder="customer@email.com"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* VEHICLE INFORMATION */}
        <div className="new-claim__section">
          <div className="new-claim__section-header">
            <div className="new-claim__section-title">Vehicle Information</div>
            <div className="new-claim__section-line" />
          </div>
          <div className="new-claim__section-body">
            <Field label="VIN">
              <input
                className="field__input"
                type="text"
                placeholder="17-character VIN"
                value={form.vin || ""}
                onChange={(e) => setForm({ ...form, vin: e.target.value })}
              />
            </Field>
            <div className="new-claim__grid-3">
              <Field label="Year">
                <input
                  className="field__input"
                  type="number"
                  placeholder="YYYY"
                  value={form.vehicle_year || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      vehicle_year: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
              </Field>
              <Field label="Make">
                <input
                  className="field__input"
                  type="text"
                  placeholder="Ford"
                  value={form.vehicle_make || ""}
                  onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })}
                />
              </Field>
              <Field label="Model">
                <input
                  className="field__input"
                  type="text"
                  placeholder="F-150"
                  value={form.vehicle_model || ""}
                  onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
                />
              </Field>
            </div>
            <div className="new-claim__grid-2">
              <Field label="Date of Loss">
                <input
                  className="field__input"
                  type="date"
                  value={form.date_of_loss || ""}
                  onChange={(e) => setForm({ ...form, date_of_loss: e.target.value })}
                />
              </Field>
              <Field label="Insurance Company">
                <input
                  className="field__input"
                  type="text"
                  placeholder="Carrier name"
                  value={form.insurance_company || ""}
                  onChange={(e) => setForm({ ...form, insurance_company: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* ACCIDENT & LOCATION */}
        <div className="new-claim__section">
          <div className="new-claim__section-header">
            <div className="new-claim__section-title">Accident & Location</div>
            <div className="new-claim__section-line" />
          </div>
          <div className="new-claim__section-body">
            <Field label="Accident Description">
              <textarea
                className="field__textarea"
                placeholder="Describe the accident and damage..."
                value={form.notes || ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <Field label="Address Line 1">
              <input
                className="field__input"
                type="text"
                placeholder="Street address"
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
              />
            </Field>
            <Field label="Address Line 2" optional>
              <input
                className="field__input"
                type="text"
                placeholder="Suite, unit, etc."
                value={form.address_line2 || ""}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
              />
            </Field>
            <div className="new-claim__grid-3">
              <Field label="City">
                <input
                  className="field__input"
                  type="text"
                  placeholder="City"
                  value={form.city || ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </Field>
              <Field label="State">
                <input
                  className="field__input"
                  type="text"
                  placeholder="NC"
                  value={form.state || ""}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </Field>
              <Field label="ZIP">
                <input
                  className="field__input"
                  type="text"
                  placeholder="00000"
                  value={form.zip || ""}
                  onChange={(e) => setForm({ ...form, zip: e.target.value })}
                />
              </Field>
            </div>
            <button
              className="new-claim__map-btn"
              onClick={previewMap}
              disabled={loadingMap}
            >
              {loadingMap ? "Loading map..." : "Preview Map Location"}
            </button>
            {mapCoords && (
              <div className="new-claim__map">
                <MapContainer
                  center={[mapCoords.lat, mapCoords.lng]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  <Marker position={[mapCoords.lat, mapCoords.lng]}>
                    <Popup>Claim Location</Popup>
                  </Marker>
                </MapContainer>
              </div>
            )}
          </div>
        </div>

        {/* SCHEDULING & ASSIGNMENT */}
        <div className="new-claim__section">
          <div className="new-claim__section-header">
            <div className="new-claim__section-title">Scheduling & Assignment</div>
            <div className="new-claim__section-line" />
          </div>
          <div className="new-claim__section-body">
            <Field label="Status">
              <div className="field__select-wrap">
                <select
                  className="field__select"
                  value={form.status || "IN_PROGRESS"}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="IN_PROGRESS">In Progress (Not Scheduled Yet)</option>
                  <option value="SCHEDULED">Scheduled</option>
                </select>
                <div className="field__select-arrow">&#x25BE;</div>
              </div>
            </Field>
            <div className="new-claim__grid-2">
              <Field label="Appointment Start" optional={form.status === "IN_PROGRESS"}>
                <input
                  className="field__input"
                  type="datetime-local"
                  value={formatLocalDatetime(form.appointment_start)}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setForm({ ...form, appointment_start: undefined });
                      return;
                    }
                    setForm({ ...form, appointment_start: parseDatetimeLocal(e.target.value) });
                  }}
                />
              </Field>
              <Field label="Appointment End" optional={form.status === "IN_PROGRESS"}>
                <input
                  className="field__input"
                  type="datetime-local"
                  value={formatLocalDatetime(form.appointment_end)}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setForm({ ...form, appointment_end: undefined });
                      return;
                    }
                    setForm({ ...form, appointment_end: parseDatetimeLocal(e.target.value) });
                  }}
                />
              </Field>
            </div>
            {startHoliday && (
              <div className="new-claim__holiday-warning">
                Warning: Start date is on {formatHolidayName(startHoliday)} (Federal Holiday)
              </div>
            )}
            {endHoliday && (
              <div className="new-claim__holiday-warning">
                Warning: End date is on {formatHolidayName(endHoliday)} (Federal Holiday)
              </div>
            )}
            <div className="new-claim__grid-2">
              <Field label="Firm">
                <div className="field__select-wrap">
                  <select
                    className="field__select"
                    value={form.firm || ""}
                    onChange={(e) => {
                      const selectedFirmName = e.target.value || undefined;
                      const selectedFirm = firms.find((f) => f.name === selectedFirmName);
                      setForm({
                        ...form,
                        firm: selectedFirmName,
                        pay_amount: selectedFirm?.pay_amount || null,
                      });
                    }}
                  >
                    <option value="">No Firm</option>
                    {firms.map((firm) => (
                      <option key={firm.id} value={firm.name}>
                        {firm.name}
                      </option>
                    ))}
                  </select>
                  <div className="field__select-arrow">&#x25BE;</div>
                </div>
              </Field>
              <Field label="Pay Amount">
                <input
                  className="field__input"
                  type="number"
                  step="0.01"
                  placeholder="$0.00"
                  value={form.pay_amount || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pay_amount: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Assignment">
              <div className="field__select-wrap">
                <select
                  className="field__select"
                  value={form.assigned_to || ""}
                  onChange={(e) => setForm({ ...form, assigned_to: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {users?.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name || u.user_id} ({u.role})
                    </option>
                  ))}
                </select>
                <div className="field__select-arrow">&#x25BE;</div>
              </div>
            </Field>
          </div>
        </div>
      </div>

      <ActionFooter title="New Claim — Unsaved" sub="Fill all required fields before saving">
        <Link to="/admin/claims" className="btn btn--ghost btn--sm">Cancel</Link>
        <button className="btn btn--primary btn--sm" onClick={() => save(false)}>
          Save Claim →
        </button>
      </ActionFooter>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link, useNavigate } from "react-router-dom";
import { FIRM_COLORS } from "../../constants/firmColors";
import { isHolidayISO, formatHolidayName } from "../../utils/holidays";
import "leaflet/dist/leaflet.css";

type Claim = {
  claim_number: string;
  customer_name: string;
  phone?: string;
  email?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  vin?: string;
  address_line1: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  notes?: string;
  assigned_to?: string | null;
  appointment_start?: string;
  appointment_end?: string;
  firm_name?: string;
  pay_amount?: number | null;
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

export default function NewClaim() {
  const inputStyle = {
    padding: 12,
    fontSize: 16,
    border: "1px solid #4a5568",
    borderRadius: 6,
    background: "#2d3748",
    color: "#e2e8f0",
  };

  const [form, setForm] = useState<Claim>({
    claim_number: "",
    customer_name: "",
    address_line1: "",
  });
  const [users, setUsers] = useState<any[]>([]);
  const [firms, setFirms] = useState<any[]>([]);
  const [mapCoords, setMapCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
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
    const full = `${form.address_line1} ${form.address_line2 || ""} ${
      form.city || ""
    } ${form.state || ""} ${form.postal_code || ""}`.trim();
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
    // Validate required fields
    if (!form.claim_number) {
      alert("Please enter a Claim Number");
      return;
    }
    if (!form.customer_name) {
      alert("Please enter a Customer Name");
      return;
    }
    if (!form.address_line1) {
      alert("Please enter an Address");
      return;
    }

    const full = `${form.address_line1} ${form.address_line2 || ""} ${
      form.city || ""
    } ${form.state || ""} ${form.postal_code || ""}`.trim();
    let coords = { lat: null as any, lng: null as any };
    if (full) coords = await geocode(full);

    if (override) {
      // Update existing claim
      const { error } = await supabase
        .from("claims")
        .update({ ...form, ...coords })
        .eq("claim_number", form.claim_number);

      if (error) {
        alert(`Error updating claim: ${error.message}`);
      } else {
        alert("✅ Claim updated successfully!");
        nav("/admin/claims");
      }
      return;
    }

    // Try to insert new claim
    const { error } = await supabase
      .from("claims")
      .insert([{ ...form, ...coords, status: "SCHEDULED" }]);

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation - ask if user wants to override
        const shouldOverride = confirm(
          `⚠️ A claim with the number "${form.claim_number}" already exists!\n\n` +
            `Click OK to UPDATE the existing claim with this new data.\n` +
            `Click Cancel to go back and change the claim number.`
        );

        if (shouldOverride) {
          save(true); // Recursive call with override flag
        }
      } else {
        alert(`Error: ${error.message}`);
      }
    } else {
      alert("✅ Claim saved successfully!");
      nav("/admin/claims");
    }
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
          maxWidth: 800,
          margin: "0 auto",
          display: "grid",
          gap: 8,
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
          <h3 style={{ margin: 0, color: "#e2e8f0" }}>New Claim</h3>
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
                background: "#4a5568",
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

        <h4 style={{ color: "#e2e8f0", marginTop: 16 }}>Claim Information</h4>
        <input
          placeholder="Claim #"
          value={form.claim_number}
          onChange={(e) => setForm({ ...form, claim_number: e.target.value })}
          style={{
            padding: 12,
            fontSize: 16,
            border: "1px solid #4a5568",
            borderRadius: 6,
            background: "#2d3748",
            color: "#e2e8f0",
          }}
        />
        <input
          placeholder="Customer name"
          value={form.customer_name}
          onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Phone"
          value={form.phone || ""}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Email"
          value={form.email || ""}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={inputStyle}
        />

        <h4 style={{ color: "#e2e8f0", marginTop: 16 }}>Vehicle Information</h4>
        <input
          placeholder="VIN"
          value={form.vin || ""}
          onChange={(e) => setForm({ ...form, vin: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Year"
          type="number"
          value={form.vehicle_year || ""}
          onChange={(e) =>
            setForm({
              ...form,
              vehicle_year: e.target.value
                ? parseInt(e.target.value)
                : undefined,
            })
          }
          style={inputStyle}
        />
        <input
          placeholder="Make"
          value={form.vehicle_make || ""}
          onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Model"
          value={form.vehicle_model || ""}
          onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
          style={inputStyle}
        />

        <h4 style={{ color: "#e2e8f0", marginTop: 16 }}>
          Accident Description
        </h4>
        <textarea
          placeholder="Describe the accident and damage..."
          value={form.notes || ""}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={4}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
        />

        <h4 style={{ color: "#e2e8f0", marginTop: 16 }}>Location</h4>
        <input
          placeholder="Address line 1"
          value={form.address_line1}
          onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Address line 2 (optional)"
          value={form.address_line2 || ""}
          onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="City"
          value={form.city || ""}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="State"
          value={form.state || ""}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Postal code"
          value={form.postal_code || ""}
          onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
          style={inputStyle}
        />

        <button
          onClick={previewMap}
          disabled={loadingMap}
          style={{
            padding: 12,
            fontSize: 16,
            fontWeight: "bold",
            background: loadingMap ? "#4a5568" : "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: loadingMap ? "not-allowed" : "pointer",
          }}
        >
          {loadingMap ? "Loading map..." : "Preview Map Location"}
        </button>

        {mapCoords && (
          <div style={{ height: 300, marginTop: 8 }}>
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

        <h4 style={{ color: "#e2e8f0", marginTop: 16 }}>
          Appointment Schedule
        </h4>
        <div style={{ display: "grid", gap: 8 }}>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontWeight: "bold",
                color: "#e2e8f0",
              }}
            >
              Appointment Start (Date & Time)
            </label>
            <input
              type="datetime-local"
              value={
                form.appointment_start
                  ? (() => {
                      const d = new Date(form.appointment_start);
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      const hours = String(d.getHours()).padStart(2, "0");
                      const minutes = String(d.getMinutes()).padStart(2, "0");
                      return `${year}-${month}-${day}T${hours}:${minutes}`;
                    })()
                  : ""
              }
              onChange={(e) => {
                if (!e.target.value) {
                  setForm({ ...form, appointment_start: undefined });
                  return;
                }
                const [datePart, timePart] = e.target.value.split("T");
                const [year, month, day] = datePart.split("-").map(Number);
                const [hour, minute] = timePart.split(":").map(Number);
                const localDate = new Date(year, month - 1, day, hour, minute, 0);
                setForm({ ...form, appointment_start: localDate.toISOString() });
              }}
              style={inputStyle}
            />
            {form.appointment_start && (() => {
              const holiday = isHolidayISO(form.appointment_start);
              if (holiday) {
                return (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 12,
                      background: "#f59e0b",
                      border: "2px solid #d97706",
                      borderRadius: 6,
                      color: "#1a202c",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <span>
                      Warning: This appointment is scheduled on {formatHolidayName(holiday)} (Federal Holiday)
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontWeight: "bold",
                color: "#e2e8f0",
              }}
            >
              Appointment End (Date & Time)
            </label>
            <input
              type="datetime-local"
              value={
                form.appointment_end
                  ? (() => {
                      const d = new Date(form.appointment_end);
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, "0");
                      const day = String(d.getDate()).padStart(2, "0");
                      const hours = String(d.getHours()).padStart(2, "0");
                      const minutes = String(d.getMinutes()).padStart(2, "0");
                      return `${year}-${month}-${day}T${hours}:${minutes}`;
                    })()
                  : ""
              }
              onChange={(e) => {
                if (!e.target.value) {
                  setForm({ ...form, appointment_end: undefined });
                  return;
                }
                const [datePart, timePart] = e.target.value.split("T");
                const [year, month, day] = datePart.split("-").map(Number);
                const [hour, minute] = timePart.split(":").map(Number);
                const localDate = new Date(year, month - 1, day, hour, minute, 0);
                setForm({ ...form, appointment_end: localDate.toISOString() });
              }}
              style={inputStyle}
            />
            {form.appointment_end && (() => {
              const holiday = isHolidayISO(form.appointment_end);
              if (holiday) {
                return (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 12,
                      background: "#f59e0b",
                      border: "2px solid #d97706",
                      borderRadius: 6,
                      color: "#1a202c",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 20 }}>⚠️</span>
                    <span>
                      Warning: This appointment is scheduled on {formatHolidayName(holiday)} (Federal Holiday)
                    </span>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        <h4 style={{ color: "#e2e8f0", marginTop: 16 }}>Firm</h4>
        <select
          value={form.firm_name || ""}
          onChange={(e) => {
            const selectedFirmName = e.target.value || undefined;
            const selectedFirm = firms.find(f => f.name === selectedFirmName);
            setForm({
              ...form,
              firm_name: selectedFirmName,
              pay_amount: selectedFirm?.pay_amount || null
            });
          }}
          style={{
            padding: 12,
            fontSize: 16,
            border: "1px solid #4a5568",
            borderRadius: 6,
            background: "#2d3748",
            color: "#e2e8f0",
          }}
        >
          <option value="">No Firm</option>
          {firms.map((firm) => (
            <option key={firm.id} value={firm.name}>
              {firm.name}
            </option>
          ))}
        </select>

        <h4 style={{ color: "#e2e8f0", marginTop: 16 }}>Pay Amount</h4>
        <input
          type="number"
          step="0.01"
          placeholder="Pay amount"
          value={form.pay_amount || ""}
          onChange={(e) => {
            const value = e.target.value;
            setForm({
              ...form,
              pay_amount: value ? parseFloat(value) : null
            });
          }}
          style={{
            padding: 12,
            fontSize: 16,
            border: "1px solid #4a5568",
            borderRadius: 6,
            background: "#2d3748",
            color: "#e2e8f0",
          }}
        />

        <h4 style={{ color: "#e2e8f0", marginTop: 16 }}>Assignment</h4>
        <select
          value={form.assigned_to || ""}
          onChange={(e) =>
            setForm({ ...form, assigned_to: e.target.value || null })
          }
          style={{
            padding: 12,
            fontSize: 16,
            border: "1px solid #4a5568",
            borderRadius: 6,
            background: "#2d3748",
            color: "#e2e8f0",
          }}
        >
          <option value="">Unassigned</option>
          {users?.map((u) => (
            <option key={u.user_id} value={u.user_id}>
              {u.full_name || u.user_id} ({u.role})
            </option>
          ))}
        </select>

        <button
          onClick={() => save(false)}
          style={{
            marginTop: 16,
            padding: 12,
            fontSize: 16,
            fontWeight: "bold",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Save Claim
        </button>
      </div>
    </div>
  );
}

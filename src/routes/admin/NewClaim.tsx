import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link, useNavigate } from "react-router-dom";
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
  const [form, setForm] = useState<Claim>({
    claim_number: "",
    customer_name: "",
    address_line1: "",
  });
  const [users, setUsers] = useState<any[]>([]);
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
    <div style={{ padding: 16, display: "grid", gap: 8, maxWidth: 800 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h3 style={{ margin: 0 }}>New Claim</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            to="/admin/claims"
            style={{
              padding: "8px 16px",
              background: "#6c757d",
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

      <h4>Claim Information</h4>
      <input
        placeholder="Claim #"
        value={form.claim_number}
        onChange={(e) => setForm({ ...form, claim_number: e.target.value })}
      />
      <input
        placeholder="Customer name"
        value={form.customer_name}
        onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
      />
      <input
        placeholder="Phone"
        value={form.phone || ""}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
      />
      <input
        placeholder="Email"
        value={form.email || ""}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <h4>Vehicle Information</h4>
      <input
        placeholder="VIN"
        value={form.vin || ""}
        onChange={(e) => setForm({ ...form, vin: e.target.value })}
      />
      <input
        placeholder="Year"
        type="number"
        value={form.vehicle_year || ""}
        onChange={(e) =>
          setForm({
            ...form,
            vehicle_year: e.target.value ? parseInt(e.target.value) : undefined,
          })
        }
      />
      <input
        placeholder="Make"
        value={form.vehicle_make || ""}
        onChange={(e) => setForm({ ...form, vehicle_make: e.target.value })}
      />
      <input
        placeholder="Model"
        value={form.vehicle_model || ""}
        onChange={(e) => setForm({ ...form, vehicle_model: e.target.value })}
      />

      <h4>Accident Description</h4>
      <textarea
        placeholder="Describe the accident and damage..."
        value={form.notes || ""}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        rows={4}
        style={{ resize: "vertical" }}
      />

      <h4>Location</h4>
      <input
        placeholder="Address line 1"
        value={form.address_line1}
        onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
      />
      <input
        placeholder="Address line 2 (optional)"
        value={form.address_line2 || ""}
        onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
      />
      <input
        placeholder="City"
        value={form.city || ""}
        onChange={(e) => setForm({ ...form, city: e.target.value })}
      />
      <input
        placeholder="State"
        value={form.state || ""}
        onChange={(e) => setForm({ ...form, state: e.target.value })}
      />
      <input
        placeholder="Postal code"
        value={form.postal_code || ""}
        onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
      />

      <button onClick={previewMap} disabled={loadingMap}>
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

      <h4>Appointment Schedule</h4>
      <div style={{ display: "grid", gap: 8 }}>
        <div>
          <label
            style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}
          >
            Appointment Start (Date & Time)
          </label>
          <input
            type="datetime-local"
            value={form.appointment_start?.slice(0, 16) || ""}
            onChange={(e) =>
              setForm({
                ...form,
                appointment_start: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              })
            }
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div>
          <label
            style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}
          >
            Appointment End (Date & Time)
          </label>
          <input
            type="datetime-local"
            value={form.appointment_end?.slice(0, 16) || ""}
            onChange={(e) =>
              setForm({
                ...form,
                appointment_end: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : undefined,
              })
            }
            style={{ width: "100%", padding: 8 }}
          />
        </div>
      </div>

      <h4>Assignment</h4>
      <select
        value={form.assigned_to || ""}
        onChange={(e) =>
          setForm({ ...form, assigned_to: e.target.value || null })
        }
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
        style={{ marginTop: 16, padding: 12, fontSize: 16, fontWeight: "bold" }}
      >
        Save Claim
      </button>
    </div>
  );
}

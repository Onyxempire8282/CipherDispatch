import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";
import { PayCycleType } from "../../utils/payoutCalculations";

type Vendor = {
  id: string;
  name: string;
  color: string;
  pay_cycle_type?: PayCycleType;
  reference_pay_date?: string;
  active?: boolean;
  created_at?: string;
};

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authzInitialized, setAuthzInitialized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("#9CA3AF");
  const [formPayCycleType, setFormPayCycleType] = useState<PayCycleType>('weekly_thu_fri_thu');
  const [formReferencePayDate, setFormReferencePayDate] = useState("");
  const [formActive, setFormActive] = useState(true);

  const initializeAuth = async () => {
    try {
      console.log("Initializing authorization for Vendors component...");
      await initializeSupabaseAuthz(supabase);
      setAuthzInitialized(true);
      console.log("Authorization initialized successfully");
    } catch (err: any) {
      console.error("Authorization initialization failed:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    if (!authzInitialized) {
      console.log("Authorization not ready, skipping load");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const authz = getSupabaseAuthz();
      if (!authz || !authz.isInitialized) {
        throw new Error("Authorization not properly initialized");
      }

      const userInfo = authz.getCurrentUser();
      console.log(`Loading vendors for ${userInfo?.role}: ${userInfo?.fullName}`);

      // Check if vendors table exists, if not, we'll handle it gracefully
      const { data, error: queryError } = await supabase
        .from("vendors")
        .select("*")
        .order("name", { ascending: true });

      if (queryError) {
        console.error("Error loading vendors:", queryError);
        throw new Error(queryError.message);
      }

      console.log(`Loaded ${data?.length || 0} vendors`);
      setVendors(data || []);
    } catch (err: any) {
      console.error("Error in loadVendors function:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (authzInitialized) {
      loadVendors();
    }
  }, [authzInitialized]);

  const handleAdd = () => {
    setIsEditing(true);
    setEditingVendor(null);
    setFormName("");
    setFormColor("#9CA3AF");
    setFormPayCycleType('weekly_thu_fri_thu');
    setFormReferencePayDate("");
    setFormActive(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setIsEditing(true);
    setEditingVendor(vendor);
    setFormName(vendor.name);
    setFormColor(vendor.color);
    setFormPayCycleType(vendor.pay_cycle_type || 'weekly_thu_fri_thu');
    setFormReferencePayDate(vendor.reference_pay_date || "");
    setFormActive(vendor.active !== false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingVendor(null);
    setFormName("");
    setFormColor("#9CA3AF");
    setFormPayCycleType('weekly_thu_fri_thu');
    setFormReferencePayDate("");
    setFormActive(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert("Vendor name is required");
      return;
    }

    // Validate reference date for bi-weekly cycles
    if (formPayCycleType.startsWith('biweekly') && !formReferencePayDate) {
      alert("Reference pay date is required for bi-weekly pay cycles");
      return;
    }

    try {
      const vendorData = {
        name: formName.trim(),
        color: formColor,
        pay_cycle_type: formPayCycleType,
        reference_pay_date: formReferencePayDate || null,
        active: formActive
      };

      if (editingVendor) {
        // Update existing vendor
        const { error } = await supabase
          .from("vendors")
          .update(vendorData)
          .eq("id", editingVendor.id);

        if (error) throw error;
      } else {
        // Add new vendor
        const { error } = await supabase
          .from("vendors")
          .insert([vendorData]);

        if (error) throw error;
      }

      handleCancel();
      loadVendors();
    } catch (err: any) {
      alert(`Error saving vendor: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vendor?")) {
      return;
    }

    try {
      const { error } = await supabase.from("vendors").delete().eq("id", id);

      if (error) throw error;

      loadVendors();
    } catch (err: any) {
      alert(`Error deleting vendor: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#e2e8f0", fontSize: "18px" }}>
          Loading vendors...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "#ef4444",
            fontSize: "18px",
            textAlign: "center",
            background: "#2d3748",
            padding: "24px",
            borderRadius: "8px",
            border: "2px solid #ef4444",
          }}
        >
          <h3>Unable to load vendors</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "6px",
              cursor: "pointer",
              marginTop: "12px",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        padding: 16,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/"
            style={{
              padding: "8px 16px",
              background: "#4a5568",
              color: "white",
              textDecoration: "none",
              borderRadius: 4,
              fontWeight: "bold",
              fontSize: "15px",
            }}
          >
            ← Home
          </Link>
          <h3
            style={{
              margin: 0,
              color: "#e2e8f0",
              fontSize: "22px",
              fontWeight: "bold",
            }}
          >
            Manage Vendors
          </h3>
        </div>
        <button
          onClick={handleAdd}
          style={{
            padding: "10px 20px",
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: 6,
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          + Add Vendor
        </button>
      </div>

      {/* Add/Edit Form Modal */}
      {isEditing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCancel}
        >
          <div
            style={{
              background: "#2d3748",
              border: "1px solid #4a5568",
              borderRadius: 12,
              padding: 32,
              maxWidth: 500,
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 24px 0", color: "#e2e8f0" }}>
              {editingVendor ? "Edit Vendor" : "Add New Vendor"}
            </h3>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#e2e8f0",
                  fontWeight: "bold",
                }}
              >
                Vendor Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enter vendor name"
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#1a202c",
                  border: "1px solid #4a5568",
                  borderRadius: 6,
                  color: "#e2e8f0",
                  fontSize: "15px",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#e2e8f0",
                  fontWeight: "bold",
                }}
              >
                Color
              </label>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  style={{
                    width: 60,
                    height: 40,
                    border: "1px solid #4a5568",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                />
                <input
                  type="text"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  placeholder="#9CA3AF"
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "#1a202c",
                    border: "1px solid #4a5568",
                    borderRadius: 6,
                    color: "#e2e8f0",
                    fontSize: "15px",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#e2e8f0",
                  fontWeight: "bold",
                }}
              >
                Pay Cycle Type
              </label>
              <select
                value={formPayCycleType}
                onChange={(e) => setFormPayCycleType(e.target.value as PayCycleType)}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#1a202c",
                  border: "1px solid #4a5568",
                  borderRadius: 6,
                  color: "#e2e8f0",
                  fontSize: "15px",
                }}
              >
                <option value="weekly_thu_fri_thu">Weekly Thu (Fri→Thu work, paid Thu)</option>
                <option value="biweekly_thu_fri_thu">Bi-weekly Wed (2-week period, paid Wed)</option>
                <option value="biweekly_fri_sat_fri">Bi-weekly Thu (2-week period, paid Thu)</option>
                <option value="monthly_15th_prev_month">Monthly 15th (previous month work)</option>
                <option value="semimonthly_15th_end">Semi-monthly: 15th & End-of-Month</option>
                <option value="monthly_last_same_month">Monthly EOM (same month work)</option>
              </select>
            </div>

            {formPayCycleType.startsWith('biweekly') && (
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color: "#e2e8f0",
                    fontWeight: "bold",
                  }}
                >
                  Reference Pay Date (for bi-weekly calculation)
                </label>
                <input
                  type="date"
                  value={formReferencePayDate}
                  onChange={(e) => setFormReferencePayDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#1a202c",
                    border: "1px solid #4a5568",
                    borderRadius: 6,
                    color: "#e2e8f0",
                    fontSize: "15px",
                  }}
                />
                <div style={{ color: "#a0aec0", fontSize: "13px", marginTop: 4 }}>
                  Enter a known pay date to calculate bi-weekly schedule
                </div>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "#e2e8f0",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  style={{
                    width: 20,
                    height: 20,
                    cursor: "pointer",
                  }}
                />
                Active Vendor
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: "10px 20px",
                  background: "#4a5568",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: "10px 20px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vendors List */}
      <div
        style={{
          background: "#2d3748",
          border: "1px solid #4a5568",
          borderRadius: 12,
          padding: 24,
        }}
      >
        {vendors.length === 0 ? (
          <div style={{ textAlign: "center", padding: 48, color: "#a0aec0" }}>
            No vendors found. Click "Add Vendor" to create one.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#1a202c",
                  border: "1px solid #4a5568",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: vendor.color,
                      borderRadius: 6,
                      border: "1px solid #4a5568",
                    }}
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          color: "#e2e8f0",
                          fontSize: "16px",
                          fontWeight: "bold",
                        }}
                      >
                        {vendor.name}
                      </div>
                      {vendor.active === false && (
                        <span style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          background: "#7f1d1d",
                          padding: "2px 8px",
                          borderRadius: 4
                        }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <div style={{ color: "#a0aec0", fontSize: "14px" }}>
                      {vendor.pay_cycle_type ?
                        vendor.pay_cycle_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        : 'No pay cycle set'}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleEdit(vendor)}
                    style={{
                      padding: "8px 16px",
                      background: "#667eea",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(vendor.id)}
                    style={{
                      padding: "8px 16px",
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

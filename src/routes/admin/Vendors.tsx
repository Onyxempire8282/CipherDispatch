import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  initializeSupabaseAuthz,
  getSupabaseAuthz,
} from "../../lib/supabaseAuthz";
import { PayCycleType } from "../../utils/payoutCalculations";
import { NavBar } from "../../components/NavBar";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import "./vendors.css";

type Vendor = {
  id: string;
  name: string;
  color: string;
  pay_cycle_type?: PayCycleType;
  reference_pay_date?: string;
  pay_amount?: number | null;
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
  const [formPayAmount, setFormPayAmount] = useState("");
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
    setFormPayAmount("");
    setFormActive(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setIsEditing(true);
    setEditingVendor(vendor);
    setFormName(vendor.name);
    setFormColor(vendor.color);
    setFormPayCycleType(vendor.pay_cycle_type || 'weekly_thu_fri_thu');
    setFormReferencePayDate(vendor.reference_pay_date || "");
    setFormPayAmount(vendor.pay_amount?.toString() || "");
    setFormActive(vendor.active !== false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingVendor(null);
    setFormName("");
    setFormColor("#9CA3AF");
    setFormPayCycleType('weekly_thu_fri_thu');
    setFormReferencePayDate("");
    setFormPayAmount("");
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
        pay_amount: formPayAmount ? parseFloat(formPayAmount) : null,
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
      <div className="vendors vendors--loading">
        <div className="vendors__loading-text">
          Loading vendors...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vendors vendors--error">
        <div className="vendors__error-box">
          <h3>Unable to load vendors</h3>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="vendors__retry-btn"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="vendors">
      <NavBar role="admin" />
      <PageHeader label="Admin" title="Manage Vendors" />

      <div className="vendors__body">
        {/* Toolbar */}
        <div className="vendors__toolbar">
          <button onClick={handleAdd} className="vendors__add-btn">
            + Add Vendor
          </button>
        </div>

        {/* Add/Edit Form Modal */}
        {isEditing && (
          <div className="vendors__modal-overlay" onClick={handleCancel}>
            <div
              className="vendors__modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vendors__modal-header">
                <div className="vendors__modal-eyebrow">Vendor Management</div>
                <h3 className="vendors__modal-title">
                  {editingVendor ? "Edit Vendor" : "Add New Vendor"}
                </h3>
              </div>

              <div className="vendors__modal-body">
                <Field label="Vendor Name">
                  <input
                    type="text"
                    className="field__input"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Enter vendor name"
                  />
                </Field>

                <Field label="Color">
                  <div className="vendors__color-row">
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="vendors__color-swatch"
                    />
                    <input
                      type="text"
                      className="field__input vendors__color-text"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      placeholder="#9CA3AF"
                    />
                  </div>
                </Field>

                <Field label="Pay Cycle Type">
                  <select
                    className="field__select"
                    value={formPayCycleType}
                    onChange={(e) => setFormPayCycleType(e.target.value as PayCycleType)}
                  >
                    <option value="weekly_thu_fri_thu">Weekly Thu (Fri→Thu work, paid Thu)</option>
                    <option value="biweekly_thu_fri_thu">Bi-weekly Wed (2-week period, paid Wed)</option>
                    <option value="biweekly_fri_sat_fri">Bi-weekly Thu (2-week period, paid Thu)</option>
                    <option value="monthly_15th_prev_month">Monthly 15th (previous month work)</option>
                    <option value="semimonthly_15th_end">Semi-monthly: 15th & End-of-Month</option>
                    <option value="monthly_last_same_month">Monthly EOM (same month work)</option>
                  </select>
                </Field>

                {formPayCycleType.startsWith('biweekly') && (
                  <Field
                    label="Reference Pay Date (for bi-weekly calculation)"
                    hint="Enter a known pay date to calculate bi-weekly schedule"
                  >
                    <input
                      type="date"
                      className="field__input"
                      value={formReferencePayDate}
                      onChange={(e) => setFormReferencePayDate(e.target.value)}
                    />
                  </Field>
                )}

                <Field label="Default Pay Amount">
                  <input
                    type="number"
                    step="0.01"
                    className="field__input"
                    value={formPayAmount}
                    onChange={(e) => setFormPayAmount(e.target.value)}
                    placeholder="$0.00"
                  />
                </Field>

                <div className="vendors__checkbox-field">
                  <label className="vendors__checkbox-label">
                    <input
                      type="checkbox"
                      className="vendors__checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                    />
                    Active Vendor
                  </label>
                </div>
              </div>

              <div className="vendors__modal-footer">
                <button onClick={handleCancel} className="vendors__cancel-btn">
                  Cancel
                </button>
                <button onClick={handleSave} className="vendors__save-btn">
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vendors List */}
        <div className="vendors__list-panel">
          {vendors.length === 0 ? (
            <div className="vendors__empty">
              No vendors found. Click "Add Vendor" to create one.
            </div>
          ) : (
            <div className="vendors__grid">
              {vendors.map((vendor) => (
                <div key={vendor.id} className="vendors__card">
                  <div className="vendors__card-info">
                    <div
                      className="vendors__card-swatch"
                      style={{ background: vendor.color }}
                    />
                    <div>
                      <div className="vendors__card-name-row">
                        <div className="vendors__card-name">
                          {vendor.name}
                        </div>
                        {vendor.active === false && (
                          <span className="vendors__card-inactive">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="vendors__card-cycle">
                        {vendor.pay_cycle_type ?
                          vendor.pay_cycle_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'No pay cycle set'}
                      </div>
                    </div>
                  </div>
                  <div className="vendors__card-actions">
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="vendors__edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(vendor.id)}
                      className="vendors__delete-btn"
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
    </div>
  );
}

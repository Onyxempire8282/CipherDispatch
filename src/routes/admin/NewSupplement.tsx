import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { NavBar } from "../../components/NavBar";
import PageHeader from "../../components/ui/PageHeader";
import Field from "../../components/ui/Field";
import ActionFooter from "../../components/ui/ActionFooter";
import "./new-supplement.css";

const SUPPLEMENT_REASONS = [
  "Additional damage found during inspection",
  "Hidden damage discovered during repair",
  "Parts price increase",
  "Additional labor required",
  "Sublet required",
  "Total loss reassessment",
  "Other",
];

export default function NewSupplement() {
  const { id } = useParams(); // original claim id
  const nav = useNavigate();

  const [original, setOriginal]   = useState<any>(null);
  const [users, setUsers]         = useState<any[]>([]);
  const [existing, setExisting]   = useState<any[]>([]); // existing supplements
  const [saving, setSaving]       = useState(false);

  // Search state (used when no id in params)
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching]       = useState(false);

  // Supplement form
  const [suppNumber, setSuppNumber]         = useState<number>(1);
  const [reason, setReason]                 = useState("");
  const [customReason, setCustomReason]     = useState("");
  const [locationChanged, setLocationChanged] = useState(false);
  const [suppAddress, setSuppAddress]       = useState("");
  const [suppCity, setSuppCity]             = useState("");
  const [suppState, setSuppState]           = useState("");
  const [suppZip, setSuppZip]               = useState("");
  const [assignedTo, setAssignedTo]         = useState("");
  const [apptStart, setApptStart]           = useState("");
  const [notes, setNotes]                   = useState("");
  const [payAmount, setPayAmount]           = useState("");

  const loadOriginal = async (claimId: string) => {
    const [claimRes, suppsRes, usersRes] = await Promise.all([
      supabase.from("claims_v")
        .select("*")
        .eq("id", claimId)
        .single(),
      supabase.from("claims_v")
        .select("*")
        .eq("original_claim_id", claimId)
        .eq("is_supplement", true)
        .order("supplement_number"),
      supabase.from("profiles")
        .select("user_id, full_name, role")
        .order("full_name"),
    ]);

    if (claimRes.data) {
      setOriginal(claimRes.data);
      // Auto-set next supplement number
      const used = (suppsRes.data || []).map((s: any) => s.supplement_number);
      const next = [1, 2, 3].find(n => !used.includes(n));
      if (next) setSuppNumber(next);
      // Pre-fill assignment from original
      setAssignedTo(claimRes.data.assigned_to || "");
      setPayAmount(claimRes.data.pay_amount?.toString() || "");
    }
    setExisting(suppsRes.data || []);
    setUsers(usersRes.data || []);
  };

  useEffect(() => {
    if (id) loadOriginal(id);
    else {
      supabase.from("profiles").select("user_id, full_name, role")
        .order("full_name")
        .then(({ data }) => setUsers(data || []));
    }
  }, [id]);

  const searchClaims = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data } = await supabase
      .from("claims_v")
      .select("*")
      .or(`claim_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%`)
      .eq("is_supplement", false)
      .is("archived_at", null)
      .limit(8);
    setSearchResults(data || []);
    setSearching(false);
  };

  const save = async () => {
    if (!original) return alert("No original claim selected");
    if (!reason) return alert("Please select a supplement reason");

    const usedNumbers = existing.map(s => s.supplement_number);
    if (usedNumbers.includes(suppNumber)) {
      return alert(`Supplement ${suppNumber} already exists for this claim`);
    }

    setSaving(true);

    const suppClaimNumber = `${original.claim_number}-S${suppNumber}`;

    const payload: any = {
      // Inherited from original
      claim_number:     suppClaimNumber,
      customer_name:    original.customer_name,
      customer_phone:   original.customer_phone,
      email:            original.email,
      vehicle_year:     original.vehicle_year,
      vehicle_make:     original.vehicle_make,
      vehicle_model:    original.vehicle_model,
      vin:              original.vin,
      date_of_loss:     original.date_of_loss,
      insurance_company: original.insurance_company,
      firm:             original.firm,

      // Location — use new if changed, else inherit
      address_line1: locationChanged ? suppAddress : original.address_line1,
      address_line2: locationChanged ? null : original.address_line2,
      city:          locationChanged ? suppCity  : original.city,
      state:         locationChanged ? suppState : original.state,
      zip:           locationChanged ? suppZip   : original.zip,

      // Supplement specific
      is_supplement:         true,
      original_claim_id:     original.id,
      supplement_number:     suppNumber,
      supplement_reason:     reason === "Other" ? customReason : reason,
      supp_location_changed: locationChanged,
      supp_address_line1:    locationChanged ? suppAddress : null,
      supp_city:             locationChanged ? suppCity    : null,
      supp_state:            locationChanged ? suppState   : null,
      supp_zip:              locationChanged ? suppZip     : null,

      // Assignment & scheduling
      assigned_to:       assignedTo || original.assigned_to || null,
      appointment_start: apptStart ? new Date(apptStart).toISOString() : null,
      notes:             notes || null,
      pay_amount:        payAmount ? parseFloat(payAmount) : null,
      status:            apptStart ? "SCHEDULED" : "IN_PROGRESS",
      payout_status:     "unpaid",
    };

    const { error } = await supabase.from("claims_v").insert(payload);

    setSaving(false);

    if (error) {
      alert(`Error creating supplement: ${error.message}`);
    } else {
      alert(`Supplement ${suppClaimNumber} created successfully`);
      nav(`/claim/${original.id}`);
    }
  };

  const availableNumbers = [1, 2, 3].filter(
    n => !existing.map(s => s.supplement_number).includes(n)
  );

  return (
    <div>
      <NavBar role="admin" />
      <PageHeader
        label="Supplement"
        title="Create Supplement"
        sub={original ? `Linked to claim #${original.claim_number}` : "Search for the original claim"}
        compact
      />

      <div className="supp__wrap">

        {/* CLAIM SEARCH — shown when no id in URL */}
        {!id && !original && (
          <div className="supp__section supp__section--accent">
            <div className="supp__section-header">
              <div className="supp__section-title">Find Original Claim</div>
            </div>
            <div className="supp__section-body">
              <div className="supp__search-row">
                <input
                  className="supp__search-input"
                  type="text"
                  placeholder="Search by claim number or customer name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && searchClaims()}
                />
                <button
                  className="supp__search-btn"
                  onClick={searchClaims}
                  disabled={searching}
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="supp__results">
                  {searchResults.map(c => (
                    <div
                      key={c.id}
                      className="supp__result-row"
                      onClick={() => { setSearchResults([]); loadOriginal(c.id); }}
                    >
                      <span className="supp__result-num">#{c.claim_number}</span>
                      <span className="supp__result-name">{c.customer_name}</span>
                      <span className="supp__result-vehicle">
                        {c.vehicle_year} {c.vehicle_make} {c.vehicle_model}
                      </span>
                      <span className="supp__result-firm">{c.firm}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORIGINAL CLAIM SUMMARY */}
        {original && (
          <div className="supp__original">
            <div className="supp__original-label">ORIGINAL CLAIM</div>
            <div className="supp__original-main">
              <div className="supp__original-num">#{original.claim_number}</div>
              <div className="supp__original-info">
                <span>{original.customer_name}</span>
                <span className="supp__original-dot">·</span>
                <span>{original.vehicle_year} {original.vehicle_make} {original.vehicle_model}</span>
                <span className="supp__original-dot">·</span>
                <span>{original.firm}</span>
              </div>
            </div>

            {/* Existing supplements */}
            {existing.length > 0 && (
              <div className="supp__existing">
                {existing.map(s => (
                  <div key={s.id} className="supp__existing-tag">
                    S{s.supplement_number}
                    <span className={`supp__existing-status supp__existing-status--${s.status.toLowerCase()}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {availableNumbers.length === 0 && (
              <div className="supp__maxed">
                All 3 supplements have been created for this claim.
              </div>
            )}
          </div>
        )}

        {/* SUPPLEMENT FORM — only show when original is loaded and slots available */}
        {original && availableNumbers.length > 0 && (
          <>
            {/* SUPPLEMENT DETAILS */}
            <div className="supp__section supp__section--accent">
              <div className="supp__section-header">
                <div className="supp__section-title">Supplement Details</div>
              </div>
              <div className="supp__section-body">
                <Field label="Supplement Number">
                  <div className="supp__number-row">
                    {[1, 2, 3].map(n => {
                      const used = existing.map(s => s.supplement_number).includes(n);
                      return (
                        <button
                          key={n}
                          className={`supp__number-btn
                            ${suppNumber === n ? "supp__number-btn--sel" : ""}
                            ${used ? "supp__number-btn--used" : ""}
                          `}
                          disabled={used}
                          onClick={() => setSuppNumber(n)}
                        >
                          SUPP {n}
                          {used && <span className="supp__number-used-label">Used</span>}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Reason for Supplement">
                  <div className="field__select-wrap">
                    <select
                      className="field__select"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                    >
                      <option value="">Select a reason...</option>
                      {SUPPLEMENT_REASONS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <div className="field__select-arrow">▾</div>
                  </div>
                </Field>

                {reason === "Other" && (
                  <Field label="Describe Reason">
                    <input
                      className="field__input"
                      type="text"
                      placeholder="Explain the reason for this supplement..."
                      value={customReason}
                      onChange={e => setCustomReason(e.target.value)}
                    />
                  </Field>
                )}

                <Field label="Notes" optional>
                  <textarea
                    className="field__textarea"
                    placeholder="Any additional notes..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            {/* VEHICLE LOCATION */}
            <div className="supp__section">
              <div className="supp__section-header">
                <div className="supp__section-title">Vehicle Location</div>
              </div>
              <div className="supp__section-body">
                <div className="supp__location-toggle">
                  <button
                    className={`supp__toggle-btn ${!locationChanged ? "supp__toggle-btn--sel" : ""}`}
                    onClick={() => setLocationChanged(false)}
                  >
                    🏠 Same as original
                  </button>
                  <button
                    className={`supp__toggle-btn ${locationChanged ? "supp__toggle-btn--sel supp__toggle-btn--changed" : ""}`}
                    onClick={() => setLocationChanged(true)}
                  >
                    📍 Vehicle moved
                  </button>
                </div>

                {!locationChanged && (
                  <div className="supp__location-inherited">
                    <div className="supp__location-addr">
                      {original.address_line1}
                      {original.address_line2 && `, ${original.address_line2}`}
                    </div>
                    <div className="supp__location-city">
                      {original.city}, {original.state} {original.zip}
                    </div>
                  </div>
                )}

                {locationChanged && (
                  <div className="supp__location-fields">
                    <Field label="New Address">
                      <input
                        className="field__input"
                        type="text"
                        placeholder="Street address"
                        value={suppAddress}
                        onChange={e => setSuppAddress(e.target.value)}
                      />
                    </Field>
                    <div className="new-claim__grid-3">
                      <Field label="City">
                        <input
                          className="field__input"
                          type="text"
                          value={suppCity}
                          onChange={e => setSuppCity(e.target.value)}
                        />
                      </Field>
                      <Field label="State">
                        <input
                          className="field__input"
                          type="text"
                          value={suppState}
                          onChange={e => setSuppState(e.target.value)}
                        />
                      </Field>
                      <Field label="ZIP">
                        <input
                          className="field__input"
                          type="text"
                          value={suppZip}
                          onChange={e => setSuppZip(e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SCHEDULING & PAY */}
            <div className="supp__section">
              <div className="supp__section-header">
                <div className="supp__section-title">Scheduling & Pay</div>
              </div>
              <div className="supp__section-body">
                <div className="new-claim__grid-2">
                  <Field label="Appointment" optional>
                    <input
                      className="field__input"
                      type="datetime-local"
                      value={apptStart}
                      onChange={e => setApptStart(e.target.value)}
                    />
                  </Field>
                  <Field label="Pay Amount" optional>
                    <input
                      className="field__input"
                      type="number"
                      step="0.01"
                      placeholder="$0.00"
                      value={payAmount}
                      onChange={e => setPayAmount(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Assigned Appraiser" optional>
                  <div className="field__select-wrap">
                    <select
                      className="field__select"
                      value={assignedTo}
                      onChange={e => setAssignedTo(e.target.value)}
                    >
                      <option value="">Same as original</option>
                      {users.map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.full_name} ({u.role})
                        </option>
                      ))}
                    </select>
                    <div className="field__select-arrow">▾</div>
                  </div>
                </Field>
              </div>
            </div>
          </>
        )}
      </div>

      <ActionFooter
        title={original ? `Supplement for #${original.claim_number}` : "New Supplement"}
        sub="All vehicle and customer info is inherited from the original claim"
      >
        <Link to={original ? `/claim/${original.id}` : "/admin/claims"}
          className="btn btn--ghost btn--sm">
          Cancel
        </Link>
        {original && availableNumbers.length > 0 && (
          <button
            className="btn btn--primary btn--sm"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Creating..." : `Create Supplement ${suppNumber} →`}
          </button>
        )}
      </ActionFooter>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import "./client-portal.css";

type Stage = "loading" | "ready" | "expired" | "error";

export default function ClientPortal() {
  const [params]  = useSearchParams();
  const token     = params.get("token");

  const [stage,    setStage]    = useState<Stage>("loading");
  const [client,   setClient]   = useState<any>(null);
  const [claims,   setClaims]   = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    if (!token) { setStage("expired"); return; }
    (async () => {
      // Look up the portal token in a portal_clients table
      const { data: portal, error: pErr } = await supabaseCD
        .from("portal_clients")
        .select("id, client_name, client_email, active")
        .eq("portal_token", token)
        .single();

      if (pErr || !portal || !portal.active) { setStage("expired"); return; }

      // Load their claims
      const { data: claimsData, error: cErr } = await supabaseCD
        .from("claims_v")
        .select("*")
        .eq("portal_client_id", portal.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (cErr) { setStage("error"); return; }

      setClient(portal);
      setClaims(claimsData || []);
      setStage("ready");
    })();
  }, [token]);

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    IN_PROGRESS: { label: "In Progress",  color: "#60a5fa" },
    SCHEDULED:   { label: "Scheduled",    color: "#e8952a" },
    WRITING:     { label: "Estimate Writing", color: "#a78bfa" },
    COMPLETED:   { label: "Completed",    color: "#4ade80" },
    CANCELED:    { label: "Canceled",     color: "#4a5058" },
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const fmtAppt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

  const active    = claims.filter(c => c.status !== "COMPLETED" && c.status !== "CANCELED");
  const completed = claims.filter(c => c.status === "COMPLETED");

  return (
    <div className="portal">
      <div className="portal__nav">
        <div className="portal__nav-logo">CD</div>
        <div className="portal__nav-brand">CIPHER DISPATCH</div>
        {client && (
          <div className="portal__nav-client">{client.client_name}</div>
        )}
      </div>

      {stage === "loading" && (
        <div className="portal__center">
          <div className="portal__spinner" />
          <div className="portal__loading-msg">Loading your portal...</div>
        </div>
      )}

      {stage === "expired" && (
        <div className="portal__center">
          <div className="portal__expired-icon">🔒</div>
          <div className="portal__expired-title">Portal Access Invalid</div>
          <div className="portal__expired-sub">
            This portal link is inactive or has expired.<br />
            Contact your Cipher Dispatch representative for a new link.
          </div>
        </div>
      )}

      {stage === "error" && (
        <div className="portal__center">
          <div className="portal__expired-title">Something went wrong</div>
          <div className="portal__expired-sub">Please try refreshing the page.</div>
        </div>
      )}

      {stage === "ready" && (
        <div className="portal__body">
          <div className="portal__header">
            <div>
              <div className="portal__header-label">CLIENT PORTAL</div>
              <h1 className="portal__header-title">{client?.client_name}</h1>
              <div className="portal__header-sub">
                {claims.length} vehicle{claims.length !== 1 ? "s" : ""} on file
              </div>
            </div>
            <div className="portal__summary">
              <div className="portal__summary-stat">
                <div className="portal__summary-num">{active.length}</div>
                <div className="portal__summary-label">ACTIVE</div>
              </div>
              <div className="portal__summary-stat">
                <div className="portal__summary-num portal__summary-num--green">{completed.length}</div>
                <div className="portal__summary-label">COMPLETED</div>
              </div>
              <div className="portal__summary-stat">
                <div className="portal__summary-num portal__summary-num--amber">
                  {claims.filter(c => c.status === "SCHEDULED" && !c.appt_confirmed).length}
                </div>
                <div className="portal__summary-label">AWAITING CONFIRM</div>
              </div>
            </div>
          </div>

          {/* Active claims */}
          {active.length > 0 && (
            <div className="portal__section">
              <div className="portal__section-title">ACTIVE VEHICLES</div>
              <div className="portal__claims">
                {active.map(c => {
                  const cfg = STATUS_CONFIG[c.status] || { label: c.status, color: "#4a5058" };
                  return (
                    <div
                      key={c.id}
                      className="portal__claim"
                      style={{ "--claim-color": cfg.color } as any}
                      onClick={() => setSelected(selected?.id === c.id ? null : c)}
                    >
                      <div className="portal__claim-top">
                        <div className="portal__claim-vehicle">
                          <div className="portal__claim-year-make">
                            {c.vehicle_year} {c.vehicle_make} {c.vehicle_model}
                          </div>
                          <div className="portal__claim-vin">{c.vin || "VIN pending"}</div>
                        </div>
                        <div className="portal__claim-right">
                          <div className="portal__status-badge" style={{ color: cfg.color, borderColor: cfg.color }}>
                            {cfg.label}
                          </div>
                          <div className="portal__claim-num">#{c.claim_number}</div>
                        </div>
                      </div>

                      {selected?.id === c.id && (
                        <div className="portal__claim-detail">
                          <div className="portal__detail-row">
                            <span className="portal__detail-label">OWNER</span>
                            <span className="portal__detail-value">{c.customer_name}</span>
                          </div>
                          {c.appointment_start && (
                            <div className="portal__detail-row">
                              <span className="portal__detail-label">APPOINTMENT</span>
                              <span className="portal__detail-value">
                                {fmtAppt(c.appointment_start)}
                                {c.appt_confirmed
                                  ? <span className="portal__confirmed-tag"> ✓ Confirmed</span>
                                  : <span className="portal__pending-tag"> Awaiting confirmation</span>
                                }
                              </span>
                            </div>
                          )}
                          {c.address_line1 && c.location_type !== "body_shop" && (
                            <div className="portal__detail-row">
                              <span className="portal__detail-label">LOCATION</span>
                              <span className="portal__detail-value">{c.address_line1}, {c.city}, {c.state}</span>
                            </div>
                          )}
                          <div className="portal__detail-row">
                            <span className="portal__detail-label">PHOTOS</span>
                            <span className="portal__detail-value">{c.photo_count || 0} uploaded</span>
                          </div>
                          <div className="portal__detail-row">
                            <span className="portal__detail-label">RECEIVED</span>
                            <span className="portal__detail-value">{fmtDate(c.created_at)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed claims */}
          {completed.length > 0 && (
            <div className="portal__section">
              <div className="portal__section-title">COMPLETED</div>
              <div className="portal__claims">
                {completed.map(c => (
                  <div
                    key={c.id}
                    className="portal__claim portal__claim--done"
                    onClick={() => setSelected(selected?.id === c.id ? null : c)}
                  >
                    <div className="portal__claim-top">
                      <div className="portal__claim-vehicle">
                        <div className="portal__claim-year-make">
                          {c.vehicle_year} {c.vehicle_make} {c.vehicle_model}
                        </div>
                        <div className="portal__claim-vin">{c.vin || "—"}</div>
                      </div>
                      <div className="portal__claim-right">
                        <div className="portal__status-badge" style={{ color: "#4ade80", borderColor: "#4ade80" }}>
                          Completed
                        </div>
                        <div className="portal__claim-num">#{c.claim_number}</div>
                      </div>
                    </div>
                    {selected?.id === c.id && (
                      <div className="portal__claim-detail">
                        <div className="portal__detail-row">
                          <span className="portal__detail-label">OWNER</span>
                          <span className="portal__detail-value">{c.customer_name}</span>
                        </div>
                        <div className="portal__detail-row">
                          <span className="portal__detail-label">PHOTOS</span>
                          <span className="portal__detail-value">{c.photo_count || 0} uploaded</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {claims.length === 0 && (
            <div className="portal__empty">No vehicles on file yet.</div>
          )}
        </div>
      )}

      <div className="portal__page-footer">
        Powered by Cipher Dispatch · Read-only portal
      </div>
    </div>
  );
}

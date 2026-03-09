import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./confirm-appointment.css";

type Stage = "loading" | "ready" | "confirmed" | "already" | "expired" | "error";

export default function ConfirmAppointment() {
  const [params] = useSearchParams();
  const token    = params.get("token");

  const [stage, setStage] = useState<Stage>("loading");
  const [claim, setClaim] = useState<any>(null);

  useEffect(() => {
    if (!token) { setStage("expired"); return; }
    (async () => {
      const { data, error } = await supabase
        .from("claims_v")
        .select("*")
        .eq("confirm_token", token)
        .is("archived_at", null)
        .single();

      if (error || !data) { setStage("expired"); return; }
      if (data.appt_confirmed) { setClaim(data); setStage("already"); return; }
      setClaim(data);
      setStage("ready");
    })();
  }, [token]);

  const confirm = async () => {
    setStage("loading");
    const { error } = await supabase
      .from("claims_v")
      .update({ appt_confirmed: true, appt_confirmed_at: new Date().toISOString() })
      .eq("confirm_token", token);

    if (error) { setStage("error"); return; }

    // Fire webhook for n8n — pre-wired
    supabase.functions.invoke("notify-status-change", {
      body: {
        claim_id: claim.id,
        new_status: "APPT_CONFIRMED",
        claim_number: claim.claim_number,
        customer_name: claim.customer_name,
      }
    }).catch(() => {});

    setStage("confirmed");
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="conf">
      <div className="conf__card">
        <div className="conf__logo">CD</div>
        <div className="conf__brand">CIPHER DISPATCH</div>

        {stage === "loading" && (
          <div className="conf__stage">
            <div className="conf__spinner" />
            <div className="conf__msg">Loading your appointment...</div>
          </div>
        )}

        {stage === "expired" && (
          <div className="conf__stage">
            <div className="conf__icon conf__icon--red">✕</div>
            <div className="conf__title">Link Expired</div>
            <div className="conf__sub">
              This confirmation link is no longer valid.<br />
              Please contact us if you need assistance.
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="conf__stage">
            <div className="conf__icon conf__icon--red">!</div>
            <div className="conf__title">Something went wrong</div>
            <div className="conf__sub">Please try again or contact us directly.</div>
          </div>
        )}

        {(stage === "ready" || stage === "already" || stage === "confirmed") && claim && (
          <>
            <div className="conf__greeting">
              Hello, <strong>{claim.customer_name}</strong>
            </div>

            <div className="conf__vehicle">
              {claim.vehicle_year} {claim.vehicle_make} {claim.vehicle_model}
            </div>

            <div className="conf__appt-block">
              <div className="conf__appt-label">YOUR APPOINTMENT</div>
              <div className="conf__appt-date">{fmtDate(claim.appointment_start)}</div>
              <div className="conf__appt-time">
                {fmtTime(claim.appointment_start)}
                {claim.appointment_end && ` – ${fmtTime(claim.appointment_end)}`}
              </div>
              {claim.address_line1 && claim.location_type !== "body_shop" && (
                <div className="conf__appt-address">
                  {claim.address_line1}<br />
                  {claim.city}, {claim.state} {claim.zip}
                </div>
              )}
              {claim.location_type === "body_shop" && (
                <div className="conf__appt-address conf__appt-address--shop">
                  📍 Body Shop Location
                </div>
              )}
            </div>
          </>
        )}

        {stage === "ready" && (
          <div className="conf__actions">
            <p className="conf__prompt">
              Please confirm you will be available for this appointment.
            </p>
            <button className="conf__confirm-btn" onClick={confirm}>
              ✓ Confirm My Appointment
            </button>
            <p className="conf__note">
              Need to reschedule? Call or text us directly and we will find a new time.
            </p>
          </div>
        )}

        {stage === "confirmed" && (
          <div className="conf__stage">
            <div className="conf__icon conf__icon--green">✓</div>
            <div className="conf__title">Appointment Confirmed</div>
            <div className="conf__sub">
              You're all set. We will see you then.<br />
              A reminder will be sent 24 hours before your appointment.
            </div>
          </div>
        )}

        {stage === "already" && (
          <div className="conf__stage">
            <div className="conf__icon conf__icon--amber">✓</div>
            <div className="conf__title">Already Confirmed</div>
            <div className="conf__sub">
              You already confirmed this appointment.<br />
              We'll see you on {claim && fmtDate(claim.appointment_start)}.
            </div>
          </div>
        )}

        <div className="conf__footer">
          Powered by Cipher Dispatch
        </div>
      </div>
    </div>
  );
}

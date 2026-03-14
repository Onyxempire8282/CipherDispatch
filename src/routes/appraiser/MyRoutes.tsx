/**
 * Today's Run Page
 *
 * Daily agenda view showing all claims scheduled for today,
 * with inline status actions (start inspection, mark complete).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import { NavBar } from "../../components/NavBar";
import "./today-run.css";

interface TodayClaim {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  appointment_start: string;
  appointment_end?: string;
  address_line1?: string;
  city?: string;
  state?: string;
  zip?: string | null;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  firm?: string;
  pay_amount?: number | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getDuration(start: string, end?: string): string | null {
  if (!end) return null;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  if (diff <= 0) return null;
  const mins = Math.round(diff / (1000 * 60));
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}H ${rem}M` : `${hrs}H`;
  }
  return `${mins} MIN`;
}

function buildMapsUrl(claim: TodayClaim): string {
  const parts = [claim.address_line1, claim.city, claim.state, claim.zip]
    .filter(Boolean)
    .join(", ");
  return `https://maps.google.com/?q=${encodeURIComponent(parts)}`;
}

function getCardModifier(status: string): string {
  switch (status) {
    case "IN_PROGRESS":
      return "today-run__card--in-progress";
    case "COMPLETED":
      return "today-run__card--completed";
    default:
      return "today-run__card--scheduled";
  }
}

export default function MyRoutes() {
  const [claims, setClaims] = useState<TodayClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadTodaysClaims();
  }, []);

  const loadTodaysClaims = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const now = new Date();
      const todayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).toISOString();
      const todayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      ).toISOString();

      const { data } = await supabaseCD
        .from("claims_v")
        .select(
          "id, claim_number, customer_name, status, appointment_start, appointment_end, address_line1, city, state, zip, vehicle_year, vehicle_make, vehicle_model, firm, pay_amount"
        )
        .eq("assigned_to", user.id)
        .gte("appointment_start", todayStart)
        .lt("appointment_start", todayEnd)
        .not("status", "eq", "CANCELED")
        .order("appointment_start", { ascending: true });

      setClaims((data as TodayClaim[]) || []);
    } catch (err) {
      console.error("Error loading today's claims:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInspection = async (claimId: string) => {
    const { error } = await supabaseCD
      .from("claims")
      .update({ status: "IN_PROGRESS" })
      .eq("id", claimId);
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId ? { ...c, status: "IN_PROGRESS" } : c
        )
      );
    }
  };

  const handleMarkComplete = async (claimId: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const completionDate = `${year}-${month}-${day}T00:00:00Z`;
    const completedMonth = `${year}-${month}`;

    const { error } = await supabaseCD
      .from("claims")
      .update({
        status: "COMPLETED",
        completion_date: completionDate,
        completed_month: completedMonth,
        payout_status: "unpaid",
      })
      .eq("id", claimId);

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claimId ? { ...c, status: "COMPLETED" } : c
        )
      );

      supabaseCD.functions
        .invoke("notify-status-change", {
          body: { claim_id: claimId, new_status: "COMPLETED" },
        })
        .catch(() => {});
    }
  };

  // Compute header stats
  const totalStops = claims.length;
  const completedCount = claims.filter((c) => c.status === "COMPLETED").length;
  const now = new Date();
  const nextClaim = claims.find(
    (c) =>
      c.status !== "COMPLETED" && new Date(c.appointment_start).getTime() >= now.getTime() - 30 * 60 * 1000
  );
  const nextStopLabel = nextClaim
    ? formatTime(nextClaim.appointment_start)
    : completedCount === totalStops && totalStops > 0
      ? "ALL DONE"
      : "---";

  const todayFormatted = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="today-run__page">
        <NavBar role="appraiser" />
        <div className="today-run__content">
          <div className="today-run__header">
            <div className="today-run__eyebrow">CIPHER DISPATCH</div>
            <div className="today-run__title">TODAY'S RUN</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="today-run__page">
      <NavBar role="appraiser" />
      <div className="today-run__content">
        {/* Header */}
        <div className="today-run__header">
          <div className="today-run__eyebrow">CIPHER DISPATCH</div>
          <div className="today-run__title">TODAY'S RUN</div>
          <div className="today-run__date">{todayFormatted}</div>
        </div>

        {/* Stat Strip */}
        <div className="today-run__stat-strip">
          <div className="today-run__stat-tile">
            <div className="today-run__stat-label">STOPS TODAY</div>
            <div className="today-run__stat-value">{totalStops}</div>
          </div>
          <div className="today-run__stat-tile">
            <div className="today-run__stat-label">NEXT STOP</div>
            <div className="today-run__stat-value">{nextStopLabel}</div>
          </div>
          <div className="today-run__stat-tile">
            <div className="today-run__stat-label">COMPLETED</div>
            <div className="today-run__stat-value">
              {completedCount} / {totalStops}
            </div>
          </div>
        </div>

        {/* Claim Cards */}
        {claims.length === 0 ? (
          <div className="today-run__empty">
            <div className="today-run__empty-title">
              NO STOPS SCHEDULED FOR TODAY
            </div>
            <div className="today-run__empty-sub">
              Check with dispatch if you are expecting assignments.
            </div>
          </div>
        ) : (
          <div className="today-run__list">
            {claims.map((claim) => {
              const duration = getDuration(
                claim.appointment_start,
                claim.appointment_end
              );
              const vehicle = [
                claim.vehicle_year,
                claim.vehicle_make,
                claim.vehicle_model,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={claim.id}
                  className={`today-run__card ${getCardModifier(claim.status)}`}
                >
                  {/* Time */}
                  <div className="today-run__time-block">
                    <div className="today-run__time-value">
                      {formatTime(claim.appointment_start)}
                    </div>
                    {duration && (
                      <div className="today-run__time-duration">{duration}</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="today-run__info">
                    <div className="today-run__claim-number">
                      #{claim.claim_number}
                    </div>
                    <div className="today-run__customer">
                      {claim.customer_name}
                    </div>
                    <div className="today-run__address">
                      {[claim.address_line1, claim.city, claim.state]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    {vehicle && (
                      <div className="today-run__vehicle">{vehicle}</div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="today-run__actions">
                    <a
                      href={buildMapsUrl(claim)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="today-run__action-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      OPEN IN MAPS
                    </a>
                    <Link
                      to={`/claim/${claim.id}`}
                      className="today-run__action-btn"
                    >
                      VIEW CLAIM
                    </Link>
                  </div>

                  {/* Status action */}
                  <div className="today-run__status-action">
                    {claim.status === "SCHEDULED" && (
                      <button
                        className="today-run__status-btn today-run__status-btn--start"
                        onClick={() => handleStartInspection(claim.id)}
                      >
                        START INSPECTION
                      </button>
                    )}
                    {claim.status === "IN_PROGRESS" && (
                      <button
                        className="today-run__status-btn today-run__status-btn--complete"
                        onClick={() => handleMarkComplete(claim.id)}
                      >
                        MARK COMPLETE
                      </button>
                    )}
                    {claim.status === "COMPLETED" && (
                      <div className="today-run__status-badge">COMPLETED</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

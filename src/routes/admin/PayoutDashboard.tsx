import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import {
  forecastPayouts,
  getWeeklyView,
  getMonthlyView,
  getUpcomingPayouts,
  PayoutForecast,
  WeeklyTotal,
  MonthlyTotal,
  Claim
} from "../../utils/payoutForecasting";

export default function PayoutDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payouts, setPayouts] = useState<PayoutForecast[]>([]);
  const [weeklyView, setWeeklyView] = useState<WeeklyTotal[]>([]);
  const [monthlyView, setMonthlyView] = useState<MonthlyTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'upcoming' | 'weekly' | 'monthly'>('upcoming');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch ALL claims (completed and scheduled) to forecast future payouts
      // Use pay_amount or file_total from claims (already set in calendar)
      const { data: claimsData, error } = await supabase
        .from('claims')
        .select('id, firm_name, completion_date, appointment_start, file_total, pay_amount, status')
        .or('status.eq.COMPLETED,status.eq.SCHEDULED,status.eq.IN_PROGRESS')
        .or('completion_date.not.is.null,appointment_start.not.is.null');

      if (error) throw error;

      const allClaims = (claimsData || []) as Claim[];
      setClaims(allClaims);

      // Generate forecasts from both completed and scheduled claims
      const allPayouts = forecastPayouts(allClaims);
      setPayouts(allPayouts);

      // Generate views
      setWeeklyView(getWeeklyView(allPayouts));
      setMonthlyView(getMonthlyView(allPayouts));
    } catch (error: any) {
      console.error('Error loading payout data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const upcomingPayouts = getUpcomingPayouts(payouts, 30);
  const thisWeekPayouts = upcomingPayouts.filter(p => {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    return p.payoutDate >= today && p.payoutDate <= weekEnd;
  });

  const thisWeekTotal = thisWeekPayouts.reduce((sum, p) => sum + p.totalExpected, 0);
  const nextWeekPayouts = upcomingPayouts.filter(p => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() + 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    return p.payoutDate >= weekStart && p.payoutDate <= weekEnd;
  });
  const nextWeekTotal = nextWeekPayouts.reduce((sum, p) => sum + p.totalExpected, 0);

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const thisMonthPayouts = payouts.filter(p =>
    p.payoutDate.getMonth() === thisMonth && p.payoutDate.getFullYear() === thisYear
  );
  const thisMonthTotal = thisMonthPayouts.reduce((sum, p) => sum + p.totalExpected, 0);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
        padding: 40,
        color: '#e2e8f0'
      }}>
        Loading payout forecasts...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
      padding: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/" style={{
            padding: "8px 16px",
            background: "#4a5568",
            color: "white",
            textDecoration: "none",
            borderRadius: 4,
            fontWeight: "bold",
          }}>← Home</Link>
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: "22px", fontWeight: "bold" }}>
            Payout Forecast Dashboard
          </h3>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{
          background: "#2d3748",
          border: "2px solid #10b981",
          borderRadius: 12,
          padding: 24
        }}>
          <div style={{ color: "#a0aec0", fontSize: 14, marginBottom: 8 }}>This Week</div>
          <div style={{ color: "#10b981", fontSize: 32, fontWeight: "bold" }}>
            ${thisWeekTotal.toFixed(2)}
          </div>
          <div style={{ color: "#a0aec0", fontSize: 12, marginTop: 4 }}>
            {thisWeekPayouts.length} payout{thisWeekPayouts.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{
          background: "#2d3748",
          border: "2px solid #667eea",
          borderRadius: 12,
          padding: 24
        }}>
          <div style={{ color: "#a0aec0", fontSize: 14, marginBottom: 8 }}>Next Week</div>
          <div style={{ color: "#667eea", fontSize: 32, fontWeight: "bold" }}>
            ${nextWeekTotal.toFixed(2)}
          </div>
          <div style={{ color: "#a0aec0", fontSize: 12, marginTop: 4 }}>
            {nextWeekPayouts.length} payout{nextWeekPayouts.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div style={{
          background: "#2d3748",
          border: "2px solid #f59e0b",
          borderRadius: 12,
          padding: 24
        }}>
          <div style={{ color: "#a0aec0", fontSize: 14, marginBottom: 8 }}>This Month</div>
          <div style={{ color: "#f59e0b", fontSize: 32, fontWeight: "bold" }}>
            ${thisMonthTotal.toFixed(2)}
          </div>
          <div style={{ color: "#a0aec0", fontSize: 12, marginTop: 4 }}>
            {thisMonthPayouts.length} payout{thisMonthPayouts.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* View Mode Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {['upcoming', 'weekly', 'monthly'].map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            style={{
              padding: "10px 20px",
              background: viewMode === mode ? "#667eea" : "#4a5568",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Upcoming View */}
      {viewMode === 'upcoming' && (
        <div style={{ display: "grid", gap: 16 }}>
          <h4 style={{ color: "#e2e8f0", margin: "0 0 8px 0" }}>
            Next 30 Days ({upcomingPayouts.length} payouts)
          </h4>
          {upcomingPayouts.length === 0 ? (
            <div style={{
              background: "#2d3748",
              border: "1px solid #4a5568",
              borderRadius: 12,
              padding: 48,
              textAlign: "center",
              color: "#a0aec0"
            }}>
              No upcoming payouts in the next 30 days
            </div>
          ) : (
            upcomingPayouts.map((payout, idx) => (
              <div key={idx} style={{
                background: "#2d3748",
                border: "2px solid #667eea",
                borderRadius: 12,
                padding: 24,
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr auto",
                gap: 24,
                alignItems: "center"
              }}>
                <div>
                  <div style={{ color: "#a0aec0", fontSize: 12 }}>Firm</div>
                  <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: "bold" }}>
                    {payout.firm}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#a0aec0", fontSize: 12 }}>Pay Period</div>
                  <div style={{ color: "#e2e8f0", fontSize: 14 }}>
                    {payout.periodStart.toLocaleDateString()} - {payout.periodEnd.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: "#a0aec0", fontSize: 12 }}>Payout Date</div>
                  <div style={{ color: "#10b981", fontSize: 16, fontWeight: "bold" }}>
                    {payout.payoutDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#a0aec0", fontSize: 12 }}>
                    {payout.claimCount} claim{payout.claimCount !== 1 ? 's' : ''}
                  </div>
                  <div style={{ color: "#e2e8f0", fontSize: 24, fontWeight: "bold" }}>
                    ${payout.totalExpected.toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Weekly View */}
      {viewMode === 'weekly' && (
        <div style={{ display: "grid", gap: 16 }}>
          <h4 style={{ color: "#e2e8f0", margin: "0 0 8px 0" }}>
            Weekly Totals ({weeklyView.length} weeks)
          </h4>
          {weeklyView.slice(0, 12).map((week, idx) => (
            <div key={idx} style={{
              background: "#2d3748",
              border: "1px solid #4a5568",
              borderRadius: 12,
              padding: 24
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: "1px solid #4a5568"
              }}>
                <div>
                  <div style={{ color: "#a0aec0", fontSize: 12 }}>Week of</div>
                  <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: "bold" }}>
                    {week.weekStart.toLocaleDateString()} - {week.weekEnd.toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#a0aec0", fontSize: 12 }}>Total</div>
                  <div style={{ color: "#10b981", fontSize: 24, fontWeight: "bold" }}>
                    ${week.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {week.payouts.map((payout, pidx) => (
                  <div key={pidx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "#1a202c",
                    borderRadius: 6
                  }}>
                    <div>
                      <span style={{ color: "#e2e8f0", fontWeight: "bold" }}>{payout.firm}</span>
                      <span style={{ color: "#a0aec0", marginLeft: 12, fontSize: 14 }}>
                        {payout.payoutDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ color: "#e2e8f0", fontWeight: "bold" }}>
                      ${payout.totalExpected.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly View */}
      {viewMode === 'monthly' && (
        <div style={{ display: "grid", gap: 16 }}>
          <h4 style={{ color: "#e2e8f0", margin: "0 0 8px 0" }}>
            Monthly Totals ({monthlyView.length} months)
          </h4>
          {monthlyView.slice(0, 6).map((month, idx) => (
            <div key={idx} style={{
              background: "#2d3748",
              border: "1px solid #4a5568",
              borderRadius: 12,
              padding: 24
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: "1px solid #4a5568"
              }}>
                <div>
                  <div style={{ color: "#a0aec0", fontSize: 12 }}>Month</div>
                  <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: "bold" }}>
                    {month.monthName} {month.year}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#a0aec0", fontSize: 12 }}>Total</div>
                  <div style={{ color: "#10b981", fontSize: 24, fontWeight: "bold" }}>
                    ${month.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {Object.entries(month.byFirm).map(([firm, amount], fidx) => (
                  <div key={fidx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "#1a202c",
                    borderRadius: 6
                  }}>
                    <div style={{ color: "#e2e8f0", fontWeight: "bold" }}>{firm}</div>
                    <div style={{ color: "#e2e8f0", fontWeight: "bold" }}>
                      ${amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div style={{
        background: "#2d3748",
        border: "1px solid #667eea",
        borderRadius: 12,
        padding: 16,
        marginTop: 24,
        color: "#a0aec0",
        fontSize: 14
      }}>
        <div style={{ fontWeight: "bold", color: "#667eea", marginBottom: 8 }}>
          Payout Forecast Details
        </div>
        <div style={{ marginBottom: 8 }}>
          This forecast includes both <strong>completed claims</strong> awaiting payment and <strong>scheduled appointments</strong> for future work.
        </div>
        <div style={{ marginBottom: 8 }}>
          • Completed claims: Uses actual <strong>file_total</strong> or <strong>pay_amount</strong>
        </div>
        <div style={{ marginBottom: 8 }}>
          • Scheduled claims: Uses <strong>pay_amount</strong> set in the calendar
        </div>
        <div>
          Payout dates calculated from historical deposit patterns for each firm. All recurring firms included (Sedgwick, Legacy, ACD, ClaimSolution, Complete Claims, Doan, HEA, IANET, AMA, A-TEAM, Frontline).
        </div>
      </div>
    </div>
  );
}

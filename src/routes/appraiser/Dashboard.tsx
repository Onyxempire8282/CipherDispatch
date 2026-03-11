import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import "./appraiser-dashboard.css";

interface TodayClaim {
  id: string;
  claim_number: string;
  customer_name: string;
  status: string;
  appointment_start: string;
  address_line1?: string;
  city?: string;
  state?: string;
}

interface Stats {
  openClaims: number;
  doneThisMonth: number;
  completionRate: string;
  avgCycleTime: string;
  thisWeek: number;
  totalAssigned: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "GOOD MORNING";
  if (hour < 17) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AppraiserDashboard() {
  const [firstName, setFirstName] = useState("");
  const [todayClaims, setTodayClaims] = useState<TodayClaim[]>([]);
  const [stats, setStats] = useState<Stats>({
    openClaims: 0,
    doneThisMonth: 0,
    completionRate: "0%",
    avgCycleTime: "---",
    thisWeek: 0,
    totalAssigned: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get first name from profile or auth metadata
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const fullName =
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email ||
        "Appraiser";
      setFirstName(fullName.split(" ")[0]);

      // Today's date boundaries
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

      // Today's run claims
      const { data: todayData } = await supabase
        .from("claims_v")
        .select(
          "id, claim_number, customer_name, status, appointment_start, address_line1, city, state"
        )
        .eq("assigned_to", user.id)
        .gte("appointment_start", todayStart)
        .lt("appointment_start", todayEnd)
        .not("status", "in", '("COMPLETED","CANCELED")')
        .order("appointment_start", { ascending: true })
        .limit(3);

      setTodayClaims((todayData as TodayClaim[]) || []);

      // Count of all today's claims (for "VIEW ALL N STOPS" link)
      const { count: todayTotal } = await supabase
        .from("claims_v")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", user.id)
        .gte("appointment_start", todayStart)
        .lt("appointment_start", todayEnd)
        .not("status", "in", '("COMPLETED","CANCELED")');

      // Store total for display
      if (todayTotal && todayTotal > 3) {
        setTodayClaims((prev) => {
          // Tag with total count via a workaround — store in state
          (prev as any).__totalCount = todayTotal;
          return [...prev];
        });
      }

      // Performance stats — all claims assigned to this user
      const { data: allClaims } = await supabase
        .from("claims_v")
        .select("status, created_at, completion_date, completed_month")
        .eq("assigned_to", user.id);

      if (allClaims) {
        const total = allClaims.length;
        const open = allClaims.filter(
          (c) => c.status !== "COMPLETED" && c.status !== "CANCELED"
        ).length;
        const completed = allClaims.filter(
          (c) => c.status === "COMPLETED"
        );

        // Done this month
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const doneThisMonth = completed.filter(
          (c) => c.completed_month === monthStr
        ).length;

        // Completion rate
        const rate =
          total > 0 ? Math.round((completed.length / total) * 100) : 0;

        // Average cycle time
        let avgDays = 0;
        const withCycle = completed.filter(
          (c) => c.created_at && c.completion_date
        );
        if (withCycle.length > 0) {
          const totalDays = withCycle.reduce((sum, c) => {
            const diff =
              new Date(c.completion_date).getTime() -
              new Date(c.created_at).getTime();
            return sum + diff / (1000 * 60 * 60 * 24);
          }, 0);
          avgDays = totalDays / withCycle.length;
        }

        // This week (Monday start)
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - mondayOffset
        );
        const mondayStr = monday.toISOString();
        const thisWeek = completed.filter(
          (c) =>
            c.completion_date &&
            new Date(c.completion_date).getTime() >= monday.getTime()
        ).length;

        setStats({
          openClaims: open,
          doneThisMonth,
          completionRate: `${rate}%`,
          avgCycleTime:
            withCycle.length > 0 ? `${avgDays.toFixed(1)} days` : "---",
          thisWeek,
          totalAssigned: total,
        });
      }

      // Store today total separately
      setTodayTotal(todayTotal || 0);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const [todayTotal, setTodayTotal] = useState(0);

  if (loading) {
    return (
      <div className="app-dash">
        <div className="app-dash__content">
          <div className="app-dash__header">
            <div className="app-dash__eyebrow">CIPHER DISPATCH</div>
            <div className="app-dash__greeting">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-dash">
      <div className="app-dash__content">
        {/* Section 1: Header */}
        <div className="app-dash__header">
          <div className="app-dash__eyebrow">CIPHER DISPATCH</div>
          <div className="app-dash__greeting">
            {getGreeting()}, {firstName.toUpperCase()}
          </div>
        </div>

        {/* Section 2: Today's Run Preview */}
        <div className="app-dash__section-label">TODAY'S RUN</div>
        {todayClaims.length > 0 ? (
          <>
            <div className="app-dash__run-list">
              {todayClaims.map((claim) => (
                <Link
                  key={claim.id}
                  to={`/claim/${claim.id}`}
                  className="app-dash__run-card"
                >
                  <div className="app-dash__run-time">
                    {formatTime(claim.appointment_start)}
                  </div>
                  <div className="app-dash__run-info">
                    <div className="app-dash__run-name">
                      {claim.customer_name}
                    </div>
                    <div className="app-dash__run-address">
                      {[claim.address_line1, claim.city, claim.state]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                  <div className="app-dash__run-badge">{claim.status}</div>
                </Link>
              ))}
            </div>
            {todayTotal > 3 && (
              <Link to="/my-routes" className="app-dash__run-link">
                VIEW ALL {todayTotal} STOPS &rarr;
              </Link>
            )}
          </>
        ) : (
          <div className="app-dash__run-empty">
            NO STOPS SCHEDULED TODAY
            <br />
            <Link to="/calendar" className="app-dash__run-link">
              VIEW FULL SCHEDULE &rarr;
            </Link>
          </div>
        )}

        {/* Section 3: Performance Stats */}
        <div className="app-dash__section-label">YOUR SCORECARD</div>
        <div className="app-dash__stats">
          <div className="app-dash__stat">
            <div className="app-dash__stat-label">OPEN CLAIMS</div>
            <div className="app-dash__stat-value">{stats.openClaims}</div>
          </div>
          <div className="app-dash__stat">
            <div className="app-dash__stat-label">DONE THIS MONTH</div>
            <div className="app-dash__stat-value">{stats.doneThisMonth}</div>
          </div>
          <div className="app-dash__stat">
            <div className="app-dash__stat-label">COMPLETION RATE</div>
            <div className="app-dash__stat-value">{stats.completionRate}</div>
          </div>
          <div className="app-dash__stat">
            <div className="app-dash__stat-label">AVG CYCLE TIME</div>
            <div className="app-dash__stat-value">{stats.avgCycleTime}</div>
          </div>
          <div className="app-dash__stat">
            <div className="app-dash__stat-label">THIS WEEK</div>
            <div className="app-dash__stat-value">{stats.thisWeek}</div>
          </div>
          <div className="app-dash__stat">
            <div className="app-dash__stat-label">TOTAL ASSIGNED</div>
            <div className="app-dash__stat-value">{stats.totalAssigned}</div>
          </div>
        </div>

        {/* Section 4: Quick Access */}
        <div className="app-dash__section-label">QUICK ACCESS</div>
        <div className="app-dash__quick">
          <Link to="/my-claims" className="app-dash__quick-card">
            <div className="app-dash__quick-badge">CL</div>
            <div className="app-dash__quick-label">MY CLAIMS</div>
          </Link>
          <Link to="/calendar" className="app-dash__quick-card">
            <div className="app-dash__quick-badge">CA</div>
            <div className="app-dash__quick-label">CALENDAR</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

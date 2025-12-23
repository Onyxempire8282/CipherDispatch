import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";
import { getPayoutPeriod, calculateMonthlyRevenue, PayCycleType } from "../../utils/payoutCalculations";

export default function PayoutDashboard() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'all' | 'weekly' | 'biweekly' | 'monthly'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [vendorsRes, claimsRes] = await Promise.all([
      supabase.from('vendors').select('*').eq('active', true),
      supabase.from('claims').select('*').eq('status', 'COMPLETED')
    ]);

    const vendorsList = vendorsRes.data || [];
    const claimsList = claimsRes.data || [];

    setVendors(vendorsList);
    setClaims(claimsList);

    // Calculate payouts
    const payoutData = vendorsList.map(vendor => {
      const referenceDate = vendor.reference_pay_date ? new Date(vendor.reference_pay_date) : undefined;
      const period = getPayoutPeriod(
        vendor.pay_cycle_type as PayCycleType,
        new Date(),
        referenceDate
      );
      const vendorClaims = claimsList.filter(c => c.firm_name === vendor.name);

      const currentPeriodClaims = vendorClaims.filter(c => {
        if (!c.completion_date) return false;
        const d = new Date(c.completion_date);
        return d >= period.startDate && d <= period.endDate;
      });

      const total = currentPeriodClaims.reduce((sum, c) => sum + (c.file_total || 0), 0);

      return {
        vendorName: vendor.name,
        cycleType: vendor.pay_cycle_type,
        payDate: period.payDate,
        periodName: period.periodName,
        total,
        claimCount: currentPeriodClaims.length,
        color: vendor.color
      };
    });

    setPayouts(payoutData);
    setLoading(false);
  };

  const filteredPayouts = payouts.filter(p => {
    if (viewFilter === 'all') return true;
    if (viewFilter === 'weekly') return p.cycleType === 'weekly_thu_fri_thu';
    if (viewFilter === 'biweekly') return p.cycleType.startsWith('biweekly');
    if (viewFilter === 'monthly') return p.cycleType.includes('monthly') || p.cycleType === 'semimonthly_15th_end';
    return true;
  });

  const now = new Date();
  const monthlyRevenue = calculateMonthlyRevenue(claims, now.getMonth(), now.getFullYear());
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
  const nextMonthRevenue = calculateMonthlyRevenue(claims, nextMonth.getMonth(), nextMonth.getFullYear());

  if (loading) return <div style={{ padding: 40, color: '#e2e8f0' }}>Loading...</div>;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1a202c 0%, #2d3748 100%)",
      padding: 16,
    }}>
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
            Payout Dashboard
          </h3>
        </div>
      </div>

      {/* Monthly Revenue Summary */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{
          background: "#2d3748",
          border: "1px solid #10b981",
          borderRadius: 12,
          padding: 24
        }}>
          <div style={{ color: "#a0aec0", fontSize: 14, marginBottom: 8 }}>This Month Revenue</div>
          <div style={{ color: "#10b981", fontSize: 32, fontWeight: "bold" }}>
            ${monthlyRevenue.toFixed(2)}
          </div>
        </div>
        <div style={{
          background: "#2d3748",
          border: "1px solid #667eea",
          borderRadius: 12,
          padding: 24
        }}>
          <div style={{ color: "#a0aec0", fontSize: 14, marginBottom: 8 }}>Projected Next Month</div>
          <div style={{ color: "#667eea", fontSize: 32, fontWeight: "bold" }}>
            ${nextMonthRevenue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {['all', 'weekly', 'biweekly', 'monthly'].map(filter => (
          <button
            key={filter}
            onClick={() => setViewFilter(filter as any)}
            style={{
              padding: "10px 20px",
              background: viewFilter === filter ? "#667eea" : "#4a5568",
              color: "white",
              border: "none",
              borderRadius: 6,
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            {filter === 'all' ? 'All Upcoming' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Payout List */}
      <div style={{ display: "grid", gap: 16 }}>
        {filteredPayouts.map((payout, idx) => (
          <div key={idx} style={{
            background: "#2d3748",
            border: `2px solid ${payout.color}`,
            borderRadius: 12,
            padding: 24,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr auto",
            gap: 24,
            alignItems: "center"
          }}>
            <div>
              <div style={{ color: "#a0aec0", fontSize: 12 }}>Vendor</div>
              <div style={{ color: "#e2e8f0", fontSize: 18, fontWeight: "bold" }}>{payout.vendorName}</div>
            </div>
            <div>
              <div style={{ color: "#a0aec0", fontSize: 12 }}>Period</div>
              <div style={{ color: "#e2e8f0", fontSize: 16 }}>{payout.periodName}</div>
            </div>
            <div>
              <div style={{ color: "#a0aec0", fontSize: 12 }}>Pay Date</div>
              <div style={{ color: "#10b981", fontSize: 16, fontWeight: "bold" }}>
                {payout.payDate.toLocaleDateString()}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#a0aec0", fontSize: 12 }}>{payout.claimCount} claims</div>
              <div style={{ color: "#e2e8f0", fontSize: 24, fontWeight: "bold" }}>
                ${payout.total.toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

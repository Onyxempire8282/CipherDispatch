/**
 * Payout Forecast Dashboard
 * Displays forecasted payouts based on PAYOUT DATE ONLY
 * CRITICAL: All views filter by payoutDate, never by work dates
 */

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { supabaseCD } from "../../lib/supabaseCD";
import {
  forecastPayouts,
  getWeeklyView,
  getMonthlyView,
  getUpcomingPayouts,
  PayoutForecast,
  FirmSchedule,
  WeeklyTotal,
  MonthlyTotal,
  Claim
} from "../../utils/payoutForecasting";
import { normalizeFirmNameForConfig } from "../../utils/firmFeeConfig";
import { NavBar } from "../../components/NavBar";
import PageHeader from "../../components/ui/PageHeader";
import { PayoutSummaryCards } from "../../components/PayoutSummaryCards";
import { PayoutUpcomingView } from "../../components/PayoutUpcomingView";
import { PayoutWeeklyView } from "../../components/PayoutWeeklyView";
import { PayoutMonthlyView } from "../../components/PayoutMonthlyView";
import { PayoutDetailModal } from "../../components/PayoutDetailModal";
import "../../styles/payout-dashboard.css";

interface ClaimDetail extends Claim {
  claim_number?: string;
  customer_name?: string;
}

type ViewMode = 'upcoming' | 'weekly' | 'monthly';

export default function PayoutDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payouts, setPayouts] = useState<PayoutForecast[]>([]);
  const [weeklyView, setWeeklyView] = useState<WeeklyTotal[]>([]);
  const [monthlyView, setMonthlyView] = useState<MonthlyTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
  const [selectedPayout, setSelectedPayout] = useState<PayoutForecast | null>(null);
  const [payoutClaims, setPayoutClaims] = useState<ClaimDetail[]>([]);
  const [firmSchedules, setFirmSchedules] = useState<Record<string, FirmSchedule>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [claimsRes, vendorsRes] = await Promise.all([
        supabaseCD
          .from('claims')
          .select("*")
          .is('archived_at', null)
          .or('status.eq.COMPLETED,status.eq.SCHEDULED,status.eq.IN_PROGRESS'),
        supabaseCD
          .from('vendors')
          .select('name, pay_schedule_type, pay_day, reference_date')
          .eq('active', true)
      ]);

      if (claimsRes.error) throw claimsRes.error;

      const allClaims = ((claimsRes.data || []) as Claim[]).filter((c: any) => !c.is_supplement);
      setClaims(allClaims);

      // Build firm schedules map from vendors table
      const schedules: Record<string, FirmSchedule> = Object.fromEntries(
        (vendorsRes.data || [])
          .filter((v: any) => v.pay_schedule_type)
          .map((v: any) => [
            normalizeFirmNameForConfig(v.name),
            {
              pay_schedule_type: v.pay_schedule_type,
              pay_day: v.pay_day ?? 0,
              reference_date: v.reference_date ? new Date(v.reference_date) : undefined
            }
          ])
      );
      setFirmSchedules(schedules);

      const allPayouts = forecastPayouts(allClaims, schedules);
      setPayouts(allPayouts);

      setWeeklyView(getWeeklyView(allPayouts));
      setMonthlyView(getMonthlyView(allPayouts));
    } catch (error: any) {
      console.error('Error loading payout data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutClick = async (payout: PayoutForecast) => {
    setSelectedPayout(payout);

    try {
      const { data: claimDetails, error } = await supabaseCD
        .from('claims')
        .select("*")
        .is('archived_at', null)
        .in('id', payout.claimIds);

      if (error) throw error;
      setPayoutClaims(claimDetails || []);
    } catch (error: any) {
      console.error('Error loading claim details:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleUpdateAmount = async (claimId: string, newAmount: number, claim: ClaimDetail) => {
    try {
      // Determine which field to update based on claim status and current values
      // For COMPLETED claims: update file_total if it exists, otherwise pay_amount
      // For SCHEDULED claims: always update pay_amount
      const updateData: any = {};

      if (claim.status === 'COMPLETED') {
        // For completed claims, update the field that's currently being displayed
        if (claim.file_total != null) {
          updateData.file_total = newAmount;
        } else {
          updateData.pay_amount = newAmount;
        }
      } else {
        // For scheduled claims, always update pay_amount
        updateData.pay_amount = newAmount;
      }

      const { error } = await supabaseCD
        .from('claims')
        .update(updateData)
        .eq('id', claimId);

      if (error) throw error;

      // Update local state immediately
      setPayoutClaims(prev => prev.map(c =>
        c.id === claimId ? { ...c, ...updateData } : c
      ));

      // Reload all data to update totals
      await loadData();

      // Re-fetch claims for this payout to ensure consistency
      if (selectedPayout) {
        const { data: claimDetails } = await supabaseCD
          .from('claims')
          .select("*")
          .is('archived_at', null)
          .in('id', selectedPayout.claimIds);
        setPayoutClaims(claimDetails || []);
      }
    } catch (error: any) {
      console.error('Error updating amount:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const upcomingPayouts = getUpcomingPayouts(payouts, 30);

  if (loading) {
    return (
      <div className="payout-dashboard__loading">
        Loading payout forecasts...
      </div>
    );
  }

  return (
    <div className="payout-dashboard">
      <NavBar role="admin" />
      <PageHeader
        label="Finance"
        title="Payout Forecast"
        sub={`${payouts.length} upcoming payouts across all firms`}
      />

      <div className="payout-dashboard__body">
      {/* Summary Cards */}
      <PayoutSummaryCards payouts={payouts} />

      {/* View Mode Buttons */}
      <div className="payout-dashboard__view-buttons">
        {(['upcoming', 'weekly', 'monthly'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`payout-dashboard__view-button ${
              viewMode === mode ? 'payout-dashboard__view-button--active' : ''
            }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* View Content */}
      <div className="payout-dashboard__view-container">
        {viewMode === 'upcoming' && (
          <>
            <h4 className="payout-dashboard__view-header">
              Next 30 Days - Payouts Occurring ({upcomingPayouts.length} payouts)
            </h4>
            <PayoutUpcomingView
              payouts={upcomingPayouts}
              onPayoutClick={handlePayoutClick}
            />
          </>
        )}

        {viewMode === 'weekly' && (
          <>
            <h4 className="payout-dashboard__view-header">
              Weekly Totals - Grouped by Payout Date ({weeklyView.length} weeks)
            </h4>
            <PayoutWeeklyView weeklyView={weeklyView} />
          </>
        )}

        {viewMode === 'monthly' && (
          <>
            <h4 className="payout-dashboard__view-header">
              Monthly Totals - Grouped by Payout Date ({monthlyView.length} months)
            </h4>
            <PayoutMonthlyView monthlyView={monthlyView} />
          </>
        )}
      </div>

      {/* Payout Detail Modal */}
      {selectedPayout && (
        <PayoutDetailModal
          payout={selectedPayout}
          claims={payoutClaims}
          firmSchedule={firmSchedules[selectedPayout.firm]}
          onClose={() => setSelectedPayout(null)}
          onUpdateAmount={handleUpdateAmount}
          onUpdateReferenceDate={async (firmName, newDate) => {
            await supabaseCD
              .from('vendors')
              .update({ reference_date: newDate, reference_date_updated_at: new Date().toISOString() })
              .eq('name', firmName);
            await loadData();
          }}
        />
      )}

      {/* Info Box */}
      <div className="payout-dashboard__info-box">
        <div className="payout-dashboard__info-title">
          Payout Forecast Details
        </div>
        <div className="payout-dashboard__info-text">
          This forecast includes both <strong>completed claims</strong> awaiting payment and <strong>scheduled appointments</strong> for future work.
        </div>
        <div className="payout-dashboard__info-text">
          • Completed claims: Uses actual <strong>file_total</strong> or <strong>pay_amount</strong>
        </div>
        <div className="payout-dashboard__info-text">
          • Scheduled claims: Uses <strong>pay_amount</strong> set in the calendar
        </div>
        <div className="payout-dashboard__info-text">
          <strong>IMPORTANT:</strong> All views display payouts grouped by <strong>when the payout occurs</strong>, not when the work was performed. For example, December work for firms like ACD, IANET, and Legacy typically pays out in January.
        </div>
        <div className="payout-dashboard__info-text">
          Payout dates calculated from historical deposit patterns for each firm. All recurring firms included (Sedgwick, Legacy, ACD, ClaimSolution, Complete Claims, Doan, HEA, IANET, AMA, A-TEAM, Frontline).
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * KPI Dashboard Page
 * Displays month-over-month performance metrics for meetings with TPAs, carriers, and ops
 *
 * Primary view: Last full month vs Current MTD
 * Core KPIs: Total Claims, Gross Revenue, Avg $/Claim
 * Team metrics: Admin, Photography, Inspection contributions
 */

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { startOfMonth, subMonths, endOfMonth } from 'date-fns';

import {
  buildMonthComparison,
  calculateTeamMetrics,
  calculateEfficiencyMetrics,
} from '../../utils/kpiCalculations';
import {
  fetchKPIClaimsTwoQuery,
  fetchPhotoMetrics,
} from '../../utils/kpiQueries';
import type {
  KPIClaim,
  MonthComparison,
  TeamMetrics,
  EfficiencyMetrics,
} from '../../types/kpi';

import { MonthComparisonCards } from '../../components/kpi/MonthComparisonCards';
import { VolumeIndicators } from '../../components/kpi/VolumeIndicators';
import { PipelineStatus } from '../../components/kpi/PipelineStatus';
import { TeamContributions } from '../../components/kpi/TeamContributions';
import { EfficiencySnapshot } from '../../components/kpi/EfficiencySnapshot';

import '../../styles/kpi-dashboard.css';

export default function KPIDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [comparison, setComparison] = useState<MonthComparison | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null);

  const loadData = useCallback(async () => {
    try {
      const today = new Date();

      // Calculate date range: start of last month to today
      const lastMonthStart = startOfMonth(subMonths(today, 1));
      const currentMonthEnd = endOfMonth(today);

      // Fetch claims and photo metrics in parallel
      const [claims, photoMetrics] = await Promise.all([
        fetchKPIClaimsTwoQuery(lastMonthStart, currentMonthEnd),
        fetchPhotoMetrics(lastMonthStart, currentMonthEnd),
      ]);

      // Build comparison metrics
      const comparisonData = buildMonthComparison(claims, today);
      setComparison(comparisonData);

      // Build team metrics for current month
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      const teamData = calculateTeamMetrics(claims, currentYear, currentMonth, photoMetrics);
      setTeamMetrics(teamData);

      // Build efficiency metrics for current month
      const efficiencyData = calculateEfficiencyMetrics(claims, currentYear, currentMonth);
      setEfficiencyMetrics(efficiencyData);

      setError(null);
    } catch (err: any) {
      console.error('Error loading KPI data:', err);
      setError(err.message || 'Failed to load KPI data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <div className="kpi-dashboard__loading">
        Loading KPI Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="kpi-dashboard__error">
        <div>Error: {error}</div>
        <button className="kpi-dashboard__error-retry" onClick={handleRefresh}>
          Retry
        </button>
      </div>
    );
  }

  if (!comparison || !teamMetrics || !efficiencyMetrics) {
    return (
      <div className="kpi-dashboard__error">
        <div>No data available</div>
        <button className="kpi-dashboard__error-retry" onClick={handleRefresh}>
          Retry
        </button>
      </div>
    );
  }

  const { lastMonth, currentMTD } = comparison;

  return (
    <div className="kpi-dashboard">
      {/* Header */}
      <div className="kpi-dashboard__header">
        <div className="kpi-dashboard__header-left">
          <Link to="/" className="kpi-dashboard__home-link">
            ← Home
          </Link>
          <h1 className="kpi-dashboard__title">KPI Dashboard</h1>
        </div>
        <div>
          <span className="kpi-dashboard__period-label">
            {lastMonth.monthName} vs {currentMTD.monthName} MTD
          </span>
          <button
            className="kpi-dashboard__refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ marginLeft: '16px' }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Section: Monthly Comparison (Primary) */}
      <section className="kpi-dashboard__section">
        <h2 className="kpi-dashboard__section-header">
          Monthly Comparison: {lastMonth.monthName} vs {currentMTD.monthName} (MTD)
        </h2>
        <MonthComparisonCards comparison={comparison} />
      </section>

      {/* Section: Volume & Pipeline (Two Column) */}
      <div className="kpi-dashboard__two-col">
        <VolumeIndicators snapshot={currentMTD} />
        <PipelineStatus snapshot={currentMTD} />
      </div>

      {/* Section: Team Contributions */}
      <section className="kpi-dashboard__section">
        <h2 className="kpi-dashboard__section-header">
          Team Contributions ({currentMTD.monthName} MTD)
        </h2>
        <TeamContributions metrics={teamMetrics} monthName={currentMTD.monthName} />
      </section>

      {/* Section: Efficiency */}
      <section className="kpi-dashboard__section">
        <EfficiencySnapshot metrics={efficiencyMetrics} monthName={currentMTD.monthName} />
      </section>
    </div>
  );
}

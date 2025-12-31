/**
 * Intelligence Dashboard
 * Comprehensive business intelligence visualization
 * Real-time data from all analytics APIs
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { FirmReliabilityReport } from '../../utils/firmReliability';
import { PayoutVarianceReport } from '../../utils/payoutVariance';
import { CapacityStressReport } from '../../utils/capacityStress';
import { RevenueRiskReport } from '../../utils/revenueRisk';
import { SurvivalRunwayReport } from '../../utils/survivalRunway';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Intelligence() {
  const [firmReliability, setFirmReliability] = useState<FirmReliabilityReport | null>(null);
  const [payoutVariance, setPayoutVariance] = useState<PayoutVarianceReport | null>(null);
  const [capacityStress, setCapacityStress] = useState<CapacityStressReport | null>(null);
  const [revenueRisk, setRevenueRisk] = useState<RevenueRiskReport | null>(null);
  const [survivalRunway, setSurvivalRunway] = useState<SurvivalRunwayReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch all API data in parallel
        const [reliability, variance, capacity, revenue, runway] = await Promise.all([
          fetch('/api/firm-reliability').then(r => r.json()),
          fetch('/api/payout-variance').then(r => r.json()),
          fetch('/api/capacity-stress').then(r => r.json()),
          fetch('/api/revenue-risk').then(r => r.json()),
          fetch('/api/survival-runway').then(r => r.json())
        ]);

        if (reliability.status === 'success') setFirmReliability(reliability.data);
        if (variance.status === 'success') setPayoutVariance(variance.data);
        if (capacity.status === 'success') setCapacityStress(capacity.data);
        if (revenue.status === 'success') setRevenueRisk(revenue.data);
        if (runway.status === 'success') setSurvivalRunway(runway.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load intelligence data');
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Business Intelligence</h1>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">Loading intelligence data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Business Intelligence</h1>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-400">Error loading data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Chart: Firm Payment Reliability (Top 10 firms)
  const firmReliabilityChart = firmReliability ? {
    labels: firmReliability.metrics_by_firm.slice(0, 10).map(f => f.firm_name),
    datasets: [
      {
        label: 'On-Time %',
        data: firmReliability.metrics_by_firm.slice(0, 10).map(f => f.on_time_percentage),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2
      },
      {
        label: 'Avg Days Late',
        data: firmReliability.metrics_by_firm.slice(0, 10).map(f => f.avg_days_late),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        yAxisID: 'y1'
      }
    ]
  } : null;

  // Chart: Payout Variance (Expected vs Actual)
  const payoutVarianceChart = payoutVariance ? {
    labels: payoutVariance.weekly_data.map(w => w.week_label),
    datasets: [
      {
        label: 'Expected Payout',
        data: payoutVariance.weekly_data.map(w => w.expected_payout),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Actual Paid',
        data: payoutVariance.weekly_data.map(w => w.actual_paid),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  } : null;

  // Chart: Capacity Stress Trend
  const capacityStressChart = capacityStress ? {
    labels: capacityStress.weekly_data.map(w => w.week_label),
    datasets: [
      {
        label: 'Claims Assigned',
        data: capacityStress.weekly_data.map(w => w.claims_assigned),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2
      },
      {
        label: 'Claims Completed',
        data: capacityStress.weekly_data.map(w => w.claims_completed),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2
      },
      {
        label: 'Backlog Growth',
        data: capacityStress.weekly_data.map(w => w.backlog_growth),
        backgroundColor: capacityStress.weekly_data.map(w =>
          w.backlog_growth > 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)'
        ),
        borderColor: 'rgba(139, 92, 246, 1)',
        borderWidth: 2
      }
    ]
  } : null;

  // Chart: Revenue Dependency Risk (Top 10 firms)
  const revenueRiskChart = revenueRisk ? {
    labels: revenueRisk.top_3_firms.map(f => f.normalized_name),
    datasets: [{
      label: 'Revenue Share %',
      data: revenueRisk.top_3_firms.map(f => f.revenue_share_percentage),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',   // Red for #1
        'rgba(245, 158, 11, 0.8)',  // Orange for #2
        'rgba(234, 179, 8, 0.8)'    // Yellow for #3
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(234, 179, 8, 1)'
      ],
      borderWidth: 2
    }]
  } : null;

  // Chart: 30-Day Survival Forecast
  const survivalRunwayChart = survivalRunway ? {
    labels: survivalRunway.daily_forecast.map(d => {
      const date = new Date(d.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }),
    datasets: [
      {
        label: 'Expected Cash (Cumulative)',
        data: survivalRunway.daily_forecast.map(d => d.cumulative_expected),
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Delayed Scenario (Cumulative)',
        data: survivalRunway.daily_forecast.map(d => d.cumulative_delayed),
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
        borderDash: [5, 5]
      }
    ]
  } : null;

  // Chart options - dark theme
  const darkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#e5e7eb' }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
        borderColor: '#4b5563',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' }
      },
      y: {
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' }
      }
    }
  };

  const firmReliabilityOptions = {
    ...darkChartOptions,
    scales: {
      ...darkChartOptions.scales,
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        ticks: { color: '#9ca3af' },
        grid: { color: 'rgba(75, 85, 99, 0.3)' },
        title: {
          display: true,
          text: 'On-Time Percentage',
          color: '#9ca3af'
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        ticks: { color: '#9ca3af' },
        grid: { display: false },
        title: {
          display: true,
          text: 'Avg Days Late',
          color: '#9ca3af'
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Business Intelligence</h1>
              <p className="text-gray-400 mt-2">Real-time analytics and performance metrics</p>
            </div>
            <Link
              to="/admin/claims"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700"
            >
              ← Back to Claims
            </Link>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {survivalRunway && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Expected Cash (30 Days)</div>
              <div className="text-2xl font-bold text-green-400">
                ${survivalRunway.expected_cash_in_30_days.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {survivalRunway.summary.total_payouts_expected} payouts expected
              </div>
            </div>
          )}

          {revenueRisk && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Top 3 Dependency</div>
              <div className={`text-2xl font-bold ${
                revenueRisk.top_3_firm_dependency_ratio > 80 ? 'text-red-400' :
                revenueRisk.top_3_firm_dependency_ratio > 60 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {revenueRisk.top_3_firm_dependency_ratio.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1 uppercase">
                {revenueRisk.risk_assessment.concentration_level} risk
              </div>
            </div>
          )}

          {capacityStress && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Backlog Status</div>
              <div className={`text-2xl font-bold uppercase ${
                capacityStress.capacity_indicators.backlog_status === 'healthy' ? 'text-green-400' :
                capacityStress.capacity_indicators.backlog_status === 'warning' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {capacityStress.capacity_indicators.backlog_status}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {capacityStress.summary.avg_backlog_growth.toFixed(1)} avg growth/week
              </div>
            </div>
          )}

          {payoutVariance && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Payout Accuracy</div>
              <div className={`text-2xl font-bold ${
                payoutVariance.summary.accuracy_percentage > 95 ? 'text-green-400' :
                payoutVariance.summary.accuracy_percentage > 85 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {payoutVariance.summary.accuracy_percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ${Math.abs(payoutVariance.summary.total_variance).toLocaleString()} variance
              </div>
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Firm Payment Reliability */}
          {firmReliabilityChart && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-blue-400">Firm Payment Reliability</h2>
              <div style={{ height: '300px' }}>
                <Bar data={firmReliabilityChart} options={firmReliabilityOptions} />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Top 10 firms by claim volume • On-time % vs Avg days late
              </div>
            </div>
          )}

          {/* Weekly Expected vs Actual Payouts */}
          {payoutVarianceChart && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-green-400">Weekly Expected vs Actual Payouts</h2>
              <div style={{ height: '300px' }}>
                <Line data={payoutVarianceChart} options={darkChartOptions} />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Last {payoutVariance?.historical_weeks} weeks • Forecast accuracy tracking
              </div>
            </div>
          )}

          {/* Capacity Stress Trend */}
          {capacityStressChart && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-purple-400">Capacity Stress Trend</h2>
              <div style={{ height: '300px' }}>
                <Bar data={capacityStressChart} options={darkChartOptions} />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Assigned vs completed claims • Backlog growth indicator
              </div>
            </div>
          )}

          {/* Revenue Dependency Risk */}
          {revenueRiskChart && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">Revenue Dependency Risk</h2>
              <div style={{ height: '300px' }}>
                <Doughnut
                  data={revenueRiskChart}
                  options={{
                    ...darkChartOptions,
                    scales: undefined,
                    plugins: {
                      ...darkChartOptions.plugins,
                      legend: {
                        position: 'bottom' as const,
                        labels: { color: '#e5e7eb' }
                      }
                    }
                  }}
                />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Top 3 firms = {revenueRisk?.top_3_firm_dependency_ratio.toFixed(1)}% of revenue
              </div>
            </div>
          )}

          {/* 30-Day Survival Forecast - Full Width */}
          {survivalRunwayChart && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 lg:col-span-2">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">30-Day Survival Forecast</h2>
              <div style={{ height: '300px' }}>
                <Line data={survivalRunwayChart} options={darkChartOptions} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Expected Cash</div>
                  <div className="text-green-400 font-bold">
                    ${survivalRunway?.expected_cash_in_30_days.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">If 7-Day Delay</div>
                  <div className="text-red-400 font-bold">
                    -${Math.abs(survivalRunway?.delayed_payment_impact || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Impact Level</div>
                  <div className={`font-bold uppercase ${
                    survivalRunway?.risk_assessment.impact_level === 'low' ? 'text-green-400' :
                    survivalRunway?.risk_assessment.impact_level === 'moderate' ? 'text-yellow-400' :
                    survivalRunway?.risk_assessment.impact_level === 'high' ? 'text-orange-400' :
                    'text-red-400'
                  }`}>
                    {survivalRunway?.risk_assessment.impact_level}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {survivalRunway && survivalRunway.risk_assessment.recommendations.length > 0 && (
            <div className={`rounded-lg p-6 border-2 ${
              survivalRunway.risk_assessment.impact_level === 'critical' ? 'bg-red-900/20 border-red-500' :
              survivalRunway.risk_assessment.impact_level === 'high' ? 'bg-orange-900/20 border-orange-500' :
              survivalRunway.risk_assessment.impact_level === 'moderate' ? 'bg-blue-900/20 border-blue-500' :
              'bg-green-900/20 border-green-500'
            }`}>
              <h3 className="text-lg font-bold mb-3">Cash Flow Recommendations</h3>
              <ul className="space-y-2">
                {survivalRunway.risk_assessment.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm flex items-start">
                    <span className="mr-2">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {revenueRisk && revenueRisk.risk_assessment.recommendations.length > 0 && (
            <div className={`rounded-lg p-6 border-2 ${
              revenueRisk.risk_assessment.concentration_level === 'critical' ? 'bg-red-900/20 border-red-500' :
              revenueRisk.risk_assessment.concentration_level === 'high' ? 'bg-orange-900/20 border-orange-500' :
              revenueRisk.risk_assessment.concentration_level === 'moderate' ? 'bg-blue-900/20 border-blue-500' :
              'bg-green-900/20 border-green-500'
            }`}>
              <h3 className="text-lg font-bold mb-3">Revenue Risk Recommendations</h3>
              <ul className="space-y-2">
                {revenueRisk.risk_assessment.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm flex items-start">
                    <span className="mr-2">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Data updated: {new Date().toLocaleString()}</p>
          <p className="mt-2">
            APIs:
            <a href="/api/firm-reliability" className="text-blue-400 hover:underline ml-2">Firm Reliability</a> •
            <a href="/api/payout-variance" className="text-blue-400 hover:underline ml-2">Payout Variance</a> •
            <a href="/api/capacity-stress" className="text-blue-400 hover:underline ml-2">Capacity Stress</a> •
            <a href="/api/revenue-risk" className="text-blue-400 hover:underline ml-2">Revenue Risk</a> •
            <a href="/api/survival-runway" className="text-blue-400 hover:underline ml-2">Survival Runway</a>
          </p>
        </div>
      </div>
    </div>
  );
}

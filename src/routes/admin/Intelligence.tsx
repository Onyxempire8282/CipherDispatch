/**
 * Intelligence Dashboard
 * Comprehensive business intelligence visualization
 * Real-time data from all analytics APIs
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  generateFirmReliabilityReport,
  FirmReliabilityReport,
} from "../../utils/firmReliability";
import {
  generatePayoutVarianceReport,
  PayoutVarianceReport,
} from "../../utils/payoutVariance";
import {
  generateCapacityStressReport,
  CapacityStressReport,
} from "../../utils/capacityStress";
import {
  generateRevenueRiskReport,
  RevenueRiskReport,
} from "../../utils/revenueRisk";
import {
  generateSurvivalRunwayReport,
  SurvivalRunwayReport,
} from "../../utils/survivalRunway";
import {
  generateMonthlyPerformanceReport,
  MonthlyPerformanceReport,
} from "../../utils/monthlyPerformance";
import {
  generateMonthlyHistoryReport,
  MonthlyHistoryReport,
} from "../../utils/monthlyHistory";
import {
  generateSeasonalityProfileReport,
  SeasonalityProfileReport,
} from "../../utils/seasonalityProfile";
import {
  generateVolumeDependencyRiskReport,
  VolumeDependencyRiskReport,
} from "../../utils/volumeDependencyRisk";
import {
  generateValueEfficiencyReport,
  ValueEfficiencyReport,
} from "../../utils/valueEfficiency";

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
  const [firmReliability, setFirmReliability] =
    useState<FirmReliabilityReport | null>(null);
  const [payoutVariance, setPayoutVariance] =
    useState<PayoutVarianceReport | null>(null);
  const [capacityStress, setCapacityStress] =
    useState<CapacityStressReport | null>(null);
  const [revenueRisk, setRevenueRisk] = useState<RevenueRiskReport | null>(
    null
  );
  const [survivalRunway, setSurvivalRunway] =
    useState<SurvivalRunwayReport | null>(null);
  const [monthlyPerformance, setMonthlyPerformance] =
    useState<MonthlyPerformanceReport | null>(null);
  const [monthlyHistory, setMonthlyHistory] =
    useState<MonthlyHistoryReport | null>(null);
  const [seasonalityProfile, setSeasonalityProfile] =
    useState<SeasonalityProfileReport | null>(null);
  const [volumeDependencyRisk, setVolumeDependencyRisk] =
    useState<VolumeDependencyRiskReport | null>(null);
  const [valueEfficiency, setValueEfficiency] =
    useState<ValueEfficiencyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      setError(null);

      try {
        // Call utility functions directly instead of fetching
        // This works on GitHub Pages static hosting
        const [
          reliability,
          variance,
          capacity,
          revenue,
          runway,
          monthly,
          history,
          seasonality,
          volumeDep,
          valueEff,
        ] = await Promise.all([
          generateFirmReliabilityReport(),
          generatePayoutVarianceReport(),
          generateCapacityStressReport(),
          generateRevenueRiskReport(),
          generateSurvivalRunwayReport(),
          generateMonthlyPerformanceReport(),
          generateMonthlyHistoryReport(),
          generateSeasonalityProfileReport(),
          generateVolumeDependencyRiskReport(),
          generateValueEfficiencyReport(),
        ]);

        setFirmReliability(reliability);
        setPayoutVariance(variance);
        setCapacityStress(capacity);
        setRevenueRisk(revenue);
        setSurvivalRunway(runway);
        setMonthlyPerformance(monthly);
        setMonthlyHistory(history);
        setSeasonalityProfile(seasonality);
        setVolumeDependencyRisk(volumeDep);
        setValueEfficiency(valueEff);
      } catch (err: any) {
        setError(err.message || "Failed to load intelligence data");
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
  const firmReliabilityChart = firmReliability
    ? {
        labels: firmReliability.metrics_by_firm
          .slice(0, 10)
          .map((f) => f.firm_name),
        datasets: [
          {
            label: "On-Time %",
            data: firmReliability.metrics_by_firm
              .slice(0, 10)
              .map((f) => f.on_time_percentage),
            backgroundColor: "rgba(34, 197, 94, 0.8)",
            borderColor: "rgba(34, 197, 94, 1)",
            borderWidth: 2,
          },
          {
            label: "Avg Days Late",
            data: firmReliability.metrics_by_firm
              .slice(0, 10)
              .map((f) => f.avg_days_late),
            backgroundColor: "rgba(239, 68, 68, 0.8)",
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 2,
            yAxisID: "y1",
          },
        ],
      }
    : null;

  // Chart: Payout Variance (Expected vs Actual)
  const payoutVarianceChart = payoutVariance
    ? {
        labels: payoutVariance.weekly_data.map((w) => w.week_label),
        datasets: [
          {
            label: "Expected Payout",
            data: payoutVariance.weekly_data.map((w) => w.expected_payout),
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Actual Paid",
            data: payoutVariance.weekly_data.map((w) => w.actual_paid),
            borderColor: "rgba(34, 197, 94, 1)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      }
    : null;

  // Chart: Capacity Stress Trend
  const capacityStressChart = capacityStress
    ? {
        labels: capacityStress.weekly_data.map((w) => w.week_label),
        datasets: [
          {
            label: "Claims Assigned",
            data: capacityStress.weekly_data.map((w) => w.claims_assigned),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 2,
          },
          {
            label: "Claims Completed",
            data: capacityStress.weekly_data.map((w) => w.claims_completed),
            backgroundColor: "rgba(34, 197, 94, 0.8)",
            borderColor: "rgba(34, 197, 94, 1)",
            borderWidth: 2,
          },
          {
            label: "Backlog",
            data: capacityStress.weekly_data.map(
              (w) => w.claims_assigned - w.claims_completed
            ),
            backgroundColor: capacityStress.weekly_data.map((w) =>
              w.claims_assigned - w.claims_completed > 0
                ? "rgba(239, 68, 68, 0.8)"
                : "rgba(34, 197, 94, 0.8)"
            ),
            borderColor: "rgba(139, 92, 246, 1)",
            borderWidth: 2,
          },
        ],
      }
    : null;

  // Chart: Revenue Dependency Risk (Top 10 firms)
  const revenueRiskChart = revenueRisk
    ? {
        labels: revenueRisk.top_3_firms.map((f) => f.normalized_name),
        datasets: [
          {
            label: "Revenue Share %",
            data: revenueRisk.top_3_firms.map(
              (f) => f.revenue_share_percentage
            ),
            backgroundColor: [
              "rgba(239, 68, 68, 0.8)", // Red for #1
              "rgba(245, 158, 11, 0.8)", // Orange for #2
              "rgba(234, 179, 8, 0.8)", // Yellow for #3
            ],
            borderColor: [
              "rgba(239, 68, 68, 1)",
              "rgba(245, 158, 11, 1)",
              "rgba(234, 179, 8, 1)",
            ],
            borderWidth: 2,
          },
        ],
      }
    : null;

  // Chart: 30-Day Survival Forecast
  const survivalRunwayChart = survivalRunway
    ? {
        labels: survivalRunway.daily_forecast.map((d) => {
          const date = new Date(d.date);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
        datasets: [
          {
            label: "Expected Cash (Cumulative)",
            data: survivalRunway.daily_forecast.map(
              (d) => d.cumulative_expected
            ),
            borderColor: "rgba(34, 197, 94, 1)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            fill: true,
            tension: 0.4,
          },
          {
            label: "Delayed Scenario (Cumulative)",
            data: survivalRunway.daily_forecast.map(
              (d) => d.cumulative_delayed
            ),
            borderColor: "rgba(239, 68, 68, 1)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            fill: true,
            tension: 0.4,
            borderDash: [5, 5],
          },
        ],
      }
    : null;

  // Chart: Business Seasonality Wave – Avg Claims by Month
  const businessSeasonalityChart = seasonalityProfile
    ? {
        labels: [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ],
        datasets: Object.keys(seasonalityProfile).map((year, index) => {
          const yearData = seasonalityProfile[year] || [];
          const colors = [
            "rgba(34, 197, 94, 1)", // Green
            "rgba(59, 130, 246, 1)", // Blue
            "rgba(139, 92, 246, 1)", // Purple
            "rgba(249, 115, 22, 1)", // Orange
            "rgba(236, 72, 153, 1)", // Pink
            "rgba(234, 179, 8, 1)", // Yellow
          ];

          return {
            type: "line" as const,
            label: year,
            data: yearData.map((m) => m.completedClaims),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length].replace(
              "1)",
              "0.1)"
            ),
            borderWidth: 2,
            tension: 0.4,
            fill: false,
          };
        }),
      }
    : null;

  // Chart: Monthly Velocity Trend (Line)
  const monthlyVelocityTrendChart = monthlyHistory
    ? {
        labels: monthlyHistory.historical_performance.map((m) => m.month),
        datasets: [
          {
            label: "Avg Velocity (claims/day)",
            data: monthlyHistory.historical_performance.map(
              (m) => m.avg_velocity
            ),
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      }
    : null;

  // Chart: Burnout Ratio by Month (Line)
  const burnoutRatioChart = monthlyHistory
    ? {
        labels: monthlyHistory.historical_performance.map((m) => m.month),
        datasets: [
          {
            label: "Burnout Ratio",
            data: monthlyHistory.historical_performance.map(
              (m) => m.burnout_ratio
            ),
            borderColor: monthlyHistory.historical_performance.map((m) =>
              m.burnout_ratio > 1.05
                ? "rgba(239, 68, 68, 1)"
                : m.burnout_ratio > 0.85
                ? "rgba(249, 115, 22, 1)"
                : m.burnout_ratio > 0.6
                ? "rgba(234, 179, 8, 1)"
                : "rgba(34, 197, 94, 1)"
            ),
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            fill: true,
            tension: 0.4,
            segment: {
              borderColor: (ctx: any) => {
                const value = ctx.p1.parsed.y;
                return value > 1.05
                  ? "rgba(239, 68, 68, 1)"
                  : value > 0.85
                  ? "rgba(249, 115, 22, 1)"
                  : value > 0.6
                  ? "rgba(234, 179, 8, 1)"
                  : "rgba(34, 197, 94, 1)";
              },
            },
          },
        ],
      }
    : null;

  // Chart: Firm × Month Heatmap (prepare data structure)
  // For a heatmap in Chart.js, we'll create a bar chart with firms on X and months as stacked bars
  const firmMonthHeatmapData = monthlyHistory
    ? (() => {
        // Get unique firms
        const firms = Array.from(
          new Set(monthlyHistory.firm_activity.map((f) => f.firm_name))
        );
        // Get unique months
        const months = Array.from(
          new Set(monthlyHistory.firm_activity.map((f) => f.month))
        ).sort();

        // Create a dataset for each month
        const datasets = months.map((month, idx) => {
          const colorIndex = idx % 6;
          const colors = [
            "rgba(59, 130, 246, 0.8)", // blue
            "rgba(34, 197, 94, 0.8)", // green
            "rgba(234, 179, 8, 0.8)", // yellow
            "rgba(249, 115, 22, 0.8)", // orange
            "rgba(139, 92, 246, 0.8)", // purple
            "rgba(236, 72, 153, 0.8)", // pink
          ];

          return {
            label: month,
            data: firms.map((firm) => {
              const activity = monthlyHistory.firm_activity.find(
                (a) => a.firm_name === firm && a.month === month
              );
              return activity ? activity.claims_completed : 0;
            }),
            backgroundColor: colors[colorIndex],
            borderColor: colors[colorIndex].replace("0.8", "1"),
            borderWidth: 1,
          };
        });

        return {
          labels: firms.slice(0, 10), // Top 10 firms
          datasets: datasets.map((ds) => ({
            ...ds,
            data: ds.data.slice(0, 10),
          })),
        };
      })()
    : null;

  // Chart: Business Seasonality Wave
  const seasonalityChart = seasonalityProfile
    ? {
        labels: seasonalityProfile.seasonal_data.map((s) =>
          s.monthName.substring(0, 3)
        ), // Jan, Feb, etc.
        datasets: [
          {
            label: "Avg Completed Claims",
            data: seasonalityProfile.seasonal_data.map(
              (s) => s.avgCompletedClaims
            ),
            borderColor: "rgba(139, 92, 246, 1)",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgba(139, 92, 246, 1)",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 6,
          },
        ],
      }
    : null;

  // Chart: Operational Dependency Risk – Claim Volume (Donut)
  const volumeDependencyChart = volumeDependencyRisk
    ? {
        labels: volumeDependencyRisk.top_3_firms.map((f) => f.firm_name),
        datasets: [
          {
            label: "Claim Volume %",
            data: volumeDependencyRisk.top_3_firms.map(
              (f) => f.volume_share_percentage
            ),
            backgroundColor: [
              "rgba(239, 68, 68, 0.8)", // Red for #1
              "rgba(245, 158, 11, 0.8)", // Orange for #2
              "rgba(234, 179, 8, 0.8)", // Yellow for #3
            ],
            borderColor: [
              "rgba(239, 68, 68, 1)",
              "rgba(245, 158, 11, 1)",
              "rgba(234, 179, 8, 1)",
            ],
            borderWidth: 2,
          },
        ],
      }
    : null;

  // Chart: Profit Density by Firm ($ per Claim) (Bar)
  const valueEfficiencyChart = valueEfficiency
    ? {
        labels: valueEfficiency.top_performers.map((f) => f.firm_name),
        datasets: [
          {
            label: "$ per Claim",
            data: valueEfficiency.top_performers.map(
              (f) => f.revenue_per_claim
            ),
            backgroundColor: "rgba(34, 197, 94, 0.8)",
            borderColor: "rgba(34, 197, 94, 1)",
            borderWidth: 2,
          },
        ],
      }
    : null;

  // Chart options - dark theme
  const darkChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: "#e5e7eb" },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        titleColor: "#e5e7eb",
        bodyColor: "#e5e7eb",
        borderColor: "#4b5563",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: "#9ca3af" },
        grid: { color: "rgba(75, 85, 99, 0.3)" },
      },
      y: {
        ticks: { color: "#9ca3af" },
        grid: { color: "rgba(75, 85, 99, 0.3)" },
      },
    },
  };

  const firmReliabilityOptions = {
    ...darkChartOptions,
    scales: {
      ...darkChartOptions.scales,
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        ticks: { color: "#9ca3af" },
        grid: { color: "rgba(75, 85, 99, 0.3)" },
        title: {
          display: true,
          text: "On-Time Percentage",
          color: "#9ca3af",
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        ticks: { color: "#9ca3af" },
        grid: { display: false },
        title: {
          display: true,
          text: "Avg Days Late",
          color: "#9ca3af",
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Business Intelligence</h1>
              <p className="text-gray-400 mt-2">
                Real-time analytics and performance metrics
              </p>
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
              <div className="text-sm text-gray-400 mb-2">
                Expected Cash (30 Days)
              </div>
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
              <div
                className={`text-2xl font-bold ${
                  revenueRisk.top_3_firm_dependency_ratio > 80
                    ? "text-red-400"
                    : revenueRisk.top_3_firm_dependency_ratio > 60
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
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
              <div
                className={`text-2xl font-bold uppercase ${
                  capacityStress.capacity_indicators.backlog_status ===
                  "healthy"
                    ? "text-green-400"
                    : capacityStress.capacity_indicators.backlog_status ===
                      "warning"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {capacityStress.capacity_indicators.backlog_status}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {capacityStress.summary.avg_backlog_growth.toFixed(1)} avg
                growth/week
              </div>
            </div>
          )}

          {payoutVariance && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Payout Accuracy</div>
              <div
                className={`text-2xl font-bold ${
                  payoutVariance.summary.accuracy_percentage > 95
                    ? "text-green-400"
                    : payoutVariance.summary.accuracy_percentage > 85
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {payoutVariance.summary.accuracy_percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                $
                {Math.abs(
                  payoutVariance.summary.total_variance
                ).toLocaleString()}{" "}
                variance
              </div>
            </div>
          )}
        </div>

        {/* Monthly Performance Gauge */}
        {monthlyPerformance && (
          <div className="mb-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 border-2 border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">
              Monthly Performance Gauge -{" "}
              {monthlyPerformance.current_month_name}{" "}
              {monthlyPerformance.current_year}
            </h2>

            {/* Capacity Gauge Visual */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Gauge Visual */}
              <div className="lg:col-span-2">
                <div className="relative" style={{ height: "200px" }}>
                  {/* Gauge background */}
                  <div className="absolute inset-0 flex items-end justify-center">
                    <div
                      className="relative w-full"
                      style={{ height: "150px" }}
                    >
                      {/* Color bands */}
                      <div className="absolute bottom-0 left-0 w-full h-8 flex rounded-lg overflow-hidden">
                        <div
                          className="flex-1 bg-green-500/30 border-r border-gray-700"
                          title="UNDER-UTILIZED < 60%"
                        ></div>
                        <div
                          className="flex-1 bg-yellow-500/30 border-r border-gray-700"
                          title="OPTIMAL 60-85%"
                        ></div>
                        <div
                          className="flex-1 bg-orange-500/30 border-r border-gray-700"
                          title="STRETCH 85-105%"
                        ></div>
                        <div
                          className="flex-1 bg-red-500/30"
                          title="BURNOUT > 105%"
                        ></div>
                      </div>

                      {/* Needle */}
                      <div className="absolute bottom-8 left-0 w-full flex justify-center">
                        <div
                          className="absolute bottom-0 w-1 bg-white rounded-full shadow-lg"
                          style={{
                            height: "100px",
                            left: `${Math.min(
                              monthlyPerformance.capacity_percentage,
                              140
                            )}%`,
                            transformOrigin: "bottom center",
                            transform: "translateX(-50%)",
                          }}
                        >
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full shadow-lg"></div>
                        </div>
                      </div>

                      {/* Labels */}
                      <div className="absolute bottom-10 w-full flex justify-between text-xs text-gray-400 px-2">
                        <span>0%</span>
                        <span>60%</span>
                        <span>85%</span>
                        <span>105%</span>
                        <span>140%</span>
                      </div>
                    </div>
                  </div>

                  {/* Current value display */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center">
                    <div
                      className={`text-5xl font-bold ${
                        monthlyPerformance.capacity_status === "UNDER-UTILIZED"
                          ? "text-green-400"
                          : monthlyPerformance.capacity_status === "OPTIMAL"
                          ? "text-yellow-400"
                          : monthlyPerformance.capacity_status === "STRETCH"
                          ? "text-orange-400"
                          : "text-red-400"
                      }`}
                    >
                      {monthlyPerformance.capacity_percentage.toFixed(1)}%
                    </div>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        monthlyPerformance.capacity_status === "UNDER-UTILIZED"
                          ? "text-green-400"
                          : monthlyPerformance.capacity_status === "OPTIMAL"
                          ? "text-yellow-400"
                          : monthlyPerformance.capacity_status === "STRETCH"
                          ? "text-orange-400"
                          : "text-red-400"
                      }`}
                    >
                      {monthlyPerformance.capacity_status}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Panel */}
              <div className="space-y-3">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400">
                    Completed This Month
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {monthlyPerformance.monthly_completed_claims}
                  </div>
                  <div className="text-xs text-gray-500">
                    of {monthlyPerformance.max_safe_capacity} max capacity
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400">Monthly Velocity</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {monthlyPerformance.monthly_velocity.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-500">
                    claims/business day
                  </div>
                </div>

                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="text-xs text-gray-400">
                    Projected End of Month
                  </div>
                  <div
                    className={`text-2xl font-bold ${
                      monthlyPerformance.projected_end_of_month >
                      monthlyPerformance.max_safe_capacity
                        ? "text-red-400"
                        : "text-purple-400"
                    }`}
                  >
                    {monthlyPerformance.projected_end_of_month}
                  </div>
                  <div className="text-xs text-gray-500">
                    {monthlyPerformance.days_remaining} days remaining
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-gray-400 text-sm">Backlog</div>
                <div className="text-2xl font-bold text-orange-400">
                  {monthlyPerformance.monthly_backlog}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Business Days</div>
                <div className="text-2xl font-bold text-gray-300">
                  {monthlyPerformance.business_days_elapsed} /{" "}
                  {monthlyPerformance.total_business_days_in_month}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Burnout Ratio</div>
                <div
                  className={`text-2xl font-bold ${
                    monthlyPerformance.monthly_burnout_ratio > 1.05
                      ? "text-red-400"
                      : monthlyPerformance.monthly_burnout_ratio > 0.85
                      ? "text-orange-400"
                      : monthlyPerformance.monthly_burnout_ratio > 0.6
                      ? "text-yellow-400"
                      : "text-green-400"
                  }`}
                >
                  {monthlyPerformance.monthly_burnout_ratio.toFixed(2)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Recommended Rate</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {monthlyPerformance.recommended_daily_rate.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">claims/day</div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Firm Payment Reliability */}
          {firmReliabilityChart && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-blue-400">
                Firm Payment Reliability
              </h2>
              <div style={{ height: "300px" }}>
                <Bar
                  data={firmReliabilityChart}
                  options={firmReliabilityOptions}
                />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Top 10 firms by claim volume • On-time % vs Avg days late
              </div>
            </div>
          )}

          {/* Weekly Expected vs Actual Payouts */}
          {payoutVarianceChart && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-green-400">
                Weekly Expected vs Actual Payouts
              </h2>
              <div style={{ height: "300px" }}>
                <Line data={payoutVarianceChart} options={darkChartOptions} />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Last {payoutVariance?.historical_weeks} weeks • Forecast
                accuracy tracking
              </div>
            </div>
          )}

          {/* Capacity Stress Trend */}
          {capacityStressChart && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-purple-400">
                Capacity Stress Trend
              </h2>
              <div style={{ height: "300px" }}>
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
              <h2 className="text-xl font-bold mb-4 text-yellow-400">
                Revenue Dependency Risk
              </h2>
              <div style={{ height: "300px" }}>
                <Doughnut
                  data={revenueRiskChart}
                  options={{
                    ...darkChartOptions,
                    scales: undefined,
                    plugins: {
                      ...darkChartOptions.plugins,
                      legend: {
                        position: "bottom" as const,
                        labels: { color: "#e5e7eb" },
                      },
                    },
                  }}
                />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Top 3 firms ={" "}
                {revenueRisk?.top_3_firm_dependency_ratio.toFixed(1)}% of
                revenue
              </div>
            </div>
          )}

          {/* 30-Day Survival Forecast - Full Width */}
          {survivalRunwayChart && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 lg:col-span-2">
              <h2 className="text-xl font-bold mb-4 text-cyan-400">
                30-Day Survival Forecast
              </h2>
              <div style={{ height: "300px" }}>
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
                    -$
                    {Math.abs(
                      survivalRunway?.delayed_payment_impact || 0
                    ).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Impact Level</div>
                  <div
                    className={`font-bold uppercase ${
                      survivalRunway?.risk_assessment.impact_level === "low"
                        ? "text-green-400"
                        : survivalRunway?.risk_assessment.impact_level ===
                          "moderate"
                        ? "text-yellow-400"
                        : survivalRunway?.risk_assessment.impact_level ===
                          "high"
                        ? "text-orange-400"
                        : "text-red-400"
                    }`}
                  >
                    {survivalRunway?.risk_assessment.impact_level}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Seasonality Wave – Avg Claims by Month */}
          {businessSeasonalityChart && seasonalityProfile && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-green-400">
                Business Seasonality Wave – Avg Claims by Month
              </h2>
              <div style={{ height: "300px" }}>
                <Line
                  data={businessSeasonalityChart}
                  options={darkChartOptions}
                />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Multi-year comparison •{" "}
                {Object.keys(seasonalityProfile).join(", ")} • Jan–Dec by year
              </div>
            </div>
          )}

          {/* Monthly Velocity Trend */}
          {monthlyVelocityTrendChart &&
            monthlyHistory &&
            monthlyHistory.historical_performance.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-blue-400">
                  Monthly Velocity Trend
                </h2>
                <div style={{ height: "300px" }}>
                  <Line
                    data={monthlyVelocityTrendChart}
                    options={darkChartOptions}
                  />
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  Average claims per business day • Trend analysis
                </div>
              </div>
            )}

          {/* Burnout Ratio by Month */}
          {burnoutRatioChart &&
            monthlyHistory &&
            monthlyHistory.historical_performance.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-purple-400">
                  Burnout Ratio by Month
                </h2>
                <div style={{ height: "300px" }}>
                  <Line data={burnoutRatioChart} options={darkChartOptions} />
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  Capacity utilization • Color: Green (&lt;60%), Yellow
                  (60-85%), Orange (85-105%), Red (&gt;105%)
                </div>
              </div>
            )}

          {/* Firm × Month Heatmap */}
          {firmMonthHeatmapData &&
            monthlyHistory &&
            monthlyHistory.firm_activity.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 lg:col-span-2">
                <h2 className="text-xl font-bold mb-4 text-pink-400">
                  Firm Activity Heatmap
                </h2>
                <div style={{ height: "300px" }}>
                  <Bar
                    data={firmMonthHeatmapData}
                    options={{
                      ...darkChartOptions,
                      scales: {
                        ...darkChartOptions.scales,
                        x: {
                          ...darkChartOptions.scales.x,
                          stacked: true,
                        },
                        y: {
                          ...darkChartOptions.scales.y,
                          stacked: true,
                          title: {
                            display: true,
                            text: "Claims Completed",
                            color: "#9ca3af",
                          },
                        },
                      },
                    }}
                  />
                </div>
                <div className="mt-4 text-sm text-gray-400">
                  Top 10 firms • Stacked by month • Claims completed per firm
                  per month
                </div>
              </div>
            )}

          {/* Business Seasonality Wave */}
          {seasonalityChart && seasonalityProfile && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 lg:col-span-2">
              <h2 className="text-xl font-bold mb-4 text-purple-400">
                Business Seasonality Wave
              </h2>
              <div style={{ height: "300px" }}>
                <Line data={seasonalityChart} options={darkChartOptions} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Peak Month</div>
                  <div className="text-purple-400 font-bold">
                    {seasonalityProfile.peak_month.monthName} (
                    {seasonalityProfile.peak_month.avgClaims.toFixed(1)} claims)
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Low Month</div>
                  <div className="text-blue-400 font-bold">
                    {seasonalityProfile.low_month.monthName} (
                    {seasonalityProfile.low_month.avgClaims.toFixed(1)} claims)
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Seasonal Variance</div>
                  <div className="text-yellow-400 font-bold">
                    {seasonalityProfile.seasonal_variance.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Operational Dependency Risk – Claim Volume */}
          {volumeDependencyChart && volumeDependencyRisk && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-orange-400">
                Operational Dependency Risk – Claim Volume
              </h2>
              <div style={{ height: "300px" }}>
                <Doughnut
                  data={volumeDependencyChart}
                  options={{
                    ...darkChartOptions,
                    scales: undefined,
                    plugins: {
                      ...darkChartOptions.plugins,
                      legend: {
                        position: "bottom" as const,
                        labels: { color: "#e5e7eb" },
                      },
                    },
                  }}
                />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Top 3 firms ={" "}
                {volumeDependencyRisk.top_3_firm_dependency_ratio.toFixed(1)}%
                of claim volume
              </div>
            </div>
          )}

          {/* Profit Density by Firm ($ per Claim) */}
          {valueEfficiencyChart && valueEfficiency && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold mb-4 text-green-400">
                Profit Density by Firm ($ per Claim)
              </h2>
              <div style={{ height: "300px" }}>
                <Bar data={valueEfficiencyChart} options={darkChartOptions} />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Top performers • Overall average: $
                {valueEfficiency.overall_revenue_per_claim.toFixed(0)} per claim
              </div>
            </div>
          )}
        </div>

        {/* Recommendations */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {survivalRunway &&
            survivalRunway.risk_assessment.recommendations.length > 0 && (
              <div
                className={`rounded-lg p-6 border-2 ${
                  survivalRunway.risk_assessment.impact_level === "critical"
                    ? "bg-red-900/20 border-red-500"
                    : survivalRunway.risk_assessment.impact_level === "high"
                    ? "bg-orange-900/20 border-orange-500"
                    : survivalRunway.risk_assessment.impact_level === "moderate"
                    ? "bg-blue-900/20 border-blue-500"
                    : "bg-green-900/20 border-green-500"
                }`}
              >
                <h3 className="text-lg font-bold mb-3">
                  Cash Flow Recommendations
                </h3>
                <ul className="space-y-2">
                  {survivalRunway.risk_assessment.recommendations.map(
                    (rec, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <span className="mr-2">•</span>
                        <span>{rec}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

          {revenueRisk &&
            revenueRisk.risk_assessment.recommendations.length > 0 && (
              <div
                className={`rounded-lg p-6 border-2 ${
                  revenueRisk.risk_assessment.concentration_level === "critical"
                    ? "bg-red-900/20 border-red-500"
                    : revenueRisk.risk_assessment.concentration_level === "high"
                    ? "bg-orange-900/20 border-orange-500"
                    : revenueRisk.risk_assessment.concentration_level ===
                      "moderate"
                    ? "bg-blue-900/20 border-blue-500"
                    : "bg-green-900/20 border-green-500"
                }`}
              >
                <h3 className="text-lg font-bold mb-3">
                  Revenue Risk Recommendations
                </h3>
                <ul className="space-y-2">
                  {revenueRisk.risk_assessment.recommendations.map(
                    (rec, idx) => (
                      <li key={idx} className="text-sm flex items-start">
                        <span className="mr-2">•</span>
                        <span>{rec}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Data updated: {new Date().toLocaleString()}</p>
          <p className="mt-2">
            APIs:
            <a
              href="/CipherDispatch/api/firm-reliability"
              className="text-blue-400 hover:underline ml-2"
            >
              Firm Reliability
            </a>{" "}
            •
            <a
              href="/CipherDispatch/api/payout-variance"
              className="text-blue-400 hover:underline ml-2"
            >
              Payout Variance
            </a>{" "}
            •
            <a
              href="/CipherDispatch/api/capacity-stress"
              className="text-blue-400 hover:underline ml-2"
            >
              Capacity Stress
            </a>{" "}
            •
            <a
              href="/CipherDispatch/api/revenue-risk"
              className="text-blue-400 hover:underline ml-2"
            >
              Revenue Risk
            </a>{" "}
            •
            <a
              href="/CipherDispatch/api/survival-runway"
              className="text-blue-400 hover:underline ml-2"
            >
              Survival Runway
            </a>{" "}
            •
            <a
              href="/CipherDispatch/api/monthly-performance"
              className="text-blue-400 hover:underline ml-2"
            >
              Monthly Performance
            </a>{" "}
            •
            <a
              href="/CipherDispatch/api/monthly-history"
              className="text-blue-400 hover:underline ml-2"
            >
              Monthly History
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Intelligence Dashboard
 * Comprehensive business intelligence visualization
 * Real-time data from all analytics APIs
 */

import { useEffect, useState, useMemo } from "react";
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
  RawSeasonalityData,
} from "../../utils/seasonalityProfile";
import {
  generateSeasonalPerformanceBenchmarkReport,
  SeasonalPerformanceBenchmarkReport,
} from "../../utils/seasonalPerformanceBenchmark";
import {
  generateVolumeDependencyRiskReport,
  VolumeDependencyRiskReport,
} from "../../utils/volumeDependencyRisk";
import {
  generateValueEfficiencyReport,
  ValueEfficiencyReport,
} from "../../utils/valueEfficiency";
import FirmFilterCheckboxes from "../../components/admin/FirmFilterCheckboxes";

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

// localStorage keys for chart filters
const STORAGE_KEYS = {
  SEASONALITY_FIRMS: "intelligence_seasonality_firms",
  VELOCITY_FIRMS: "intelligence_velocity_firms",
  COMPLETED_FIRMS: "intelligence_completed_firms",
  ACTIVITY_FIRMS: "intelligence_activity_firms",
} as const;

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
  const [seasonalityRawData, setSeasonalityRawData] = useState<
    RawSeasonalityData[]
  >([]);
  const [seasonalPerformanceBenchmark, setSeasonalPerformanceBenchmark] =
    useState<SeasonalPerformanceBenchmarkReport | null>(null);
  const [volumeDependencyRisk, setVolumeDependencyRisk] =
    useState<VolumeDependencyRiskReport | null>(null);
  const [valueEfficiency, setValueEfficiency] =
    useState<ValueEfficiencyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFirm, setSelectedFirm] = useState<string>("");

  // Firm filter states (one per chart)
  const [seasonalitySelectedFirms, setSeasonalitySelectedFirms] = useState<
    string[]
  >([]);
  const [velocitySelectedFirms, setVelocitySelectedFirms] = useState<string[]>(
    []
  );
  const [completedSelectedFirms, setCompletedSelectedFirms] = useState<
    string[]
  >([]);
  const [activitySelectedFirms, setActivitySelectedFirms] = useState<string[]>(
    []
  );

  // Available firms lists
  const [availableFirmsSeasonality, setAvailableFirmsSeasonality] = useState<
    string[]
  >([]);
  const [availableFirmsMonthly, setAvailableFirmsMonthly] = useState<string[]>(
    []
  );

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      setError(null);

      try {
        // Check for debug mode in URL
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get("debug") === "true";

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
          seasonalityResult,
          seasonalBenchmark,
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
          generateSeasonalityProfileReport(debugMode),
          generateSeasonalPerformanceBenchmarkReport(debugMode),
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
        setSeasonalityProfile(seasonalityResult.aggregated);
        setSeasonalityRawData(seasonalityResult.raw);
        setSeasonalPerformanceBenchmark(seasonalBenchmark);
        setVolumeDependencyRisk(volumeDep);
        setValueEfficiency(valueEff);

        // Set default firm to first available in raw data
        if (seasonalityResult.raw.length > 0 && !selectedFirm) {
          const uniqueFirms = Array.from(
            new Set(seasonalityResult.raw.map((d) => d.firm))
          );
          setSelectedFirm(uniqueFirms[0]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load intelligence data");
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, []);

  // Initialize seasonality firms filter
  useEffect(() => {
    if (seasonalityRawData.length > 0) {
      // Extract unique firms from raw data
      const firms = Array.from(
        new Set(seasonalityRawData.map((d) => d.firm))
      ).sort();
      setAvailableFirmsSeasonality(firms);

      // Load from localStorage or default to all firms
      const stored = localStorage.getItem(STORAGE_KEYS.SEASONALITY_FIRMS);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Validate stored firms still exist in current data
          const validFirms = parsed.filter((f: string) => firms.includes(f));
          setSeasonalitySelectedFirms(
            validFirms.length > 0 ? validFirms : firms
          );
        } catch {
          setSeasonalitySelectedFirms(firms);
        }
      } else {
        setSeasonalitySelectedFirms(firms); // Default: all selected
      }
    }
  }, [seasonalityRawData]);

  // Initialize monthly history firms filters
  useEffect(() => {
    if (monthlyHistory?.firm_monthly_data) {
      const firms = Object.keys(monthlyHistory.firm_monthly_data).sort();
      setAvailableFirmsMonthly(firms);

      // Initialize velocity chart filter
      const storedVelocity = localStorage.getItem(STORAGE_KEYS.VELOCITY_FIRMS);
      if (storedVelocity) {
        try {
          const parsed = JSON.parse(storedVelocity);
          const validFirms = parsed.filter((f: string) => firms.includes(f));
          setVelocitySelectedFirms(validFirms.length > 0 ? validFirms : firms);
        } catch {
          setVelocitySelectedFirms(firms);
        }
      } else {
        setVelocitySelectedFirms(firms);
      }

      // Initialize completed chart filter
      const storedCompleted = localStorage.getItem(
        STORAGE_KEYS.COMPLETED_FIRMS
      );
      if (storedCompleted) {
        try {
          const parsed = JSON.parse(storedCompleted);
          const validFirms = parsed.filter((f: string) => firms.includes(f));
          setCompletedSelectedFirms(validFirms.length > 0 ? validFirms : firms);
        } catch {
          setCompletedSelectedFirms(firms);
        }
      } else {
        setCompletedSelectedFirms(firms);
      }

      // Initialize activity chart filter
      const storedActivity = localStorage.getItem(STORAGE_KEYS.ACTIVITY_FIRMS);
      if (storedActivity) {
        try {
          const parsed = JSON.parse(storedActivity);
          const validFirms = parsed.filter((f: string) => firms.includes(f));
          setActivitySelectedFirms(validFirms.length > 0 ? validFirms : firms);
        } catch {
          setActivitySelectedFirms(firms);
        }
      } else {
        setActivitySelectedFirms(firms);
      }
    }
  }, [monthlyHistory]);

  // Persist seasonality filter
  useEffect(() => {
    if (seasonalitySelectedFirms.length > 0) {
      localStorage.setItem(
        STORAGE_KEYS.SEASONALITY_FIRMS,
        JSON.stringify(seasonalitySelectedFirms)
      );
    }
  }, [seasonalitySelectedFirms]);

  // Persist velocity filter
  useEffect(() => {
    if (velocitySelectedFirms.length > 0) {
      localStorage.setItem(
        STORAGE_KEYS.VELOCITY_FIRMS,
        JSON.stringify(velocitySelectedFirms)
      );
    }
  }, [velocitySelectedFirms]);

  // Persist completed filter
  useEffect(() => {
    if (completedSelectedFirms.length > 0) {
      localStorage.setItem(
        STORAGE_KEYS.COMPLETED_FIRMS,
        JSON.stringify(completedSelectedFirms)
      );
    }
  }, [completedSelectedFirms]);

  // Persist activity filter
  useEffect(() => {
    if (activitySelectedFirms.length > 0) {
      localStorage.setItem(
        STORAGE_KEYS.ACTIVITY_FIRMS,
        JSON.stringify(activitySelectedFirms)
      );
    }
  }, [activitySelectedFirms]);

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

  // Log the seasonality profile for debugging
  console.log("seasonalityProfile data:", seasonalityProfile);

  // Month names constant
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Filter and re-aggregate seasonality data based on selected firms
  const filteredSeasonalityProfile = useMemo(() => {
    if (!seasonalityRawData.length || !seasonalitySelectedFirms.length) {
      return seasonalityProfile || {};
    }

    // Filter raw data by selected firms
    const filtered = seasonalityRawData.filter((d) =>
      seasonalitySelectedFirms.includes(d.firm)
    );

    // Re-aggregate by year and month (SUM across selected firms)
    const yearlyData: SeasonalityProfileReport = {};

    for (const item of filtered) {
      const yearKey = item.year.toString();
      if (!yearlyData[yearKey]) {
        yearlyData[yearKey] = [];
      }

      let monthEntry = yearlyData[yearKey].find((m) => m.month === item.month);
      if (!monthEntry) {
        monthEntry = {
          month: item.month,
          monthName: MONTH_NAMES[item.month - 1],
          completedClaims: 0,
        };
        yearlyData[yearKey].push(monthEntry);
      }

      // SUM the claims from selected firms
      monthEntry.completedClaims += item.completed;
    }

    // Fill missing months with zeros and sort
    for (const year in yearlyData) {
      for (let month = 1; month <= 12; month++) {
        if (!yearlyData[year].find((m) => m.month === month)) {
          yearlyData[year].push({
            month,
            monthName: MONTH_NAMES[month - 1],
            completedClaims: 0,
          });
        }
      }
      yearlyData[year].sort((a, b) => a.month - b.month);
    }

    return yearlyData;
  }, [seasonalityRawData, seasonalitySelectedFirms, seasonalityProfile]);

  // Filter monthly history data for each chart independently
  const filteredMonthlyData = useMemo(() => {
    if (!monthlyHistory?.firm_monthly_data) return null;

    return {
      velocity: Object.fromEntries(
        Object.entries(monthlyHistory.firm_monthly_data).filter(([firmName]) =>
          velocitySelectedFirms.includes(firmName)
        )
      ),
      completed: Object.fromEntries(
        Object.entries(monthlyHistory.firm_monthly_data).filter(([firmName]) =>
          completedSelectedFirms.includes(firmName)
        )
      ),
      activity: Object.fromEntries(
        Object.entries(monthlyHistory.firm_monthly_data).filter(([firmName]) =>
          activitySelectedFirms.includes(firmName)
        )
      ),
    };
  }, [
    monthlyHistory,
    velocitySelectedFirms,
    completedSelectedFirms,
    activitySelectedFirms,
  ]);

  // Chart: Business Seasonality Wave – Avg Claims by Month
  const businessSeasonalityChart =
    filteredSeasonalityProfile &&
    Object.keys(filteredSeasonalityProfile).length > 0
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
          datasets: Object.keys(filteredSeasonalityProfile).map(
            (year, index) => {
              const yearData = filteredSeasonalityProfile[year] || [];
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
            }
          ),
        }
      : {
          // Fallback chart with sample data for debugging
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
          datasets: [
            {
              type: "line" as const,
              label: "Sample Data",
              data: [10, 15, 12, 18, 22, 25, 20, 16, 14, 12, 8, 6],
              borderColor: "rgba(34, 197, 94, 1)",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              borderWidth: 2,
              tension: 0.4,
              fill: false,
            },
          ],
        };

  // Chart: Seasonal Performance Benchmark
  const seasonalPerformanceBenchmarkChart = seasonalPerformanceBenchmark
    ? {
        labels: seasonalPerformanceBenchmark.data.map((d) => d.month),
        datasets: [
          {
            type: "line" as const,
            label: `Performance Index ${seasonalPerformanceBenchmark.current_year}`,
            data: seasonalPerformanceBenchmark.data.map((d) => d.index),
            borderColor: "rgba(59, 130, 246, 1)", // Blue
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 3,
            tension: 0.4,
            fill: false,
            pointRadius: 6,
            pointHoverRadius: 8,
          },
          {
            type: "line" as const,
            label: "Expected Pace",
            data: Array(12).fill(1.0), // Horizontal line at y=1.0
            borderColor: "rgba(156, 163, 175, 1)", // Gray
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      }
    : null;

  // Chart: Monthly Velocity Trend (Line) - Per Firm Per Year
  const monthlyVelocityTrendChart = filteredMonthlyData?.velocity
    ? (() => {
        const datasets = [];
        const colors = [
          "rgba(59, 130, 246, 1)", // Blue
          "rgba(34, 197, 94, 1)", // Green
          "rgba(139, 92, 246, 1)", // Purple
          "rgba(249, 115, 22, 1)", // Orange
          "rgba(236, 72, 153, 1)", // Pink
          "rgba(234, 179, 8, 1)", // Yellow
          "rgba(239, 68, 68, 1)", // Red
          "rgba(20, 184, 166, 1)", // Teal
        ];
        let colorIndex = 0;

        for (const firmName in filteredMonthlyData.velocity) {
          for (const year in filteredMonthlyData.velocity[firmName]) {
            const yearData = filteredMonthlyData.velocity[firmName][year];
            const color = colors[colorIndex % colors.length];

            datasets.push({
              label: `${firmName} ${year}`,
              data: yearData.map((m) => m.avgVelocity),
              borderColor: color,
              backgroundColor: color.replace("1)", "0.1)"),
              fill: false,
              tension: 0.4,
              borderWidth: 2,
            });

            colorIndex++;
          }
        }

        return {
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
          datasets,
        };
      })()
    : null;

  // Chart: Claims Completed by Month - Per Firm Per Year
  const burnoutRatioChart = filteredMonthlyData?.completed
    ? (() => {
        const datasets = [];
        const colors = [
          "rgba(34, 197, 94, 1)", // Green
          "rgba(59, 130, 246, 1)", // Blue
          "rgba(139, 92, 246, 1)", // Purple
          "rgba(249, 115, 22, 1)", // Orange
          "rgba(236, 72, 153, 1)", // Pink
          "rgba(234, 179, 8, 1)", // Yellow
          "rgba(239, 68, 68, 1)", // Red
          "rgba(20, 184, 166, 1)", // Teal
        ];
        let colorIndex = 0;

        for (const firmName in filteredMonthlyData.completed) {
          for (const year in filteredMonthlyData.completed[firmName]) {
            const yearData = filteredMonthlyData.completed[firmName][year];
            const color = colors[colorIndex % colors.length];

            datasets.push({
              label: `${firmName} ${year}`,
              data: yearData.map((m) => m.claimsCompleted),
              borderColor: color,
              backgroundColor: color.replace("1)", "0.1)"),
              fill: false,
              tension: 0.4,
              borderWidth: 2,
            });

            colorIndex++;
          }
        }

        return {
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
          datasets,
        };
      })()
    : null;

  // Chart: Firm Activity - Per Firm Per Year
  const firmMonthHeatmapData = filteredMonthlyData?.activity
    ? (() => {
        const datasets = [];
        const colors = [
          "rgba(59, 130, 246, 1)", // Blue
          "rgba(34, 197, 94, 1)", // Green
          "rgba(139, 92, 246, 1)", // Purple
          "rgba(249, 115, 22, 1)", // Orange
          "rgba(236, 72, 153, 1)", // Pink
          "rgba(234, 179, 8, 1)", // Yellow
          "rgba(239, 68, 68, 1)", // Red
          "rgba(20, 184, 166, 1)", // Teal
        ];
        let colorIndex = 0;

        for (const firmName in filteredMonthlyData.activity) {
          for (const year in filteredMonthlyData.activity[firmName]) {
            const yearData = filteredMonthlyData.activity[firmName][year];
            const color = colors[colorIndex % colors.length];

            datasets.push({
              label: `${firmName} ${year}`,
              data: yearData.map((m) => m.claimsCompleted),
              borderColor: color,
              backgroundColor: color.replace("1)", "0.1)"),
              fill: false,
              tension: 0.4,
              borderWidth: 2,
            });

            colorIndex++;
          }
        }

        return {
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
          datasets,
        };
      })()
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
                    <div className="text-sm text-gray-400 mt-1">
                      of Safe Capacity
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
                    Safe Capacity: {monthlyPerformance.max_safe_capacity}{" "}
                    claims/month
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Linear Projection:{" "}
                    {monthlyPerformance.projected_end_of_month} claims
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
              <h2
                className="text-xl font-bold mb-4 text-blue-400 cursor-help"
                title="Tracks payment punctuality for top firms. Shows on-time payment percentage and average days late for the 10 firms with highest claim volume."
              >
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
              <h2
                className="text-xl font-bold mb-4 text-green-400 cursor-help"
                title="Compares forecasted payouts versus actual payments received each week. Helps identify variance patterns and forecast accuracy over time."
              >
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
              <h2
                className="text-xl font-bold mb-4 text-purple-400 cursor-help"
                title="Monitors workload balance by comparing claims assigned versus claims completed each week. Backlog indicates when assignments exceed completion capacity."
              >
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
              <h2
                className="text-xl font-bold mb-4 text-yellow-400 cursor-help"
                title="Shows revenue concentration among top 3 firms. High concentration indicates business risk if a major client relationship ends."
              >
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
              <h2
                className="text-xl font-bold mb-4 text-cyan-400 cursor-help"
                title="Projects cumulative cash flow over the next 30 days. Compares expected scenario with delayed payment scenario (7-day delay) to assess liquidity risk."
              >
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

          {/* Business Seasonality Wave */}
          {businessSeasonalityChart && seasonalityProfile && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2
                className="text-xl font-bold mb-4 text-green-400 cursor-help"
                title="Displays monthly claim completion patterns across multiple years. Each line represents one year, allowing comparison of seasonal trends and identifying peak/low months."
              >
                Business Seasonality Wave
              </h2>

              <FirmFilterCheckboxes
                allFirms={availableFirmsSeasonality}
                selectedFirms={seasonalitySelectedFirms}
                onChange={setSeasonalitySelectedFirms}
                chartId="seasonality"
                className="mb-4"
              />

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

          {/* Seasonal Performance Benchmark */}
          {seasonalPerformanceBenchmarkChart &&
            seasonalPerformanceBenchmark && (
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2
                  className="text-xl font-bold mb-4 text-cyan-400 cursor-help"
                  title="Compares current year monthly performance against historical averages. Performance Index = Current Year / Historical Average. Values above 1.0 indicate above-average performance."
                >
                  Seasonal Performance Index – Current Year vs Historical
                  Average
                </h2>

                <div style={{ height: "300px" }}>
                  <Line
                    data={seasonalPerformanceBenchmarkChart}
                    options={darkChartOptions}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400">Avg Index</div>
                    <div
                      className={`text-lg font-bold ${
                        seasonalPerformanceBenchmark.summary.avg_index >= 1.0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {seasonalPerformanceBenchmark.summary.avg_index.toFixed(
                        2
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400">Best Month</div>
                    <div className="text-green-400 font-bold">
                      {seasonalPerformanceBenchmark.summary.best_month}
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400">Above Expected</div>
                    <div className="text-green-400 font-bold">
                      {
                        seasonalPerformanceBenchmark.summary
                          .months_above_expected
                      }
                      /12
                    </div>
                  </div>
                  <div className="bg-gray-700/50 rounded p-3">
                    <div className="text-gray-400">Years of Data</div>
                    <div className="text-blue-400 font-bold">
                      {seasonalPerformanceBenchmark.years_included.length}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-400">
                  {seasonalPerformanceBenchmark.current_year} vs Historical
                  Average • Index &gt; 1.0 = Above Average • Based on{" "}
                  {
                    seasonalPerformanceBenchmark.years_included.filter(
                      (y) => y < seasonalPerformanceBenchmark.current_year
                    ).length
                  }{" "}
                  historical years
                </div>
              </div>
            )}

          {/* Monthly Velocity Trend */}
          {monthlyVelocityTrendChart && monthlyHistory && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2
                className="text-xl font-bold mb-4 text-blue-400 cursor-help"
                title="Tracks average claims processed per business day for each firm by year. Each line represents a firm-year combination showing monthly velocity patterns."
              >
                Monthly Velocity Trend
              </h2>

              <FirmFilterCheckboxes
                allFirms={availableFirmsMonthly}
                selectedFirms={velocitySelectedFirms}
                onChange={setVelocitySelectedFirms}
                chartId="velocity"
                className="mb-4"
              />

              <div style={{ height: "300px" }}>
                <Line
                  data={monthlyVelocityTrendChart}
                  options={darkChartOptions}
                />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Per firm per year • Jan–Dec velocity trends
              </div>
            </div>
          )}

          {/* Claims Completed by Month */}
          {burnoutRatioChart && monthlyHistory && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2
                className="text-xl font-bold mb-4 text-purple-400 cursor-help"
                title="Shows monthly claims completed for each firm by year. Each line represents a firm-year combination tracking claim completion volume throughout the year."
              >
                Claims Completed by Month
              </h2>

              <FirmFilterCheckboxes
                allFirms={availableFirmsMonthly}
                selectedFirms={completedSelectedFirms}
                onChange={setCompletedSelectedFirms}
                chartId="completed"
                className="mb-4"
              />

              <div style={{ height: "300px" }}>
                <Line data={burnoutRatioChart} options={darkChartOptions} />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Per firm per year • Jan–Dec completion trends
              </div>
            </div>
          )}

          {/* Firm Activity by Year */}
          {firmMonthHeatmapData && monthlyHistory && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 lg:col-span-2">
              <h2
                className="text-xl font-bold mb-4 text-pink-400 cursor-help"
                title="Visualizes firm activity patterns across the year. Each line represents a firm-year combination showing monthly claim completion trends."
              >
                Firm Activity by Year
              </h2>

              <FirmFilterCheckboxes
                allFirms={availableFirmsMonthly}
                selectedFirms={activitySelectedFirms}
                onChange={setActivitySelectedFirms}
                chartId="activity"
                className="mb-4"
              />

              <div style={{ height: "300px" }}>
                <Line data={firmMonthHeatmapData} options={darkChartOptions} />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Per firm per year • Jan–Dec activity patterns
              </div>
            </div>
          )}

          {/* Operational Dependency Risk – Claim Volume */}
          {volumeDependencyChart && volumeDependencyRisk && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2
                className="text-xl font-bold mb-4 text-orange-400 cursor-help"
                title="Shows claim volume concentration among top 3 firms. High concentration indicates operational risk if a major firm relationship ends or changes significantly."
              >
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
              <h2
                className="text-xl font-bold mb-4 text-green-400 cursor-help"
                title="Ranks firms by average revenue per claim. Identifies most valuable client relationships and helps prioritize high-value partnerships."
              >
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

        {/* Troubleshooter Panel */}
        {seasonalityRawData.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 border-2 border-cyan-500">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">
              🔧 Seasonality Troubleshooter
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Firm:
              </label>
              <select
                value={selectedFirm}
                onChange={(e) => setSelectedFirm(e.target.value)}
                className="w-full md:w-64 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
              >
                {Array.from(new Set(seasonalityRawData.map((d) => d.firm)))
                  .sort()
                  .map((firm) => (
                    <option key={firm} value={firm}>
                      {firm}
                    </option>
                  ))}
              </select>
            </div>

            {selectedFirm && (
              <div className="mt-4">
                <h3 className="text-lg font-bold mb-3 text-gray-200">
                  Completed Claims by Month for {selectedFirm}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-cyan-400">Year</th>
                        <th className="px-4 py-2 text-cyan-400">Month</th>
                        <th className="px-4 py-2 text-cyan-400">Month Name</th>
                        <th className="px-4 py-2 text-cyan-400">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonalityRawData
                        .filter((d) => d.firm === selectedFirm)
                        .sort((a, b) => {
                          if (a.year !== b.year) return a.year - b.year;
                          return a.month - b.month;
                        })
                        .map((data, idx) => {
                          const monthNames = [
                            "January",
                            "February",
                            "March",
                            "April",
                            "May",
                            "June",
                            "July",
                            "August",
                            "September",
                            "October",
                            "November",
                            "December",
                          ];
                          return (
                            <tr
                              key={idx}
                              className={
                                idx % 2 === 0 ? "bg-gray-800" : "bg-gray-750"
                              }
                            >
                              <td className="px-4 py-2 text-gray-300">
                                {data.year}
                              </td>
                              <td className="px-4 py-2 text-gray-300">
                                {data.month}
                              </td>
                              <td className="px-4 py-2 text-gray-300">
                                {monthNames[data.month - 1]}
                              </td>
                              <td
                                className={`px-4 py-2 font-bold ${
                                  data.completed > 0
                                    ? "text-green-400"
                                    : "text-gray-500"
                                }`}
                              >
                                {data.completed}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-xs text-gray-400">
                  💡 Use this table to verify claim counts by month. Check for
                  missing data or unexpected zeros.
                </div>
              </div>
            )}
          </div>
        )}

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
          <p className="mt-2 text-xs text-gray-600">
            💡 Tip: Add{" "}
            <code className="bg-gray-800 px-2 py-1 rounded">?debug=true</code>{" "}
            to the URL to enable debug mode with console.table() output
          </p>
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

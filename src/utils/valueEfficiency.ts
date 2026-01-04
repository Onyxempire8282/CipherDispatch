/**
 * Value Efficiency Analysis
 * Analyzes profit density per firm by calculating revenue per claim
 * Identifies most valuable firm relationships
 */

import { supabase } from "../lib/supabase";
import { normalizeFirmName } from "./payoutForecasting";

export interface FirmValueEfficiency {
  firm_name: string;
  normalized_name: string;
  total_revenue: number;
  claim_count: number;
  revenue_per_claim: number;
  efficiency_rank: number;
}

export interface ValueEfficiencyReport {
  generated_at: string;
  total_revenue: number;
  total_claims: number;
  overall_revenue_per_claim: number;
  unique_firms: number;
  firm_efficiencies: FirmValueEfficiency[];
  top_performers: FirmValueEfficiency[];
  efficiency_metrics: {
    highest_revenue_per_claim: number;
    lowest_revenue_per_claim: number;
    median_revenue_per_claim: number;
    efficiency_variance: number;
  };
  performance_tiers: {
    premium: FirmValueEfficiency[];
    standard: FirmValueEfficiency[];
    budget: FirmValueEfficiency[];
  };
}

interface ClaimForValueAnalysis {
  id: string;
  firm_name: string;
  status: string;
  file_total: number | null;
  pay_amount: number | null;
  completion_date: string | null;
}

/**
 * Fetch all completed claims with revenue data for value analysis
 */
async function fetchCompletedClaimsForValue(): Promise<
  ClaimForValueAnalysis[]
> {
  const { data, error } = await supabase
    .from("claims")
    .select("id, firm_name, status, file_total, pay_amount, completion_date")
    .eq("status", "COMPLETED")
    .not("firm_name", "is", null)
    .limit(100000); // Remove default 1000 row limit

  if (error) {
    console.error("Error fetching completed claims for value analysis:", error);
    throw error;
  }

  return data || [];
}

/**
 * Aggregate revenue and counts by firm for efficiency calculation
 */
function aggregateValueByFirm(
  claims: ClaimForValueAnalysis[]
): Map<string, { revenue: number; count: number; originalName: string }> {
  const firmMap = new Map<
    string,
    { revenue: number; count: number; originalName: string }
  >();

  for (const claim of claims) {
    if (!claim.firm_name) continue;

    const normalizedFirm = normalizeFirmName(claim.firm_name);
    const revenue = claim.file_total || claim.pay_amount || 0;

    if (revenue <= 0) continue;

    if (!firmMap.has(normalizedFirm)) {
      firmMap.set(normalizedFirm, {
        revenue: 0,
        count: 0,
        originalName: claim.firm_name,
      });
    }

    const firmData = firmMap.get(normalizedFirm)!;
    firmData.revenue += revenue;
    firmData.count++;
  }

  return firmMap;
}

/**
 * Calculate efficiency variance (coefficient of variation)
 */
function calculateEfficiencyVariance(
  efficiencies: FirmValueEfficiency[]
): number {
  if (efficiencies.length <= 1) return 0;

  const values = efficiencies.map((f) => f.revenue_per_claim);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  const stdDev = Math.sqrt(variance);

  return mean > 0 ? (stdDev / mean) * 100 : 0;
}

/**
 * Categorize firms into performance tiers
 */
function categorizeFirmsByEfficiency(
  efficiencies: FirmValueEfficiency[],
  overallAverage: number
): {
  premium: FirmValueEfficiency[];
  standard: FirmValueEfficiency[];
  budget: FirmValueEfficiency[];
} {
  const premium = efficiencies.filter(
    (f) => f.revenue_per_claim >= overallAverage * 1.25
  );
  const budget = efficiencies.filter(
    (f) => f.revenue_per_claim <= overallAverage * 0.75
  );
  const standard = efficiencies.filter(
    (f) =>
      f.revenue_per_claim > overallAverage * 0.75 &&
      f.revenue_per_claim < overallAverage * 1.25
  );

  return { premium, standard, budget };
}

/**
 * Generate value efficiency report
 */
export async function generateValueEfficiencyReport(): Promise<ValueEfficiencyReport> {
  const claims = await fetchCompletedClaimsForValue();

  if (claims.length === 0) {
    throw new Error("No completed claims found for value efficiency analysis");
  }

  const firmValueMap = aggregateValueByFirm(claims);
  const totalRevenue = Array.from(firmValueMap.values()).reduce(
    (sum, firm) => sum + firm.revenue,
    0
  );
  const totalClaims = Array.from(firmValueMap.values()).reduce(
    (sum, firm) => sum + firm.count,
    0
  );
  const overallRevenuePerClaim =
    totalClaims > 0 ? totalRevenue / totalClaims : 0;
  const uniqueFirms = firmValueMap.size;

  // Convert to array and calculate efficiency metrics
  const firmEfficiencies: FirmValueEfficiency[] = Array.from(
    firmValueMap.entries()
  )
    .map(([normalizedName, data]) => ({
      firm_name: data.originalName,
      normalized_name: normalizedName,
      total_revenue: data.revenue,
      claim_count: data.count,
      revenue_per_claim: data.count > 0 ? data.revenue / data.count : 0,
      efficiency_rank: 0, // Will be set after sorting
    }))
    .filter((firm) => firm.revenue_per_claim > 0)
    .sort((a, b) => b.revenue_per_claim - a.revenue_per_claim)
    .map((firm, index) => ({ ...firm, efficiency_rank: index + 1 }));

  // Calculate efficiency metrics
  const revenuePerClaimValues = firmEfficiencies.map(
    (f) => f.revenue_per_claim
  );
  const sortedValues = [...revenuePerClaimValues].sort((a, b) => a - b);
  const medianIndex = Math.floor(sortedValues.length / 2);
  const medianRevenuePerClaim =
    sortedValues.length % 2 === 0
      ? (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2
      : sortedValues[medianIndex];

  const efficiencyMetrics = {
    highest_revenue_per_claim: Math.max(...revenuePerClaimValues, 0),
    lowest_revenue_per_claim: Math.min(...revenuePerClaimValues, 0),
    median_revenue_per_claim: medianRevenuePerClaim || 0,
    efficiency_variance: calculateEfficiencyVariance(firmEfficiencies),
  };

  // Get top performers (top 5)
  const topPerformers = firmEfficiencies.slice(0, 5);

  // Categorize firms by efficiency
  const performanceTiers = categorizeFirmsByEfficiency(
    firmEfficiencies,
    overallRevenuePerClaim
  );

  return {
    generated_at: new Date().toISOString(),
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_claims: totalClaims,
    overall_revenue_per_claim: Math.round(overallRevenuePerClaim * 100) / 100,
    unique_firms: uniqueFirms,
    firm_efficiencies: firmEfficiencies.map((f) => ({
      ...f,
      total_revenue: Math.round(f.total_revenue * 100) / 100,
      revenue_per_claim: Math.round(f.revenue_per_claim * 100) / 100,
    })),
    top_performers: topPerformers.map((f) => ({
      ...f,
      total_revenue: Math.round(f.total_revenue * 100) / 100,
      revenue_per_claim: Math.round(f.revenue_per_claim * 100) / 100,
    })),
    efficiency_metrics: {
      ...efficiencyMetrics,
      highest_revenue_per_claim:
        Math.round(efficiencyMetrics.highest_revenue_per_claim * 100) / 100,
      lowest_revenue_per_claim:
        Math.round(efficiencyMetrics.lowest_revenue_per_claim * 100) / 100,
      median_revenue_per_claim:
        Math.round(efficiencyMetrics.median_revenue_per_claim * 100) / 100,
      efficiency_variance:
        Math.round(efficiencyMetrics.efficiency_variance * 10) / 10,
    },
    performance_tiers: {
      premium: performanceTiers.premium.map((f) => ({
        ...f,
        total_revenue: Math.round(f.total_revenue * 100) / 100,
        revenue_per_claim: Math.round(f.revenue_per_claim * 100) / 100,
      })),
      standard: performanceTiers.standard.map((f) => ({
        ...f,
        total_revenue: Math.round(f.total_revenue * 100) / 100,
        revenue_per_claim: Math.round(f.revenue_per_claim * 100) / 100,
      })),
      budget: performanceTiers.budget.map((f) => ({
        ...f,
        total_revenue: Math.round(f.total_revenue * 100) / 100,
        revenue_per_claim: Math.round(f.revenue_per_claim * 100) / 100,
      })),
    },
  };
}

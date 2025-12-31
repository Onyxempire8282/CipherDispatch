/**
 * Revenue Risk Analysis
 * Aggregates completed claims by firm and analyzes revenue concentration
 * Identifies dependency on top firms
 */

import { supabase } from '../lib/supabase';
import { normalizeFirmName } from './payoutForecasting';

export interface FirmRevenue {
  firm_name: string;
  normalized_name: string;
  total_revenue: number;
  claim_count: number;
  revenue_share_percentage: number;
  avg_revenue_per_claim: number;
}

export interface RevenueRiskReport {
  generated_at: string;
  total_revenue: number;
  total_claims: number;
  unique_firms: number;
  firm_revenues: FirmRevenue[];
  top_3_firms: FirmRevenue[];
  top_3_firm_dependency_ratio: number;
  revenue_concentration: {
    top_1_percentage: number;
    top_3_percentage: number;
    top_5_percentage: number;
    herfindahl_index: number;
  };
  risk_assessment: {
    concentration_level: 'low' | 'moderate' | 'high' | 'critical';
    diversification_status: string;
    recommendations: string[];
  };
}

interface ClaimForRevenue {
  id: string;
  firm_name: string;
  status: string;
  file_total: number | null;
  pay_amount: number | null;
  completion_date: string | null;
}

/**
 * Fetch all completed claims with revenue data
 */
async function fetchCompletedClaims(): Promise<ClaimForRevenue[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('id, firm_name, status, file_total, pay_amount, completion_date')
    .eq('status', 'COMPLETED')
    .not('firm_name', 'is', null);

  if (error) {
    console.error('Error fetching completed claims:', error);
    throw error;
  }

  return data || [];
}

/**
 * Aggregate revenue by firm
 */
function aggregateRevenueByFirm(claims: ClaimForRevenue[]): Map<string, { revenue: number; count: number }> {
  const firmMap = new Map<string, { revenue: number; count: number }>();

  for (const claim of claims) {
    if (!claim.firm_name) continue;

    const normalizedFirm = normalizeFirmName(claim.firm_name);
    const revenue = claim.file_total || claim.pay_amount || 0;

    if (revenue <= 0) continue;

    if (!firmMap.has(normalizedFirm)) {
      firmMap.set(normalizedFirm, { revenue: 0, count: 0 });
    }

    const firmData = firmMap.get(normalizedFirm)!;
    firmData.revenue += revenue;
    firmData.count++;
  }

  return firmMap;
}

/**
 * Calculate Herfindahl-Hirschman Index (HHI)
 * Measures market concentration (0 = perfect competition, 10000 = monopoly)
 */
function calculateHerfindahlIndex(firmRevenues: FirmRevenue[]): number {
  let hhi = 0;

  for (const firm of firmRevenues) {
    // HHI = sum of squared market shares (as percentages)
    hhi += Math.pow(firm.revenue_share_percentage, 2);
  }

  return Math.round(hhi);
}

/**
 * Determine concentration level based on top 3 dependency
 */
function determineConcentrationLevel(top3Ratio: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (top3Ratio < 40) return 'low';
  if (top3Ratio < 60) return 'moderate';
  if (top3Ratio < 80) return 'high';
  return 'critical';
}

/**
 * Generate recommendations based on concentration
 */
function generateRecommendations(
  concentrationLevel: 'low' | 'moderate' | 'high' | 'critical',
  top3Ratio: number,
  topFirm: FirmRevenue | undefined
): string[] {
  const recommendations: string[] = [];

  if (concentrationLevel === 'critical') {
    recommendations.push('CRITICAL: Over 80% revenue from top 3 firms - extremely high risk');
    recommendations.push('Immediately diversify client base to reduce dependency');
    recommendations.push('Losing any top firm would severely impact business');
  } else if (concentrationLevel === 'high') {
    recommendations.push('HIGH RISK: Over 60% revenue concentrated in top 3 firms');
    recommendations.push('Actively pursue new firms to reduce concentration');
    recommendations.push('Consider this a priority for business stability');
  } else if (concentrationLevel === 'moderate') {
    recommendations.push('Moderate concentration - manageable but monitor closely');
    recommendations.push('Continue efforts to diversify revenue sources');
  } else {
    recommendations.push('Good diversification - revenue well distributed');
    recommendations.push('Maintain balance across multiple firms');
  }

  if (topFirm && topFirm.revenue_share_percentage > 40) {
    recommendations.push(`Single firm dependency: ${topFirm.normalized_name} accounts for ${topFirm.revenue_share_percentage.toFixed(1)}% of revenue`);
  }

  return recommendations;
}

/**
 * Generate complete revenue risk report
 */
export async function generateRevenueRiskReport(): Promise<RevenueRiskReport> {
  const claims = await fetchCompletedClaims();
  const firmMap = aggregateRevenueByFirm(claims);

  // Calculate total revenue
  let totalRevenue = 0;
  let totalClaims = 0;

  for (const firmData of firmMap.values()) {
    totalRevenue += firmData.revenue;
    totalClaims += firmData.count;
  }

  // Build firm revenue array with percentages
  const firmRevenues: FirmRevenue[] = [];

  for (const [firmName, firmData] of firmMap.entries()) {
    const revenueSharePercentage = totalRevenue > 0
      ? (firmData.revenue / totalRevenue) * 100
      : 0;

    firmRevenues.push({
      firm_name: firmName,
      normalized_name: firmName,
      total_revenue: Math.round(firmData.revenue * 100) / 100,
      claim_count: firmData.count,
      revenue_share_percentage: Math.round(revenueSharePercentage * 100) / 100,
      avg_revenue_per_claim: Math.round((firmData.revenue / firmData.count) * 100) / 100
    });
  }

  // Sort by revenue descending
  firmRevenues.sort((a, b) => b.total_revenue - a.total_revenue);

  // Get top 3 firms
  const top3Firms = firmRevenues.slice(0, 3);
  const top3Revenue = top3Firms.reduce((sum, f) => sum + f.total_revenue, 0);
  const top3DependencyRatio = totalRevenue > 0
    ? Math.round((top3Revenue / totalRevenue) * 100 * 100) / 100
    : 0;

  // Calculate concentration metrics
  const top1Percentage = firmRevenues.length > 0 ? firmRevenues[0].revenue_share_percentage : 0;
  const top3Percentage = top3DependencyRatio;
  const top5Revenue = firmRevenues.slice(0, 5).reduce((sum, f) => sum + f.total_revenue, 0);
  const top5Percentage = totalRevenue > 0
    ? Math.round((top5Revenue / totalRevenue) * 100 * 100) / 100
    : 0;

  const herfindahlIndex = calculateHerfindahlIndex(firmRevenues);

  // Risk assessment
  const concentrationLevel = determineConcentrationLevel(top3DependencyRatio);

  let diversificationStatus = '';
  if (concentrationLevel === 'low') {
    diversificationStatus = 'Well diversified - healthy revenue distribution';
  } else if (concentrationLevel === 'moderate') {
    diversificationStatus = 'Moderately concentrated - acceptable but monitor';
  } else if (concentrationLevel === 'high') {
    diversificationStatus = 'Highly concentrated - significant dependency risk';
  } else {
    diversificationStatus = 'Critically concentrated - extreme dependency risk';
  }

  const recommendations = generateRecommendations(
    concentrationLevel,
    top3DependencyRatio,
    firmRevenues[0]
  );

  return {
    generated_at: new Date().toISOString(),
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_claims: totalClaims,
    unique_firms: firmRevenues.length,
    firm_revenues: firmRevenues,
    top_3_firms: top3Firms,
    top_3_firm_dependency_ratio: top3DependencyRatio,
    revenue_concentration: {
      top_1_percentage: Math.round(top1Percentage * 100) / 100,
      top_3_percentage: Math.round(top3Percentage * 100) / 100,
      top_5_percentage: Math.round(top5Percentage * 100) / 100,
      herfindahl_index: herfindahlIndex
    },
    risk_assessment: {
      concentration_level: concentrationLevel,
      diversification_status: diversificationStatus,
      recommendations: recommendations
    }
  };
}

/**
 * Get revenue for a specific firm
 */
export async function getFirmRevenue(firmName: string): Promise<FirmRevenue | null> {
  const report = await generateRevenueRiskReport();
  const normalizedName = normalizeFirmName(firmName);

  return report.firm_revenues.find(f => f.normalized_name === normalizedName) || null;
}

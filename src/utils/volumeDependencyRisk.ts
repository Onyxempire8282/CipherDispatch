/**
 * Volume Dependency Risk Analysis
 * Analyzes operational dependency based on claim volume concentration
 * Identifies risk from relying too heavily on specific firms for business volume
 */

import { supabase } from "../lib/supabase";
import { normalizeFirmName } from "./payoutForecasting";

export interface FirmVolume {
  firm_name: string;
  normalized_name: string;
  claim_count: number;
  volume_share_percentage: number;
}

export interface VolumeDependencyRiskReport {
  generated_at: string;
  total_claims: number;
  unique_firms: number;
  firm_volumes: FirmVolume[];
  top_3_firms: FirmVolume[];
  top_3_firm_dependency_ratio: number;
  volume_concentration: {
    top_1_percentage: number;
    top_3_percentage: number;
    top_5_percentage: number;
    herfindahl_index: number;
  };
  risk_assessment: {
    concentration_level: "low" | "moderate" | "high" | "critical";
    operational_status: string;
    recommendations: string[];
  };
}

interface ClaimForVolume {
  id: string;
  firm_name: string;
  status: string;
  completion_date: string | null;
}

/**
 * Fetch all completed claims for volume analysis
 */
async function fetchCompletedClaimsForVolume(): Promise<ClaimForVolume[]> {
  const { data, error } = await supabase
    .from("claims")
    .select("id, firm_name, status, completion_date")
    .eq("status", "COMPLETED")
    .not("firm_name", "is", null)
    .limit(100000); // Remove default 1000 row limit

  if (error) {
    console.error(
      "Error fetching completed claims for volume analysis:",
      error
    );
    throw error;
  }

  return data || [];
}

/**
 * Aggregate claim counts by firm
 */
function aggregateVolumeByFirm(claims: ClaimForVolume[]): Map<string, number> {
  const firmMap = new Map<string, number>();

  for (const claim of claims) {
    if (!claim.firm_name) continue;

    const normalizedFirm = normalizeFirmName(claim.firm_name);

    if (!firmMap.has(normalizedFirm)) {
      firmMap.set(normalizedFirm, 0);
    }

    firmMap.set(normalizedFirm, firmMap.get(normalizedFirm)! + 1);
  }

  return firmMap;
}

/**
 * Calculate Herfindahl-Hirschman Index for volume concentration
 */
function calculateVolumeHerfindahlIndex(firmVolumes: FirmVolume[]): number {
  let hhi = 0;

  for (const firm of firmVolumes) {
    const marketShare = firm.volume_share_percentage;
    hhi += Math.pow(marketShare, 2);
  }

  return Math.round(hhi);
}

/**
 * Assess volume dependency risk level
 */
function assessVolumeDependencyRisk(
  top3Percentage: number,
  hhi: number,
  firmCount: number
): {
  concentration_level: "low" | "moderate" | "high" | "critical";
  operational_status: string;
  recommendations: string[];
} {
  const recommendations: string[] = [];
  let concentration_level: "low" | "moderate" | "high" | "critical";
  let operational_status: string;

  if (top3Percentage >= 85) {
    concentration_level = "critical";
    operational_status = "Severe operational dependency detected";
    recommendations.push("URGENT: Diversify client base immediately");
    recommendations.push("Implement contingency plans for top clients");
    recommendations.push("Consider operational risk insurance");
  } else if (top3Percentage >= 70) {
    concentration_level = "high";
    operational_status = "High operational dependency risk";
    recommendations.push("Actively pursue new firm partnerships");
    recommendations.push("Reduce reliance on top 3 firms");
    recommendations.push("Develop backup capacity for key accounts");
  } else if (top3Percentage >= 50) {
    concentration_level = "moderate";
    operational_status = "Moderate operational concentration";
    recommendations.push("Monitor volume distribution trends");
    recommendations.push("Continue diversification efforts");
    recommendations.push("Build relationships with mid-tier firms");
  } else {
    concentration_level = "low";
    operational_status = "Well-diversified volume base";
    recommendations.push("Maintain current diversification");
    recommendations.push("Continue monitoring for concentration drift");
  }

  // HHI-specific recommendations
  if (hhi > 2500) {
    recommendations.push("HHI indicates high volume concentration");
  }

  // Firm count recommendations
  if (firmCount < 5) {
    recommendations.push("Increase total number of active firm partnerships");
  }

  return {
    concentration_level,
    operational_status,
    recommendations,
  };
}

/**
 * Generate volume dependency risk report
 */
export async function generateVolumeDependencyRiskReport(): Promise<VolumeDependencyRiskReport> {
  const claims = await fetchCompletedClaimsForVolume();

  if (claims.length === 0) {
    throw new Error("No completed claims found for volume dependency analysis");
  }

  const firmVolumeMap = aggregateVolumeByFirm(claims);
  const totalClaims = claims.length;
  const uniqueFirms = firmVolumeMap.size;

  // Convert to array and calculate percentages
  const firmVolumes: FirmVolume[] = Array.from(firmVolumeMap.entries())
    .map(([firmName, claimCount]) => {
      // Extract original firm name for display
      const originalName =
        claims.find((c) => normalizeFirmName(c.firm_name) === firmName)
          ?.firm_name || firmName;

      return {
        firm_name: originalName,
        normalized_name: firmName,
        claim_count: claimCount,
        volume_share_percentage: (claimCount / totalClaims) * 100,
      };
    })
    .sort((a, b) => b.claim_count - a.claim_count);

  // Calculate concentration metrics
  const top3Firms = firmVolumes.slice(0, 3);
  const top3Percentage = top3Firms.reduce(
    (sum, firm) => sum + firm.volume_share_percentage,
    0
  );

  const volumeConcentration = {
    top_1_percentage: firmVolumes[0]?.volume_share_percentage || 0,
    top_3_percentage: top3Percentage,
    top_5_percentage: firmVolumes
      .slice(0, 5)
      .reduce((sum, firm) => sum + firm.volume_share_percentage, 0),
    herfindahl_index: calculateVolumeHerfindahlIndex(firmVolumes),
  };

  const riskAssessment = assessVolumeDependencyRisk(
    top3Percentage,
    volumeConcentration.herfindahl_index,
    uniqueFirms
  );

  return {
    generated_at: new Date().toISOString(),
    total_claims: totalClaims,
    unique_firms: uniqueFirms,
    firm_volumes: firmVolumes,
    top_3_firms: top3Firms,
    top_3_firm_dependency_ratio: Math.round(top3Percentage * 10) / 10,
    volume_concentration: {
      ...volumeConcentration,
      top_1_percentage:
        Math.round(volumeConcentration.top_1_percentage * 10) / 10,
      top_3_percentage:
        Math.round(volumeConcentration.top_3_percentage * 10) / 10,
      top_5_percentage:
        Math.round(volumeConcentration.top_5_percentage * 10) / 10,
    },
    risk_assessment: riskAssessment,
  };
}

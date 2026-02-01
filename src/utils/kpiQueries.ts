/**
 * KPI Supabase Query Functions (V1)
 *
 * Query strategy:
 * - Claims query uses OR logic to capture all relevant claims for the period
 * - Photo metrics query uses claim_photos table with period filter
 * - Both queries filter out archived claims
 */

import { supabase } from '../lib/supabase';
import type { KPIClaim } from '../types/kpi';

// ═══════════════════════════════════════════════════════════════
// CLAIMS QUERY
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all claims relevant for KPI calculation
 *
 * Query logic:
 * - Claims where completion_date is in period (completed work)
 * - OR appointment_start is in period (scheduled work)
 * - OR scheduled_at is in period (scheduling activity)
 * - Excludes archived claims
 *
 * Note: This fetches a superset; calculations filter further as needed
 */
export async function fetchKPIClaims(
  startDate: Date,
  endDate: Date
): Promise<KPIClaim[]> {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  // Supabase .or() has limitations with complex date ranges
  // Strategy: Fetch claims with any relevant date in the range, plus active pipeline claims
  // This ensures we capture:
  // 1. Claims completed in period
  // 2. Claims scheduled in period
  // 3. Current pipeline (for point-in-time status)

  const { data, error } = await supabase
    .from('claims')
    .select(`
      id,
      claim_number,
      status,
      created_at,
      completion_date,
      appointment_start,
      appointment_end,
      scheduled_at,
      file_total,
      pay_amount,
      firm,
      assigned_to,
      is_supplement,
      original_claim_id,
      archived_at
    `)
    .is('archived_at', null)
    .or([
      `completion_date.gte.${startISO},completion_date.lte.${endISO}`,
      `appointment_start.gte.${startISO},appointment_start.lte.${endISO}`,
      `scheduled_at.gte.${startISO},scheduled_at.lte.${endISO}`,
      // Also include active pipeline claims (not completed/canceled)
      `status.in.(UNASSIGNED,SCHEDULED,IN_PROGRESS)`,
    ].join(','));

  if (error) {
    console.error('Error fetching KPI claims:', error);
    throw error;
  }

  return (data ?? []) as KPIClaim[];
}

/**
 * Alternative: Two-query approach if .or() causes issues
 * Fetches period claims and current pipeline separately, then merges
 */
export async function fetchKPIClaimsTwoQuery(
  startDate: Date,
  endDate: Date
): Promise<KPIClaim[]> {
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();

  const selectFields = `
    id,
    claim_number,
    status,
    created_at,
    completion_date,
    appointment_start,
    appointment_end,
    scheduled_at,
    file_total,
    pay_amount,
    firm,
    assigned_to,
    is_supplement,
    original_claim_id,
    archived_at
  `;

  // Query 1: Claims with completion_date in period
  const completedQuery = supabase
    .from('claims')
    .select(selectFields)
    .is('archived_at', null)
    .gte('completion_date', startISO)
    .lte('completion_date', endISO);

  // Query 2: Claims with appointment_start in period (may overlap, will dedupe)
  const scheduledQuery = supabase
    .from('claims')
    .select(selectFields)
    .is('archived_at', null)
    .gte('appointment_start', startISO)
    .lte('appointment_start', endISO);

  // Query 3: Current active pipeline claims (for point-in-time metrics)
  const pipelineQuery = supabase
    .from('claims')
    .select(selectFields)
    .is('archived_at', null)
    .in('status', ['UNASSIGNED', 'SCHEDULED', 'IN_PROGRESS']);

  const [completedResult, scheduledResult, pipelineResult] = await Promise.all([
    completedQuery,
    scheduledQuery,
    pipelineQuery,
  ]);

  // Check for errors
  if (completedResult.error) throw completedResult.error;
  if (scheduledResult.error) throw scheduledResult.error;
  if (pipelineResult.error) throw pipelineResult.error;

  // Merge and deduplicate by claim ID
  const claimMap = new Map<string, KPIClaim>();

  for (const claim of (completedResult.data ?? [])) {
    claimMap.set(claim.id, claim as KPIClaim);
  }
  for (const claim of (scheduledResult.data ?? [])) {
    claimMap.set(claim.id, claim as KPIClaim);
  }
  for (const claim of (pipelineResult.data ?? [])) {
    claimMap.set(claim.id, claim as KPIClaim);
  }

  return Array.from(claimMap.values());
}

// ═══════════════════════════════════════════════════════════════
// PHOTO METRICS QUERY
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch photo metrics for a period
 *
 * Returns:
 * - claimsWithPhotos: count of unique claims that have photos uploaded in period
 * - totalPhotosUploaded: count of all photos uploaded in period
 * - avgPhotosPerClaim: totalPhotosUploaded / claimsWithPhotos (0 if no claims)
 */
export async function fetchPhotoMetrics(
  startDate: Date,
  endDate: Date
): Promise<{
  claimsWithPhotos: number;
  totalPhotosUploaded: number;
  avgPhotosPerClaim: number;
}> {
  const { data, error } = await supabase
    .from('claim_photos')
    .select('claim_id, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (error) {
    console.error('Error fetching photo metrics:', error);
    throw error;
  }

  const photos = data ?? [];

  // Count unique claims with photos
  const uniqueClaimIds = new Set(photos.map(p => p.claim_id));
  const claimsWithPhotos = uniqueClaimIds.size;

  // Total photos uploaded
  const totalPhotosUploaded = photos.length;

  // Average photos per claim (denominator = unique claims, not total photos)
  const avgPhotosPerClaim = claimsWithPhotos > 0
    ? Math.round((totalPhotosUploaded / claimsWithPhotos) * 10) / 10
    : 0;

  return {
    claimsWithPhotos,
    totalPhotosUploaded,
    avgPhotosPerClaim,
  };
}

// ═══════════════════════════════════════════════════════════════
// MONTHLY TREND QUERY (data structure ready for V2 charting)
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch historical data for trend analysis
 * Returns completed claims from the last N months
 */
export async function fetchMonthlyTrendData(monthsBack: number = 12): Promise<KPIClaim[]> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);

  const { data, error } = await supabase
    .from('claims')
    .select(`
      id,
      claim_number,
      status,
      created_at,
      completion_date,
      appointment_start,
      appointment_end,
      scheduled_at,
      file_total,
      pay_amount,
      firm,
      assigned_to,
      is_supplement,
      original_claim_id,
      archived_at
    `)
    .eq('status', 'COMPLETED')
    .gte('completion_date', cutoffDate.toISOString())
    .is('archived_at', null)
    .order('completion_date', { ascending: true });

  if (error) {
    console.error('Error fetching trend data:', error);
    throw error;
  }

  return (data ?? []) as KPIClaim[];
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE: Combined KPI data fetch
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all data needed for the KPI dashboard in parallel
 */
export async function fetchAllKPIData(
  periodStart: Date,
  periodEnd: Date
): Promise<{
  claims: KPIClaim[];
  photoMetrics: { claimsWithPhotos: number; totalPhotosUploaded: number; avgPhotosPerClaim: number };
}> {
  const [claims, photoMetrics] = await Promise.all([
    fetchKPIClaimsTwoQuery(periodStart, periodEnd),
    fetchPhotoMetrics(periodStart, periodEnd),
  ]);

  return { claims, photoMetrics };
}

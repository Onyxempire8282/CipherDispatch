/**
 * Route Operations
 *
 * Handles the "Close Route" lifecycle that persists mileage data
 * to mileage_logs for IRS-defensible tracking.
 *
 * ═══════════════════════════════════════════════════════════════
 * CORE PRINCIPLE: This is a LOGGING system, not a TRACKING system.
 * ═══════════════════════════════════════════════════════════════
 *
 * - Mileage is calculated during route optimization (not here)
 * - Close Route snapshots existing route data to mileage_logs
 * - No GPS tracking, no Maps API calls, no distance calculations
 *
 * ═══════════════════════════════════════════════════════════════
 * DATA FLOW
 * ═══════════════════════════════════════════════════════════════
 *
 * Route optimization (elsewhere) → route.total_miles, route.start_address, route.end_address
 * User sets route.date (can change before closing)
 * closeRoute() → snapshots route data → mileage_logs.log_date = route.date
 *
 * ═══════════════════════════════════════════════════════════════
 * ATOMICITY LIMITATION
 * ═══════════════════════════════════════════════════════════════
 *
 * Supabase JS client does not support multi-statement transactions.
 * closeRoute() executes: delete → insert → update (3 separate calls).
 *
 * Failure scenarios:
 * - Delete fails: No change, safe to retry
 * - Insert fails: No log created, route still open, safe to retry
 * - Update fails: Log exists but route shows 'active'
 *   → Recovery: retry closeRoute() (delete removes duplicate, insert recreates)
 *
 * This ordering ensures the mileage log is never lost once created.
 *
 * ═══════════════════════════════════════════════════════════════
 * RLS IMMUTABILITY BEHAVIOR
 * ═══════════════════════════════════════════════════════════════
 *
 * Before RLS hardening:
 * - Delete succeeds, allowing reopen/resubmit
 *
 * After RLS hardening (DELETE policy blocks all):
 * - Delete returns 0 rows affected (no error thrown)
 * - Insert fails with unique constraint on route_id
 * - This is intentional: closed routes cannot be re-logged
 * - Corrections require service role (admin intervention)
 */

import { supabase } from '../lib/supabase';
import type { CloseRouteResult, MileageLogInsert } from '../types/mileage';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface Route {
  id: string;
  user_id: string;
  date: string;           // Effective date for mileage log
  status: string;
  total_miles: number;    // From route optimization
  start_address: string;  // From route optimization
  end_address: string;    // From route optimization
}

// ═══════════════════════════════════════════════════════════════
// CLOSE ROUTE
// ═══════════════════════════════════════════════════════════════

/**
 * Close a route and persist its mileage data to mileage_logs.
 *
 * This function does NOT calculate mileage. It snapshots existing
 * route data that was computed during route optimization.
 *
 * @throws Error if route not found, not owned, already closed, or missing data
 * @throws Error if mileage log insert fails
 * @throws Error if route status update fails (log already persisted)
 */
export async function closeRoute(
  routeId: string,
  userId: string
): Promise<CloseRouteResult> {
  // ─────────────────────────────────────────────────────────────
  // 1. Fetch and validate route
  // ─────────────────────────────────────────────────────────────
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select('id, user_id, date, status, total_miles, start_address, end_address')
    .eq('id', routeId)
    .single();

  if (routeError || !route) {
    throw new Error('Route not found');
  }

  const typedRoute = route as Route;

  if (typedRoute.user_id !== userId) {
    throw new Error('Forbidden: You do not own this route');
  }

  if (typedRoute.status === 'closed') {
    throw new Error('Route is already closed');
  }

  if (typedRoute.total_miles == null || typedRoute.total_miles < 0) {
    throw new Error('Route mileage data is missing. Complete route optimization first.');
  }

  if (!typedRoute.start_address || !typedRoute.end_address) {
    throw new Error('Route address data is missing. Complete route optimization first.');
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Collect completed claims
  // ─────────────────────────────────────────────────────────────
  const { data: completedClaims, error: claimsError } = await supabase
    .from('claims_v')
    .select('id')
    .eq('route_id', routeId)
    .eq('status', 'COMPLETED');

  if (claimsError) {
    throw new Error(`Failed to fetch claims: ${claimsError.message}`);
  }

  const claimIds = completedClaims?.map(c => c.id) ?? [];

  // ─────────────────────────────────────────────────────────────
  // 3. Delete existing log (enables reopen/resubmit before RLS)
  //
  // After RLS hardening: returns 0 rows, no error thrown.
  // Insert will then fail on unique constraint (correct behavior).
  // ─────────────────────────────────────────────────────────────
  await supabase
    .from('mileage_logs')
    .delete()
    .eq('route_id', routeId);

  // ─────────────────────────────────────────────────────────────
  // 4. Insert mileage log snapshot
  // ─────────────────────────────────────────────────────────────
  const mileageLogData: MileageLogInsert = {
    route_id: routeId,
    user_id: userId,
    log_date: typedRoute.date,
    start_address: typedRoute.start_address,
    end_address: typedRoute.end_address,
    total_miles: typedRoute.total_miles,
    claim_count: claimIds.length,
    claim_ids: claimIds,
  };

  const { data: mileageLog, error: logError } = await supabase
    .from('mileage_logs')
    .insert(mileageLogData)
    .select('id')
    .single();

  if (logError) {
    // After RLS: unique constraint violation means log already exists and is immutable
    const isImmutable = logError.code === '23505'; // unique_violation
    if (isImmutable) {
      throw new Error('Route already has an immutable mileage log. Contact admin for corrections.');
    }
    throw new Error(`Failed to create mileage log: ${logError.message}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Update route status
  //
  // If this fails, the mileage log exists but route shows 'active'.
  // Retry closeRoute() to recover (delete + insert handles idempotency).
  // ─────────────────────────────────────────────────────────────
  const { error: updateError } = await supabase
    .from('routes')
    .update({ status: 'closed' })
    .eq('id', routeId);

  if (updateError) {
    throw new Error(
      `Mileage log created but route status update failed. ` +
      `Retry closeRoute() to complete. Error: ${updateError.message}`
    );
  }

  return {
    success: true,
    totalMiles: typedRoute.total_miles,
    claimCount: claimIds.length,
    mileageLogId: mileageLog.id,
  };
}

// ═══════════════════════════════════════════════════════════════
// REOPEN ROUTE (before RLS hardening only)
// ═══════════════════════════════════════════════════════════════

/**
 * Reopen a closed route for editing.
 *
 * Allows user to update route.date or stops, then re-close.
 *
 * After RLS immutability is applied:
 * - Delete returns 0 rows (no error)
 * - This function checks row count and fails explicitly
 * - Corrections require service role (admin intervention)
 *
 * @throws Error if route not found, not owned, or not closed
 * @throws Error if mileage log is immutable (post-RLS)
 */
export async function reopenRoute(
  routeId: string,
  userId: string
): Promise<{ success: boolean }> {
  // Validate route
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select('id, user_id, status')
    .eq('id', routeId)
    .single();

  if (routeError || !route) {
    throw new Error('Route not found');
  }

  if (route.user_id !== userId) {
    throw new Error('Forbidden: You do not own this route');
  }

  if (route.status !== 'closed') {
    throw new Error('Route is not closed');
  }

  // Attempt to delete mileage log
  // RLS denial returns count=0, not an error
  const { error: deleteError, count } = await supabase
    .from('mileage_logs')
    .delete({ count: 'exact' })
    .eq('route_id', routeId);

  if (deleteError) {
    throw new Error(`Failed to delete mileage log: ${deleteError.message}`);
  }

  if (count === 0) {
    // Either no log existed (edge case) or RLS blocked deletion
    // Check if log exists to distinguish
    const { data: existingLog } = await supabase
      .from('mileage_logs')
      .select('id')
      .eq('route_id', routeId)
      .single();

    if (existingLog) {
      throw new Error('Cannot reopen: mileage log is immutable. Contact admin for corrections.');
    }
    // No log existed - proceed with reopen
  }

  // Update route status
  const { error: updateError } = await supabase
    .from('routes')
    .update({ status: 'active' })
    .eq('id', routeId);

  if (updateError) {
    throw new Error(`Failed to reopen route: ${updateError.message}`);
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch mileage logs for a user within a date range.
 *
 * @throws Error if query fails
 */
export async function fetchMileageLogs(
  userId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('mileage_logs')
    .select(`
      id,
      route_id,
      user_id,
      log_date,
      start_address,
      end_address,
      total_miles,
      business_purpose,
      claim_count,
      claim_ids,
      created_at,
      profiles:user_id (full_name)
    `)
    .eq('user_id', userId)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch mileage logs: ${error.message}`);
  }

  return data ?? [];
}

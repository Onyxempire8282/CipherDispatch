/**
 * Route Operations
 *
 * Handles route lifecycle operations including the "Close Route" flow
 * that persists immutable mileage logs for IRS-defensible tracking.
 *
 * IMPORTANT: This is a LOGGING system, not a TRACKING system.
 * - Mileage is NOT calculated at Close Route time
 * - Mileage already exists from route optimization
 * - Close Route simply snapshots existing data into mileage_logs
 *
 * PREREQUISITES:
 * - routes table with: id, user_id, date, status, total_miles, start_address, end_address
 * - claims linked to routes via route_id
 *
 * LOG DATE BEHAVIOR:
 * - log_date is sourced from route.date at Close Route time
 * - User may update route.date before closing
 * - Once closed, the log_date reflects the final route.date
 *
 * REOPEN BEHAVIOR (before RLS hardening):
 * - If a route is reopened and resubmitted, the previous log is replaced
 * - After RLS immutability is applied, logs can only be corrected via service role
 */

import { supabase } from '../lib/supabase';
import type { CloseRouteResult, MileageLogInsert } from '../types/mileage';

// ═══════════════════════════════════════════════════════════════
// ROUTE INTERFACE
// ═══════════════════════════════════════════════════════════════

interface Route {
  id: string;
  user_id: string;
  date: string;                    // User-controlled effective date
  status: string;
  total_miles: number;             // Already calculated from route optimization
  start_address: string;           // First stop address
  end_address: string;             // Last stop address
}

// ═══════════════════════════════════════════════════════════════
// CLOSE ROUTE (persistence only - no calculation)
// ═══════════════════════════════════════════════════════════════

/**
 * Close a route and persist its mileage data to mileage_logs
 *
 * This function DOES NOT calculate mileage. It snapshots existing
 * route data that was already computed during route optimization.
 *
 * Flow:
 * 1. Validate route ownership and status
 * 2. Read existing mileage data from route
 * 3. Get completed claims for this route
 * 4. Delete any existing mileage log for this route (reopen case)
 * 5. Insert new mileage log snapshot
 * 6. Update route status to 'closed'
 *
 * @param routeId The route to close
 * @param userId The user performing the action (for validation)
 */
export async function closeRoute(
  routeId: string,
  userId: string
): Promise<CloseRouteResult> {
  // 1. Fetch route with existing mileage data
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

  // Validate required mileage data exists
  if (typedRoute.total_miles == null || typedRoute.total_miles < 0) {
    throw new Error('Route mileage data is missing. Complete route optimization first.');
  }

  if (!typedRoute.start_address || !typedRoute.end_address) {
    throw new Error('Route address data is missing. Complete route optimization first.');
  }

  // 2. Get completed claims for this route
  const { data: completedClaims } = await supabase
    .from('claims')
    .select('id')
    .eq('route_id', routeId)
    .eq('status', 'COMPLETED');

  const claimIds = completedClaims?.map(c => c.id) ?? [];
  const claimCount = claimIds.length;

  // 3. Delete any existing mileage log for this route (handles reopen/resubmit case)
  // NOTE: This will fail silently after RLS immutability is applied
  await supabase
    .from('mileage_logs')
    .delete()
    .eq('route_id', routeId);

  // 4. Insert mileage log (snapshot of existing route data)
  const mileageLogData: MileageLogInsert = {
    route_id: routeId,
    user_id: userId,
    log_date: typedRoute.date,              // User-controlled effective date
    start_address: typedRoute.start_address,
    end_address: typedRoute.end_address,
    total_miles: typedRoute.total_miles,    // Already calculated, just persisting
    claim_count: claimCount,
    claim_ids: claimIds,
  };

  const { data: mileageLog, error: logError } = await supabase
    .from('mileage_logs')
    .insert(mileageLogData)
    .select('id')
    .single();

  if (logError) {
    throw new Error(`Failed to create mileage log: ${logError.message}`);
  }

  // 5. Update route status to closed
  const { error: updateError } = await supabase
    .from('routes')
    .update({ status: 'closed' })
    .eq('id', routeId);

  if (updateError) {
    throw new Error(`Failed to close route: ${updateError.message}`);
  }

  return {
    success: true,
    totalMiles: typedRoute.total_miles,
    claimCount,
    mileageLogId: mileageLog.id,
  };
}

// ═══════════════════════════════════════════════════════════════
// REOPEN ROUTE (before RLS hardening only)
// ═══════════════════════════════════════════════════════════════

/**
 * Reopen a closed route for editing
 *
 * This allows the user to:
 * - Update the route date
 * - Modify stops
 * - Re-close with updated data
 *
 * NOTE: After RLS immutability is applied to mileage_logs,
 * the existing log cannot be deleted. Use service role for corrections.
 *
 * @param routeId The route to reopen
 * @param userId The user performing the action (for validation)
 */
export async function reopenRoute(
  routeId: string,
  userId: string
): Promise<{ success: boolean }> {
  // Fetch route and validate ownership
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

  // Delete existing mileage log (will fail after RLS hardening)
  const { error: deleteError } = await supabase
    .from('mileage_logs')
    .delete()
    .eq('route_id', routeId);

  if (deleteError) {
    throw new Error(`Cannot reopen: mileage log is immutable. Contact admin for correction.`);
  }

  // Update route status to active
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
// MILEAGE LOG QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch mileage logs for a user within a date range
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

/**
 * Check if a mileage log exists for a route
 */
export async function hasMileageLog(routeId: string): Promise<boolean> {
  const { data } = await supabase
    .from('mileage_logs')
    .select('id')
    .eq('route_id', routeId)
    .single();

  return data !== null;
}

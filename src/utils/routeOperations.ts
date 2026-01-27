/**
 * Route Operations
 *
 * Handles route lifecycle operations including the "Close Route" flow
 * that generates immutable mileage logs for IRS-defensible tracking.
 *
 * PREREQUISITES:
 * - routes table with: id, user_id, date, status
 * - route_stops table with: route_id, address, sequence
 * - claims linked to routes via route_id
 * - Google Maps Directions API key in environment
 *
 * If routes table doesn't exist yet, use closeDayRoute() which groups
 * claims by appointment date and calculates mileage from claim addresses.
 */

import { supabase } from '../lib/supabase';
import type { CloseRouteResult, MileageLogInsert } from '../types/mileage';

// ═══════════════════════════════════════════════════════════════
// GOOGLE MAPS DISTANCE CALCULATION
// ═══════════════════════════════════════════════════════════════

interface DirectionsLeg {
  distance: { value: number };
}

interface DirectionsRoute {
  legs: DirectionsLeg[];
}

interface DirectionsResponse {
  status: string;
  routes: DirectionsRoute[];
}

/**
 * Calculate total route distance via Google Maps Directions API
 *
 * @param addresses Ordered array of addresses (first = origin, last = destination)
 * @returns Total distance in miles (1 decimal precision)
 */
export async function calculateRouteDistance(addresses: string[]): Promise<number> {
  if (addresses.length < 2) {
    throw new Error('Route needs at least 2 addresses');
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  const origin = encodeURIComponent(addresses[0]);
  const destination = encodeURIComponent(addresses[addresses.length - 1]);
  const waypoints = addresses.slice(1, -1).map(a => encodeURIComponent(a)).join('|');

  let url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }

  const response = await fetch(url);
  const data: DirectionsResponse = await response.json();

  if (data.status !== 'OK' || !data.routes?.[0]) {
    throw new Error(`Could not calculate route distance: ${data.status}`);
  }

  // Sum all leg distances
  const totalMeters = data.routes[0].legs.reduce(
    (sum, leg) => sum + leg.distance.value,
    0
  );

  // Convert meters to miles, round to 1 decimal
  return Math.round((totalMeters / 1609.34) * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════
// CLOSE ROUTE (requires routes table)
// ═══════════════════════════════════════════════════════════════

interface Route {
  id: string;
  user_id: string;
  date: string;
  status: string;
}

interface RouteStop {
  address: string;
  sequence: number;
}

/**
 * Close a route and generate a mileage log
 *
 * Flow:
 * 1. Validate route ownership and status
 * 2. Fetch ordered stops
 * 3. Calculate distance via Google Maps
 * 4. Get completed claims for this route
 * 5. Insert mileage log
 * 6. Update route status to 'closed'
 *
 * @param routeId The route to close
 * @param userId The user performing the action (for validation)
 */
export async function closeRoute(
  routeId: string,
  userId: string
): Promise<CloseRouteResult> {
  // 1. Fetch route and validate
  const { data: route, error: routeError } = await supabase
    .from('routes')
    .select('id, user_id, date, status')
    .eq('id', routeId)
    .single();

  if (routeError || !route) {
    throw new Error('Route not found');
  }

  const typedRoute = route as Route;

  if (typedRoute.user_id !== userId) {
    throw new Error('Forbidden: You do not own this route');
  }

  if (typedRoute.status !== 'active') {
    throw new Error(`Route cannot be closed: status is '${typedRoute.status}'`);
  }

  // 2. Fetch ordered stops
  const { data: stops, error: stopsError } = await supabase
    .from('route_stops')
    .select('address, sequence')
    .eq('route_id', routeId)
    .order('sequence', { ascending: true });

  if (stopsError || !stops || stops.length < 2) {
    throw new Error('Route needs at least 2 stops');
  }

  const typedStops = stops as RouteStop[];
  const addresses = typedStops.map(s => s.address);

  // 3. Calculate distance via Google Maps
  const totalMiles = await calculateRouteDistance(addresses);

  // 4. Get completed claims for this route
  const { data: completedClaims } = await supabase
    .from('claims')
    .select('id')
    .eq('route_id', routeId)
    .eq('status', 'COMPLETED');

  const claimIds = completedClaims?.map(c => c.id) ?? [];
  const claimCount = claimIds.length;

  // 5. Insert mileage log
  const mileageLogData: MileageLogInsert = {
    route_id: routeId,
    user_id: userId,
    log_date: typedRoute.date,
    start_address: addresses[0],
    end_address: addresses[addresses.length - 1],
    total_miles: totalMiles,
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

  // 6. Update route status
  const { error: updateError } = await supabase
    .from('routes')
    .update({ status: 'closed' })
    .eq('id', routeId);

  if (updateError) {
    throw new Error(`Failed to close route: ${updateError.message}`);
  }

  return {
    success: true,
    totalMiles,
    claimCount,
    mileageLogId: mileageLog.id,
  };
}

// ═══════════════════════════════════════════════════════════════
// CLOSE DAY ROUTE (alternative when routes table doesn't exist)
// ═══════════════════════════════════════════════════════════════

interface ClaimWithAddress {
  id: string;
  address_line1: string;
  city: string;
  state: string;
  postal_code: string;
  status: string;
  appointment_start: string;
}

/**
 * Close a day's work and generate a mileage log from claims
 *
 * Alternative to closeRoute() when formal routes table doesn't exist.
 * Groups claims by appointment date and uses claim addresses as stops.
 *
 * @param date The workday date (YYYY-MM-DD)
 * @param userId The user whose day to close
 * @param homeAddress The user's starting/ending address
 */
export async function closeDayRoute(
  date: string,
  userId: string,
  homeAddress: string
): Promise<CloseRouteResult> {
  // Generate a deterministic route_id from date + userId
  const routeId = `${date}-${userId}`;

  // Check if already logged
  const { data: existingLog } = await supabase
    .from('mileage_logs')
    .select('id')
    .eq('route_id', routeId)
    .single();

  if (existingLog) {
    throw new Error('Mileage already logged for this date');
  }

  // Fetch claims for this user on this date
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data: claims, error: claimsError } = await supabase
    .from('claims')
    .select('id, address_line1, city, state, postal_code, status, appointment_start')
    .eq('assigned_to', userId)
    .gte('appointment_start', startOfDay)
    .lte('appointment_start', endOfDay)
    .order('appointment_start', { ascending: true });

  if (claimsError) {
    throw new Error(`Failed to fetch claims: ${claimsError.message}`);
  }

  const typedClaims = (claims ?? []) as ClaimWithAddress[];

  if (typedClaims.length === 0) {
    throw new Error('No claims found for this date');
  }

  // Build addresses array: home → claims (in order) → home
  const claimAddresses = typedClaims.map(c =>
    [c.address_line1, c.city, c.state, c.postal_code].filter(Boolean).join(', ')
  );
  const addresses = [homeAddress, ...claimAddresses, homeAddress];

  // Calculate distance
  const totalMiles = await calculateRouteDistance(addresses);

  // Get completed claim IDs
  const completedClaims = typedClaims.filter(c => c.status === 'COMPLETED');
  const claimIds = completedClaims.map(c => c.id);

  // Insert mileage log
  const mileageLogData: MileageLogInsert = {
    route_id: routeId,
    user_id: userId,
    log_date: date,
    start_address: homeAddress,
    end_address: homeAddress,
    total_miles: totalMiles,
    claim_count: claimIds.length,
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

  return {
    success: true,
    totalMiles,
    claimCount: claimIds.length,
    mileageLogId: mileageLog.id,
  };
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

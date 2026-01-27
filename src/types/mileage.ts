/**
 * Mileage Log Type Definitions
 *
 * Supports IRS-defensible mileage tracking derived from completed routes.
 * Logs are immutable once created (enforced via RLS).
 */

export interface MileageLog {
  id: string;
  route_id: string;
  user_id: string;
  log_date: string;              // ISO date string (YYYY-MM-DD)
  start_address: string;
  end_address: string;
  total_miles: number;
  business_purpose: string;
  claim_count: number;
  claim_ids: string[];
  created_at: string;            // ISO timestamp
}

export interface MileageLogInsert {
  route_id: string;
  user_id: string;
  log_date: string;
  start_address: string;
  end_address: string;
  total_miles: number;
  business_purpose?: string;     // defaults to 'Auto damage inspections'
  claim_count: number;
  claim_ids: string[];
}

export interface MileageLogWithUser extends MileageLog {
  profiles: {
    full_name: string;
  } | null;
}

export interface CloseRouteResult {
  success: boolean;
  totalMiles: number;
  claimCount: number;
  mileageLogId: string;
}

export interface MileageExportFilters {
  startDate: string;             // ISO date string
  endDate: string;               // ISO date string
  userId?: string;               // optional, defaults to current user
}

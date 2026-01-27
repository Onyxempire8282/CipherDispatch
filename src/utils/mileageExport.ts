/**
 * Mileage Log CSV Export
 *
 * Generates IRS-defensible mileage logs in CSV format.
 * Follows IRS Publication 463 requirements for business mileage records.
 *
 * Required columns:
 * - Date
 * - Start Address
 * - End Address
 * - Total Miles
 * - Business Purpose
 * - Claims Covered
 * - User Name
 * - Route ID
 */

import { supabase } from '../lib/supabase';
import type { MileageLogWithUser, MileageExportFilters } from '../types/mileage';

// ═══════════════════════════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch mileage logs for export
 */
export async function fetchMileageLogsForExport(
  filters: MileageExportFilters
): Promise<MileageLogWithUser[]> {
  let query = supabase
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
    .gte('log_date', filters.startDate)
    .lte('log_date', filters.endDate)
    .order('log_date', { ascending: true });

  // Filter by user if specified
  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch mileage logs: ${error.message}`);
  }

  return (data ?? []) as MileageLogWithUser[];
}

// ═══════════════════════════════════════════════════════════════
// CSV GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate CSV content from mileage logs
 */
export function generateMileageCSV(logs: MileageLogWithUser[]): string {
  const headers = [
    'Date',
    'Start Address',
    'End Address',
    'Total Miles',
    'Business Purpose',
    'Claims Covered',
    'User Name',
    'Route ID'
  ];

  const rows = logs.map(log => [
    log.log_date,
    log.start_address,
    log.end_address,
    log.total_miles.toFixed(1),
    log.business_purpose,
    log.claim_count.toString(),
    log.profiles?.full_name || 'Unknown',
    log.route_id
  ].map(field => `"${String(field).replace(/"/g, '""')}"`));

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Calculate totals for mileage summary
 */
export function calculateMileageTotals(logs: MileageLogWithUser[]): {
  totalMiles: number;
  totalClaims: number;
  totalDays: number;
} {
  return {
    totalMiles: logs.reduce((sum, log) => sum + log.total_miles, 0),
    totalClaims: logs.reduce((sum, log) => sum + log.claim_count, 0),
    totalDays: logs.length,
  };
}

// ═══════════════════════════════════════════════════════════════
// DOWNLOAD TRIGGER
// ═══════════════════════════════════════════════════════════════

/**
 * Download mileage logs as CSV file
 *
 * @param filters Date range and optional user filter
 * @param filename Optional custom filename (defaults to mileage_log_YYYY-MM-DD.csv)
 */
export async function downloadMileageCSV(
  filters: MileageExportFilters,
  filename?: string
): Promise<void> {
  // Fetch logs
  const logs = await fetchMileageLogsForExport(filters);

  if (logs.length === 0) {
    throw new Error('No mileage logs found for the selected date range');
  }

  // Generate CSV
  const csv = generateMileageCSV(logs);

  // Create download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const defaultFilename = `mileage_log_${filters.startDate}_to_${filters.endDate}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
// EXCEL EXPORT (optional enhancement)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate mileage data formatted for Excel compatibility
 * Adds BOM for proper UTF-8 handling in Excel
 */
export function generateMileageCSVForExcel(logs: MileageLogWithUser[]): string {
  const BOM = '\uFEFF';
  return BOM + generateMileageCSV(logs);
}

/**
 * Download mileage logs as Excel-compatible CSV
 */
export async function downloadMileageExcel(
  filters: MileageExportFilters,
  filename?: string
): Promise<void> {
  const logs = await fetchMileageLogsForExport(filters);

  if (logs.length === 0) {
    throw new Error('No mileage logs found for the selected date range');
  }

  const csv = generateMileageCSVForExcel(logs);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const defaultFilename = `mileage_log_${filters.startDate}_to_${filters.endDate}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', filename || defaultFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Firm Fee Configuration
// Maps each firm to their standard fee structure

export interface FirmFeeStructure {
  baseFee: number;
  perMileRate?: number;
  notes?: string;
}

export const FIRM_FEE_CONFIG: Record<string, FirmFeeStructure> = {
  // Weekly payers
  'Sedgwick': {
    baseFee: 200,
    perMileRate: 0.75,
    notes: 'Pays weekly on Wednesday for Fri-Thu work'
  },
  'Doan': {
    baseFee: 180,
    perMileRate: 0.70,
    notes: 'Pays weekly on Thursday'
  },

  // Bi-weekly payers
  'Legacy': {
    baseFee: 190,
    perMileRate: 0.72,
    notes: 'Pays bi-weekly on Wednesday'
  },
  'ClaimSolution': {
    baseFee: 195,
    perMileRate: 0.73,
    notes: 'Pays bi-weekly on Thursday'
  },
  'Complete Claims': {
    baseFee: 185,
    perMileRate: 0.71,
    notes: 'Pays bi-weekly on Wednesday'
  },
  'AMA': {
    baseFee: 175,
    perMileRate: 0.68,
    notes: 'Pays bi-weekly'
  },
  'A-TEAM': {
    baseFee: 180,
    perMileRate: 0.70,
    notes: 'Pays bi-weekly'
  },

  // Semi-monthly payers
  'ACD': {
    baseFee: 200,
    perMileRate: 0.75,
    notes: 'Pays semi-monthly on 15th and EOM'
  },

  // Monthly payers
  'HEA': {
    baseFee: 210,
    perMileRate: 0.78,
    notes: 'Pays monthly on 15th for previous month'
  },
  'IANET': {
    baseFee: 195,
    perMileRate: 0.73,
    notes: 'Pays monthly at end of month'
  },
  'Frontline': {
    baseFee: 185,
    perMileRate: 0.71,
    notes: 'Pays monthly'
  },

  // Irregular/one-off (low priority)
  'SCA': {
    baseFee: 170,
    perMileRate: 0.65,
    notes: 'Irregular payer - low volume'
  }
};

// Normalize firm name to match config keys
export function normalizeFirmNameForConfig(firmName: string): string {
  if (!firmName) return '';

  const normalized = firmName.toUpperCase().trim();

  // Map variations to standard names
  if (normalized.includes('G T APPRAISALS') || normalized === 'LEGACY') return 'Legacy';
  if (normalized.includes('SL APPRAISAL') || normalized === 'DOAN') return 'Doan';
  if (normalized.includes('AUTOCLAIMSDI') || normalized.includes('AUTOCLAIMS')) return 'ACD';
  if (normalized.includes('HEAVY EQUIPMENT') || normalized === 'HEA') return 'HEA';
  // ClaimSolution variants: CS, CCS, ClaimSolution
  if (normalized === 'CS' || normalized === 'CCS' || normalized.includes('CLAIMSOLUTION') || normalized.includes('CLAIM SOLUTION')) return 'ClaimSolution';
  if (normalized.includes('AMA')) return 'AMA';
  if (normalized.includes('A TEAM') || normalized.includes('A-TEAM') || normalized.includes('ATEAM')) return 'A-TEAM';
  if (normalized.includes('IANET')) return 'IANET';
  if (normalized.includes('SEDGWK') || normalized === 'SEDGWICK') return 'Sedgwick';
  if (normalized.includes('COMPLETE CLAIMS')) return 'Complete Claims';
  if (normalized.includes('SCA')) return 'SCA';
  if (normalized.includes('FRONTLINE')) return 'Frontline';

  return firmName;
}

// Calculate expected payout amount for a claim
// If pay_amount is provided, use that; otherwise use firm's base fee
export function calculateExpectedPayout(
  firmName: string,
  payAmount?: number
): number {
  // If pay_amount is already set, use it
  if (payAmount && payAmount > 0) {
    return payAmount;
  }

  // Otherwise, use firm's base fee as estimate
  const normalizedFirm = normalizeFirmNameForConfig(firmName);
  const feeStructure = FIRM_FEE_CONFIG[normalizedFirm];

  return feeStructure?.baseFee || 0;
}

// Get fee structure for a firm
export function getFirmFeeStructure(firmName: string): FirmFeeStructure | null {
  const normalizedFirm = normalizeFirmNameForConfig(firmName);
  return FIRM_FEE_CONFIG[normalizedFirm] || null;
}

// Check if a firm is a recurring client
export function isRecurringFirm(firmName: string): boolean {
  const normalizedFirm = normalizeFirmNameForConfig(firmName);
  return normalizedFirm in FIRM_FEE_CONFIG && normalizedFirm !== 'SCA';
}

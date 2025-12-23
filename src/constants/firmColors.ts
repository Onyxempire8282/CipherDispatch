export const FIRM_COLORS: Record<string, string> = {
  Sedgwick: "#9CA3AF",         // Gray
  ACD: "#F59E0B",              // Amber
  ClaimSolution: "#8B5CF6",    // Violet
  "Complete Claims": "#EF4444", // Red (was CCS)
  Doan: "#10B981",             // Emerald
  Legacy: "#3B82F6",           // Blue
  AMA: "#FACC15",              // Yellow
  IANET: "#92400E",            // Brown
  "A-TEAM": "#06B6D4",         // Cyan (was ATeam)
  HEA: "#6366F1",              // Indigo
  Frontline: "#1F2937",        // Dark Gray
  SCA: "#78350F",              // Dark Brown
};

export const getFirmColor = (firmName?: string): string => {
  if (!firmName) return "#9CA3AF"; // Default gray for unknown

  const normalized = firmName.toUpperCase().trim();

  // Check for exact or partial matches using same logic as fee config
  if (normalized.includes('SEDGWK') || normalized.includes('SEDGWICK')) return FIRM_COLORS.Sedgwick;
  if (normalized.includes('AUTOCLAIMSDI') || normalized.includes('AUTOCLAIMS') || normalized.includes('ACD')) return FIRM_COLORS.ACD;
  if (normalized.includes('CLAIMSOLUTION') || normalized.includes('CLAIM SOLUTION')) return FIRM_COLORS.ClaimSolution;
  if (normalized.includes('COMPLETE CLAIMS') || normalized === 'CCS') return FIRM_COLORS["Complete Claims"];
  if (normalized.includes('SL APPRAISAL') || normalized.includes('DOAN')) return FIRM_COLORS.Doan;
  if (normalized.includes('G T APPRAISALS') || normalized.includes('LEGACY')) return FIRM_COLORS.Legacy;
  if (normalized.includes('AMA')) return FIRM_COLORS.AMA;
  if (normalized.includes('IANET')) return FIRM_COLORS.IANET;
  if (normalized.includes('A TEAM') || normalized.includes('A-TEAM') || normalized.includes('ATEAM')) return FIRM_COLORS["A-TEAM"];
  if (normalized.includes('HEAVY EQUIPMENT') || normalized.includes('HEA')) return FIRM_COLORS.HEA;
  if (normalized.includes('FRONTLINE')) return FIRM_COLORS.Frontline;
  if (normalized.includes('SCA')) return FIRM_COLORS.SCA;

  return "#9CA3AF"; // Default gray for unknown firms
};

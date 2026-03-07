export const FIRM_COLORS: Record<string, string> = {
  Sedgwick: "#e8952a",
  ACD: "#f0a030",
  ClaimSolution: "#e05050",
  "Complete Claims": "#c0392b",
  Doan: "#4a9e6b",
  Legacy: "#3a8fd4",
  AMA: "#9b59b6",
  IANET: "#1abc9c",
  "A-TEAM": "#e67e22",
  HEA: "#95a5a6",
  Frontline: "#bdc3c7",
  SCA: "#f39c12",
};

export const getFirmColor = (firmName?: string): string => {
  if (!firmName) return "#4a5058"; // Default muted for unknown

  const normalized = firmName.toUpperCase().trim();

  if (normalized.includes('SEDGWK') || normalized.includes('SEDGWICK')) return FIRM_COLORS.Sedgwick;
  if (normalized.includes('AUTOCLAIMSDI') || normalized.includes('AUTOCLAIMS') || normalized.includes('ACD')) return FIRM_COLORS.ACD;
  if (normalized === 'CS' || normalized === 'CCS' || normalized.includes('CLAIMSOLUTION') || normalized.includes('CLAIM SOLUTION')) return FIRM_COLORS.ClaimSolution;
  if (normalized.includes('COMPLETE CLAIMS')) return FIRM_COLORS["Complete Claims"];
  if (normalized.includes('SL APPRAISAL') || normalized.includes('DOAN')) return FIRM_COLORS.Doan;
  if (normalized.includes('G T APPRAISALS') || normalized.includes('LEGACY')) return FIRM_COLORS.Legacy;
  if (normalized.includes('AMA')) return FIRM_COLORS.AMA;
  if (normalized.includes('IANET')) return FIRM_COLORS.IANET;
  if (normalized.includes('A TEAM') || normalized.includes('A-TEAM') || normalized.includes('ATEAM')) return FIRM_COLORS["A-TEAM"];
  if (normalized.includes('HEAVY EQUIPMENT') || normalized.includes('HEA')) return FIRM_COLORS.HEA;
  if (normalized.includes('FRONTLINE')) return FIRM_COLORS.Frontline;
  if (normalized.includes('SCA')) return FIRM_COLORS.SCA;

  return "#4a5058"; // Default muted for unknown firms
};

export const FIRM_COLORS: Record<string, string> = {
  Sedgwick: "#9CA3AF",       // Gray
  ACD: "#F59E0B",            // Amber
  ClaimSolution: "#8B5CF6",  // Violet
  CCS: "#EF4444",            // Red
  Doan: "#10B981",           // Emerald
  Legacy: "#3B82F6",         // Blue
  AMA: "#FACC15",            // Yellow
  IANET: "#92400E",          // Brown
  ATeam: "#06B6D4",          // Cyan
  HEA: "#6366F1",            // Indigo
  Frontline: "#1F2937",      // Dark Gray
};

export const getFirmColor = (firmName?: string): string => {
  if (!firmName) return "#9CA3AF"; // Default gray for unknown

  // Handle variations and partial matches
  const normalizedFirm = firmName.trim();
  for (const [key, color] of Object.entries(FIRM_COLORS)) {
    if (normalizedFirm.includes(key) || key.includes(normalizedFirm)) {
      return color;
    }
  }

  return "#9CA3AF"; // Default gray for unknown firms
};

const STATE_TIMEZONE: Record<string, string> = {
  // Eastern
  CT: "America/New_York",
  DE: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  NH: "America/New_York",
  NJ: "America/New_York",
  NY: "America/New_York",
  NC: "America/New_York",
  OH: "America/New_York",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  VT: "America/New_York",
  VA: "America/New_York",
  WV: "America/New_York",
  DC: "America/New_York",
  MI: "America/Detroit",
  IN: "America/Indiana/Indianapolis",
  // Central
  AL: "America/Chicago",
  AR: "America/Chicago",
  IL: "America/Chicago",
  IA: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/Chicago",
  LA: "America/Chicago",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  NE: "America/Chicago",
  OK: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  WI: "America/Chicago",
  // Mountain
  AZ: "America/Phoenix",
  CO: "America/Denver",
  MT: "America/Denver",
  NM: "America/Denver",
  UT: "America/Denver",
  WY: "America/Denver",
  // Pacific
  CA: "America/Los_Angeles",
  NV: "America/Los_Angeles",
  OR: "America/Los_Angeles",
  WA: "America/Los_Angeles",
  // Other
  AK: "America/Anchorage",
  HI: "Pacific/Honolulu",
  // Split states — default to majority
  ND: "America/Chicago",
  SD: "America/Chicago",
  ID: "America/Boise",
};

export function getTimezoneForState(state: string | null | undefined): string {
  if (!state) return "America/Chicago";
  return STATE_TIMEZONE[state.toUpperCase().trim()] ?? "America/Chicago";
}

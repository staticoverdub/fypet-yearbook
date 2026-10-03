// Public labels for the yearbook. Generic copy only (SPEC 7.1): no unit name, no office-specific terms.
export const MILESTONES = {
  onboard: "Reported for duty",
  cac: "ID badge issued",
  holiday_party: "Holiday party",
  resolutions: "New Year's resolutions",
  coffee: "Coffee mug acquired",
  midyear: "Mid-year review",
  blossoms: "Cherry blossoms",
  desk_plant: "Desk plant",
  promotion: "Promotion",
  glasses: "Reading glasses",
  plaque: "Service plaque",
  use_or_lose: "Use-or-lose season",
  farewell: "Farewell tour",
};

export const RATINGS = {
  outstanding: "Outstanding",
  exceeds: "Exceeds Fully Successful",
  fully: "Fully Successful",
  minimal: "Minimally Satisfactory",
};

// [key, label, format] in display order; keys missing from pet.json are simply not shown (12.3).
const mins = (v) => `${Math.floor(v / 60).toLocaleString()} h`;
export const STATS = [
  ["duty_days_seen", "Duty days"],
  ["offduty_days_seen", "Days off"],
  ["holidays_seen", "Federal holidays"],
  ["meetings", "Meetings"],
  ["meeting_minutes", "Time in meetings", mins],
  ["hobby_minutes_primary", "Main hobby", mins],
  ["hobby_minutes_secondary", "Second hobby", mins],
  ["spillovers", "Friday hobby spillovers"],
  ["paydays", "Paydays"],
  ["leave_days_taken", "Leave days taken"],
  ["supplies_hoarded", "Supplies acquired"],
  ["crs_survived", "Continuing resolutions"],
  ["furlough_days", "Furlough days"],
  ["ghost_visits", "Ghost visits"],
  ["vip_visits", "VIP visits"],
  ["data_calls", "Requests answered"],
  ["dashboards", "Reports built"],
  ["slides", "Slide decks"],
  ["excel_crashes", "Spreadsheet crashes"],
  ["safety_briefs", "Safety briefings"],
  ["cmd_briefs", "Leadership briefings"],
  ["midyear_rating", "Mid-year rating", (v) => RATINGS[v] || v],
  ["pats_total", "Pats received"],
  ["max_pats_day", "Most pats in a day"],
  ["days_dark", "Days unplugged"],
];

export const STAGE_LABEL = { egg: "Egg", hatchling: "Hatchling", juvenile: "Juvenile", adult: "Adult", elder: "Elder", deceased: "Deceased" };

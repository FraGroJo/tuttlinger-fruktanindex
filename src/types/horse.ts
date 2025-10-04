/**
 * Minimales Pferdeprofil für pferdeindividuelle Weidezeit-Berechnung
 */

export interface HorseMinimal {
  id: string;
  name: string;
  mass_kg: number; // 200-800
  easy_or_ems: boolean; // true = leichtfuttrig/EMS/PPID-Risiko
  muzzle: "none" | "on";
  hay_kg_as_fed_per_day: number; // 0-25
  hay_analysis_ref_id?: string; // optional, Referenz zu Heuanalyse
  hay_nsc_pct?: number; // 4-20%, falls keine Analyse
  conc_kg_as_fed_per_day?: number; // optional, default 0
  conc_nsc_pct?: number; // 5-45%, default 25
  is_active: boolean;
}

export interface PastureConfigMinimal {
  tz: string;
  intake_rate_no_muzzle: number; // kg DM/h
  intake_rate_muzzle: number; // kg DM/h
  map_score_to_nsc: ScoreToNSCMapping[];
  min_turnout_min: number;
  max_turnout_min: number;
  step_min: number;
  red_forbidden: boolean;
  yellow_cap_min: number;
}

export interface ScoreToNSCMapping {
  upTo: number;
  nsc?: number; // fixed value
  nsc_from?: number; // linear interpolation start
  nsc_to?: number; // linear interpolation end
}

export interface TurnoutRecommendation {
  horse_id: string;
  window: "morning" | "noon" | "evening";
  turnout_min: number;
  explain: {
    NSC_budget_g: number;
    base_nsc_g: number;
    nsc_allow_g: number;
    pasture_nsc_pct: number;
    intake_rate_kg_dm_per_h: number;
    nsc_per_hour_g: number;
  };
}

export const DEFAULT_PASTURE_CONFIG: PastureConfigMinimal = {
  tz: "Europe/Berlin",
  intake_rate_no_muzzle: 1.0,
  intake_rate_muzzle: 0.5,
  map_score_to_nsc: [
    { upTo: 20, nsc: 8 },
    { upTo: 40, nsc_from: 8, nsc_to: 12 },
    { upTo: 60, nsc_from: 12, nsc_to: 16 },
    { upTo: 80, nsc_from: 16, nsc_to: 20 },
    { upTo: 100, nsc: 22 },
  ],
  min_turnout_min: 0,
  max_turnout_min: 180,
  step_min: 5,
  red_forbidden: true,
  yellow_cap_min: 60,
};

export const DEFAULT_HORSE: Omit<HorseMinimal, "id"> = {
  name: "",
  mass_kg: 500,
  easy_or_ems: false,
  muzzle: "none",
  hay_kg_as_fed_per_day: 10,
  hay_nsc_pct: 10,
  conc_kg_as_fed_per_day: 0,
  conc_nsc_pct: 25,
  is_active: true,
};

/**
 * Berechnungslogik für pferdeindividuelle Weidezeit-Empfehlungen
 */

import type { HorseMinimal, PastureConfigMinimal, TurnoutRecommendation, ScoreToNSCMapping } from "@/types/horse";
import type { RiskLevel } from "@/types/fruktan";

const HEU_DM_PCT = 88; // Standard Trockensubstanz-Gehalt Heu

/**
 * Mappt Score zu Weide-NSC %
 */
function mapScoreToNSC(score: number, mapping: ScoreToNSCMapping[]): number {
  for (const range of mapping) {
    if (score <= range.upTo) {
      if (range.nsc !== undefined) {
        return range.nsc;
      }
      if (range.nsc_from !== undefined && range.nsc_to !== undefined) {
        // Lineare Interpolation
        const prevRange = mapping[mapping.indexOf(range) - 1];
        const prevUpTo = prevRange?.upTo || 0;
        const rangeSize = range.upTo - prevUpTo;
        const position = score - prevUpTo;
        const ratio = position / rangeSize;
        return range.nsc_from + (range.nsc_to - range.nsc_from) * ratio;
      }
    }
  }
  return 22; // Fallback: höchster NSC-Wert
}

/**
 * Rundet auf nächstes Vielfaches von step_min
 */
function roundToStep(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}

/**
 * Clamp-Funktion
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Berechnet pferdeindividuelle Weidezeit für ein Fenster
 */
export function calculateTurnoutForWindow(
  horse: HorseMinimal,
  windowScore: number,
  windowLevel: RiskLevel,
  config: PastureConfigMinimal
): TurnoutRecommendation {
  // 1) NSC-Tagesbudget (g/Tag)
  const NSC_budget_g = horse.easy_or_ems ? 8 * horse.mass_kg : 12 * horse.mass_kg;

  // 2) NSC-Grundlast aus Ration
  const hay_dm = horse.hay_kg_as_fed_per_day * (HEU_DM_PCT / 100);
  const heu_nsc_pct = horse.hay_nsc_pct || 10; // Fallback
  const hay_nsc_g = hay_dm * (heu_nsc_pct / 100) * 1000;

  const conc_kg = horse.conc_kg_as_fed_per_day || 0;
  const conc_nsc_pct = horse.conc_nsc_pct || 25;
  const conc_nsc_g = conc_kg * (conc_nsc_pct / 100) * 1000;

  const base_nsc_g = Math.max(0, hay_nsc_g + conc_nsc_g);

  // 3) Verfügbares Restbudget
  const nsc_allow_g = clamp(NSC_budget_g - base_nsc_g, 0, NSC_budget_g);

  // 4) Weide-NSC % und Aufnahmerate
  const pasture_nsc_pct = mapScoreToNSC(windowScore, config.map_score_to_nsc);
  const intake_rate_kg_dm_per_h = horse.muzzle === "on" 
    ? config.intake_rate_muzzle 
    : config.intake_rate_no_muzzle;
  const nsc_per_hour_g = intake_rate_kg_dm_per_h * (pasture_nsc_pct / 100) * 1000;

  // 5) Empfohlene Weidezeit
  let turnout_min = 0;

  if (config.red_forbidden && windowLevel === "high") {
    turnout_min = 0;
  } else {
    const hours = nsc_per_hour_g > 0 ? nsc_allow_g / nsc_per_hour_g : 0;
    turnout_min = clamp(
      roundToStep(hours * 60, config.step_min),
      config.min_turnout_min,
      config.max_turnout_min
    );

    if (windowLevel === "moderate") {
      turnout_min = Math.min(turnout_min, config.yellow_cap_min);
    }
  }

  return {
    horse_id: horse.id,
    window: "morning", // wird vom Aufrufer überschrieben
    turnout_min,
    score: windowScore,
    level: windowLevel,
    explain: {
      NSC_budget_g,
      base_nsc_g,
      nsc_allow_g,
      pasture_nsc_pct,
      intake_rate_kg_dm_per_h,
      nsc_per_hour_g,
    },
  };
}

/**
 * Berechnet alle Weidezeiten für ein Pferd über alle Fenster
 */
export function calculateAllTurnouts(
  horse: HorseMinimal,
  windowScores: {
    morning: { score: number; level: RiskLevel };
    noon: { score: number; level: RiskLevel };
    evening: { score: number; level: RiskLevel };
  },
  config: PastureConfigMinimal
): TurnoutRecommendation[] {
  const windows: Array<{ key: "morning" | "noon" | "evening"; data: { score: number; level: RiskLevel } }> = [
    { key: "morning", data: windowScores.morning },
    { key: "noon", data: windowScores.noon },
    { key: "evening", data: windowScores.evening },
  ];

  return windows.map(({ key, data }) => ({
    ...calculateTurnoutForWindow(horse, data.score, data.level, config),
    window: key,
  }));
}

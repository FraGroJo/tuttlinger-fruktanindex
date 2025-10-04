/**
 * Fruktan-Scoring-Logik
 * Implementiert die zentrale Berechnungslogik für das Fruktan-Risiko
 */

import { SCORING_CONSTANTS, RISK_THRESHOLDS, type RiskLevel, type TimeSlot } from "@/types/fruktan";

/**
 * Hilfsfunktion: Lineare Interpolation (Map)
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Hilfsfunktion: Clamp (Wert zwischen min und max begrenzen)
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Berechnet Bewölkungs-Entlastung (negativ = reduziert Risiko)
 */
export function calculateCloudRelief(cloudCoverPercent: number): number {
  if (cloudCoverPercent >= SCORING_CONSTANTS.CLOUD_HIGH) {
    return SCORING_CONSTANTS.CLOUD_HIGH_RELIEF;
  }
  if (cloudCoverPercent >= SCORING_CONSTANTS.CLOUD_MED) {
    return SCORING_CONSTANTS.CLOUD_MED_RELIEF;
  }
  return 0;
}

/**
 * Berechnet Trockenstress basierend auf ET0 und weiteren Faktoren
 */
export function calculateDrynessScore(
  et0_7d_avg: number,
  precip_7d_sum: number,
  wind_3d_avg: number
): number {
  let score = 0;

  // ET0-basierter Score (Hauptfaktor)
  if (et0_7d_avg >= SCORING_CONSTANTS.ET0_MIN) {
    const et0Score = mapRange(
      et0_7d_avg,
      SCORING_CONSTANTS.ET0_MIN,
      SCORING_CONSTANTS.ET0_MAX,
      0,
      SCORING_CONSTANTS.ET0_MAX_SCORE
    );
    score += clamp(et0Score, 0, SCORING_CONSTANTS.ET0_MAX_SCORE);
  }

  // Niederschlags-Bonus
  if (precip_7d_sum < SCORING_CONSTANTS.DRY_PRECIP_THRESHOLD) {
    score += SCORING_CONSTANTS.DRY_PRECIP_BONUS;
  }

  // Wind-Bonus
  if (wind_3d_avg > SCORING_CONSTANTS.WIND_THRESHOLD) {
    score += SCORING_CONSTANTS.WIND_BONUS;
  }

  return clamp(score, 0, SCORING_CONSTANTS.MAX_DRYNESS_SCORE);
}

/**
 * Berechnet Hitze-Entlastung (negativ bei hoher Temp + ausreichend Feuchtigkeit)
 */
export function calculateHeatRelief(
  tempMax: number,
  precip_7d_sum: number,
  et0_7d_avg: number
): number {
  if (
    tempMax >= SCORING_CONSTANTS.HEAT_TEMP_THRESHOLD &&
    (precip_7d_sum >= SCORING_CONSTANTS.HEAT_PRECIP_THRESHOLD ||
      et0_7d_avg <= SCORING_CONSTANTS.HEAT_ET0_THRESHOLD)
  ) {
    return SCORING_CONSTANTS.HEAT_RELIEF;
  }
  return 0;
}

/**
 * Berechnet diurnale Spanne Boost
 */
export function calculateDiurnalBoost(diurnalRange: number): number {
  if (diurnalRange <= SCORING_CONSTANTS.DIURNAL_MIN) return 0;
  
  const boost = mapRange(
    diurnalRange,
    SCORING_CONSTANTS.DIURNAL_MIN,
    SCORING_CONSTANTS.DIURNAL_MAX,
    0,
    SCORING_CONSTANTS.DIURNAL_MAX_BOOST
  );
  return clamp(boost, 0, SCORING_CONSTANTS.DIURNAL_MAX_BOOST);
}

/**
 * Interface für Scoring-Input
 */
export interface ScoringInput {
  tempMin: number;
  tempMax: number;
  radiationMorning: number;
  cloudCoverSlot: number;
  precip_7d_sum: number;
  wind_3d_avg: number;
  relativeHumidityMorning: number;
  et0_7d_avg: number;
  slot: TimeSlot;
}

/**
 * Haupt-Scoring-Funktion für ein Zeitfenster
 */
export function calculateScore(
  input: ScoringInput,
  pastureMultiplier: number = 1.0,
  pastureOffset: number = 0
): number {
  const slot = input.slot;
  let score = 20;

  const isMorning = slot === "morning";
  const isNoon = slot === "noon";

  // === Kälte-Frost-Bonus (Morning > Noon > Evening) ===
  if (input.tempMin <= 0) {
    const frostBonus = isMorning ? 15 : isNoon ? 7.5 : 4.5;
    score += frostBonus;
  } else if (input.tempMin <= 5) {
    const coldBonus = isMorning ? 10 : isNoon ? 5 : 3;
    score += coldBonus;
  }

  // === Trockenheits-Stress (7d ET0 & Precip) ===
  const dryScore = calculateDrynessScore(input.et0_7d_avg, input.precip_7d_sum, input.wind_3d_avg);
  const dryWeight = isMorning ? 1.0 : isNoon ? 0.5 : 0.3;
  score += dryScore * dryWeight;

  // === Diurnal Range Boost ===
  const diurnalRange = input.tempMax - input.tempMin;
  const diurnalBoost = calculateDiurnalBoost(diurnalRange);
  const diurnalWeight = isMorning ? 1.0 : isNoon ? 0.5 : 0.3;
  score += diurnalBoost * diurnalWeight;

  // === Wolken-Relief ===
  const cloudRelief = calculateCloudRelief(input.cloudCoverSlot);
  score += cloudRelief;

  // === Hitze-Relief ===
  const heatRelief = calculateHeatRelief(input.tempMax, input.precip_7d_sum, input.et0_7d_avg);
  score += heatRelief;

  // === Morning-Specific: Sonnen-Faktor ===
  if (isMorning) {
    const rad = input.radiationMorning;
    if (rad > 100) {
      const radBonus = mapRange(rad, 100, 800, 0, 20);
      score += clamp(radBonus, 0, 20);
    }

    // Luftfeuchte-Bonus für trockene Morgen
    const rh = input.relativeHumidityMorning;
    if (rh < 60) {
      score += 8;
    }
  }

  // === Weidestand-Anpassungen anwenden ===
  score = score * pastureMultiplier + pastureOffset;

  const final = Math.round(score);
  return clamp(final, 0, 100);
}

/**
 * Bestimmt Ampel-Level basierend auf Score und EMS-Modus
 */
export function getRiskLevel(score: number, emsMode: boolean): RiskLevel {
  const thresholds = emsMode ? RISK_THRESHOLDS.EMS : RISK_THRESHOLDS.STANDARD;

  if (score <= thresholds.SAFE_MAX) return "safe";
  if (score <= thresholds.MODERATE_MAX) return "moderate";
  return "high";
}

/**
 * Generiert Begründungstext basierend auf den Scoring-Faktoren
 */
export function generateReason(input: ScoringInput, score: number): string {
  const { tempMin, radiationMorning, cloudCoverSlot, et0_7d_avg, precip_7d_sum, slot } = input;

  // Frost + Sonne am Morgen
  if (slot === "morning" && tempMin <= 0 && radiationMorning > 400) {
    return `Frostnacht (${tempMin.toFixed(1)} °C) und sonniger Morgen → erhöhtes Risiko am Vormittag.`;
  }

  // Kalte Nacht + Sonne am Morgen
  if (slot === "morning" && tempMin <= 5 && tempMin > 0 && radiationMorning > 400) {
    return `Kalte Nacht (${tempMin.toFixed(1)} °C) und hohe Einstrahlung → erhöhtes Risiko am Vormittag.`;
  }

  // Hoher ET0-Stress
  if (et0_7d_avg >= 5.5 && cloudCoverSlot < 60) {
    return `Hohe ET0-Belastung über 7 Tage (${et0_7d_avg.toFixed(1)} mm/Tag) und geringe Bewölkung → anhaltend erhöhtes Risiko.`;
  }

  // Trockenheit
  if (precip_7d_sum < 5 && et0_7d_avg > 4) {
    return `Anhaltende Trockenheit (${precip_7d_sum.toFixed(1)} mm/7d) und hohe Verdunstung → erhöhtes Risiko.`;
  }

  // Starke Bewölkung reduziert Risiko
  if (cloudCoverSlot >= 80) {
    return `Stark bewölkt (${cloudCoverSlot.toFixed(0)} %) → Risiko reduziert.`;
  }

  // Standard-Bewertung
  if (score < 40) {
    return "Günstige Bedingungen, geringes Fruktan-Risiko.";
  } else if (score < 70) {
    return "Erhöhte Risiko-Faktoren, Vorsicht empfohlen.";
  } else {
    return "Mehrere ungünstige Faktoren kombiniert → hohes Risiko.";
  }
}

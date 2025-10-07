/**
 * Fruktan-Scoring-Logik
 * Implementiert die zentrale Berechnungslogik für das Fruktan-Risiko
 * mit automatischer Anpassung an die Jahreszeit
 */

import { SCORING_CONSTANTS, RISK_THRESHOLDS, type RiskLevel, type TimeSlot } from "@/types/fruktan";

/**
 * Bestimmt die Jahreszeit basierend auf dem Monat
 */
function getSeason(month: number): 'winter' | 'spring' | 'summer' | 'autumn' {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/**
 * Gibt jahreszeitabhängige ET0-Schwellenwerte zurück
 */
function getSeasonalET0Thresholds(date: Date = new Date()) {
  const month = date.getMonth(); // 0-11
  const season = getSeason(month);
  
  switch (season) {
    case 'summer':
      return {
        ET0_MIN: 3.0,
        ET0_MAX: 6.0,
        DRY_PRECIP_THRESHOLD: 5,
        HEAT_ET0_THRESHOLD: 3.5,
      };
    case 'spring':
    case 'autumn':
      return {
        ET0_MIN: 1.2,
        ET0_MAX: 3.5,
        DRY_PRECIP_THRESHOLD: 10,
        HEAT_ET0_THRESHOLD: 2.0,
      };
    case 'winter':
      return {
        ET0_MIN: 0.5,
        ET0_MAX: 2.0,
        DRY_PRECIP_THRESHOLD: 15,
        HEAT_ET0_THRESHOLD: 1.5,
      };
  }
}

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
 * Verwendet jahreszeitabhängige Schwellenwerte
 */
export function calculateDrynessScore(
  et0_7d_avg: number,
  precip_7d_sum: number,
  wind_3d_avg: number,
  date: Date = new Date()
): number {
  let score = 0;
  const thresholds = getSeasonalET0Thresholds(date);

  // ET0-basierter Score (Hauptfaktor) - mit dynamischen Schwellenwerten
  if (et0_7d_avg >= thresholds.ET0_MIN) {
    const et0Score = mapRange(
      et0_7d_avg,
      thresholds.ET0_MIN,
      thresholds.ET0_MAX,
      0,
      SCORING_CONSTANTS.ET0_MAX_SCORE
    );
    score += clamp(et0Score, 0, SCORING_CONSTANTS.ET0_MAX_SCORE);
  }

  // Niederschlags-Bonus - mit jahreszeitabhängigem Schwellenwert
  if (precip_7d_sum < thresholds.DRY_PRECIP_THRESHOLD) {
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
 * Verwendet jahreszeitabhängige Schwellenwerte
 */
export function calculateHeatRelief(
  tempMax: number,
  precip_7d_sum: number,
  et0_7d_avg: number,
  date: Date = new Date()
): number {
  const thresholds = getSeasonalET0Thresholds(date);
  
  if (
    tempMax >= SCORING_CONSTANTS.HEAT_TEMP_THRESHOLD &&
    (precip_7d_sum >= SCORING_CONSTANTS.HEAT_PRECIP_THRESHOLD ||
      et0_7d_avg <= thresholds.HEAT_ET0_THRESHOLD)
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
  date?: Date; // Optional: für jahreszeitabhängige Berechnungen
}

/**
 * Haupt-Scoring-Funktion für ein Zeitfenster
 * Berücksichtigt automatisch die Jahreszeit
 */
export function calculateScore(
  input: ScoringInput,
  pastureMultiplier: number = 1.0,
  pastureOffset: number = 0
): number {
  const slot = input.slot;
  const calcDate = input.date || new Date();
  let score = 20;
  const debugInfo: string[] = [`Base: ${score}`];

  const isMorning = slot === "morning";
  const isNoon = slot === "noon";

  // === Kälte-Frost-Bonus (Morning > Noon > Evening) ===
  if (input.tempMin <= 0) {
    const frostBonus = isMorning ? 30 : isNoon ? 20 : 15; // Erhöht!
    score += frostBonus;
    debugInfo.push(`Frost (${input.tempMin.toFixed(1)}°C): +${frostBonus}`);
  } else if (input.tempMin <= 5) {
    const coldBonus = isMorning ? 15 : isNoon ? 10 : 7; // Erhöht!
    score += coldBonus;
    debugInfo.push(`Cold (${input.tempMin.toFixed(1)}°C): +${coldBonus}`);
  }

  // === Trockenheits-Stress (7d ET0 & Precip) - mit Jahreszeitanpassung ===
  const dryScore = calculateDrynessScore(input.et0_7d_avg, input.precip_7d_sum, input.wind_3d_avg, calcDate);
  const dryWeight = isMorning ? 1.2 : isNoon ? 0.8 : 0.4; // Erhöht!
  const weightedDryScore = dryScore * dryWeight;
  score += weightedDryScore;
  if (weightedDryScore > 0) {
    debugInfo.push(`Dryness: +${weightedDryScore.toFixed(1)}`);
  }

  // === Diurnal Range Boost ===
  const diurnalRange = input.tempMax - input.tempMin;
  const diurnalBoost = calculateDiurnalBoost(diurnalRange);
  const diurnalWeight = isMorning ? 1.2 : isNoon ? 0.8 : 0.5; // Erhöht!
  const weightedDiurnalBoost = diurnalBoost * diurnalWeight;
  score += weightedDiurnalBoost;
  if (weightedDiurnalBoost > 0) {
    debugInfo.push(`Diurnal (${diurnalRange.toFixed(1)}°C): +${weightedDiurnalBoost.toFixed(1)}`);
  }

  // === Wolken-Relief ===
  const cloudRelief = calculateCloudRelief(input.cloudCoverSlot);
  score += cloudRelief;
  if (cloudRelief < 0) {
    debugInfo.push(`Cloud (${input.cloudCoverSlot.toFixed(0)}%): ${cloudRelief.toFixed(1)}`);
  }

  // === Hitze-Relief - mit Jahreszeitanpassung ===
  const heatRelief = calculateHeatRelief(input.tempMax, input.precip_7d_sum, input.et0_7d_avg, calcDate);
  score += heatRelief;
  if (heatRelief < 0) {
    debugInfo.push(`Heat relief: ${heatRelief.toFixed(1)}`);
  }

  // === Morning-Specific: Sonnen-Faktor ===
  if (isMorning) {
    const rad = input.radiationMorning;
    if (rad > 100) {
      const radBonus = mapRange(rad, 100, 800, 0, 25); // Erhöht von 20 auf 25!
      const clampedRadBonus = clamp(radBonus, 0, 25);
      score += clampedRadBonus;
      debugInfo.push(`Morning sun (${rad.toFixed(0)} W/m²): +${clampedRadBonus.toFixed(1)}`);
    }

    // Luftfeuchte-Bonus für trockene Morgen
    const rh = input.relativeHumidityMorning;
    if (rh < 60) {
      const humidityBonus = 10; // Erhöht von 8 auf 10!
      score += humidityBonus;
      debugInfo.push(`Low humidity (${rh.toFixed(0)}%): +${humidityBonus}`);
    }
  }

  // === Weidestand-Anpassungen anwenden ===
  const preAdjustScore = score;
  score = score * pastureMultiplier + pastureOffset;
  if (pastureMultiplier !== 1.0 || pastureOffset !== 0) {
    debugInfo.push(`Pasture adj (${preAdjustScore.toFixed(1)} × ${pastureMultiplier.toFixed(2)} + ${pastureOffset})`);
  }

  const final = Math.round(score);
  const clampedFinal = clamp(final, 0, 100);
  
  // Log to console for debugging
  console.log(`[SCORE ${slot}] ${clampedFinal} - ${debugInfo.join(' | ')}`);
  
  return clampedFinal;
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

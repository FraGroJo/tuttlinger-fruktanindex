/**
 * Dynamische Confidence-Score-Berechnung
 * Basiert auf Datenvollständigkeit, Modellkonsistenz, Aktualität, Fallback-Nutzung und Forecast-Horizont
 */

export interface ConfidenceInput {
  model: "ICON-D2" | "ECMWF";
  fallbackUsed: boolean;
  ageMinutes: number;                 // Zeit seit current_weather.time
  expectedHours: number;              // 240
  availableHours: number;             // length(hourly.time)
  deltaT?: number;                    // ICON vs ECMWF (°C)
  deltaRH?: number;                   // ICON vs ECMWF (%)
  deltaRad?: number;                  // ICON vs ECMWF (W/m²)
  dayOffset: number;                  // 0=heute … 6
  hadValidationWarn: boolean;         // letzte Validierung
}

export interface ConfidenceBreakdown {
  score: number;
  factors: {
    completeness: { penalty: number; reason: string };
    freshness: { penalty: number; reason: string };
    fallback: { penalty: number; reason: string };
    consistency: { penalty: number; reason: string };
    horizon: { penalty: number; reason: string };
    validation: { penalty: number; reason: string };
  };
}

/**
 * Berechnet dynamischen Confidence-Score (0-100)
 */
export function computeConfidence(input: ConfidenceInput): ConfidenceBreakdown {
  const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
  let score = 100;
  
  const factors: ConfidenceBreakdown['factors'] = {
    completeness: { penalty: 0, reason: '' },
    freshness: { penalty: 0, reason: '' },
    fallback: { penalty: 0, reason: '' },
    consistency: { penalty: 0, reason: '' },
    horizon: { penalty: 0, reason: '' },
    validation: { penalty: 0, reason: '' },
  };

  // 1) Datenvollständigkeit
  const missingRatio = Math.max(0, (input.expectedHours - input.availableHours) / input.expectedHours);
  const completenessPenalty = clamp(missingRatio * 40, 0, 40);
  if (completenessPenalty > 0) {
    factors.completeness.penalty = completenessPenalty;
    factors.completeness.reason = `Datenlücken: ${Math.round(missingRatio * 100)}%`;
    score -= completenessPenalty;
  } else {
    factors.completeness.reason = '100% vollständig';
  }

  // 2) Aktualität
  let freshnessPenalty = 0;
  if (input.ageMinutes > 30) {
    freshnessPenalty = clamp(((input.ageMinutes - 30) / 30) * 5, 0, 10);
    factors.freshness.penalty = freshnessPenalty;
    factors.freshness.reason = `Alter: ${input.ageMinutes} min`;
    score -= freshnessPenalty;
  } else {
    factors.freshness.reason = `Aktuell (${input.ageMinutes} min)`;
  }

  // 3) Fallback-Benutzung
  if (input.fallbackUsed) {
    factors.fallback.penalty = 10;
    factors.fallback.reason = `${input.model} Fallback aktiv`;
    score -= 10;
  } else {
    factors.fallback.reason = `${input.model} primär`;
  }

  // 4) Modellkonsistenz
  const dT = Math.abs(input.deltaT ?? 0);
  const dRH = Math.abs(input.deltaRH ?? 0);
  const dRad = Math.abs(input.deltaRad ?? 0);
  
  let consistencyPenalty = 0;
  const consistencyReasons: string[] = [];
  
  // Temperatur wichtiger als RH, RH wichtiger als Rad
  if (dT > 0.5) {
    const tempPenalty = clamp(((dT - 0.5) / 1.0) * 12, 0, 18);
    consistencyPenalty += tempPenalty;
    consistencyReasons.push(`ΔT ${dT.toFixed(1)}°C`);
  }
  
  if (dRH > 5) {
    const rhPenalty = clamp(((dRH - 5) / 10) * 8, 0, 12);
    consistencyPenalty += rhPenalty;
    consistencyReasons.push(`ΔRH ${dRH.toFixed(0)}%`);
  }
  
  if (dRad > 150) {
    const radPenalty = clamp(((dRad - 150) / 300) * 5, 0, 8);
    consistencyPenalty += radPenalty;
    consistencyReasons.push(`ΔRad ${dRad.toFixed(0)} W/m²`);
  }
  
  if (consistencyPenalty > 0) {
    factors.consistency.penalty = consistencyPenalty;
    factors.consistency.reason = consistencyReasons.join(', ');
    score -= consistencyPenalty;
  } else if (input.deltaT !== undefined) {
    factors.consistency.reason = `Modelle konsistent (ΔT ${dT.toFixed(1)}°C)`;
  } else {
    factors.consistency.reason = 'Kein Vergleich verfügbar';
  }

  // 5) Forecast-Horizont (Unsicherheit steigt mit der Ferne)
  const horizonPenalty = clamp(input.dayOffset * 3, 0, 18);
  factors.horizon.penalty = horizonPenalty;
  factors.horizon.reason = input.dayOffset === 0 
    ? 'Heute' 
    : `Tag +${input.dayOffset}`;
  score -= horizonPenalty;

  // 6) Validierungswarnungen
  if (input.hadValidationWarn) {
    factors.validation.penalty = 5;
    factors.validation.reason = 'Validierungswarnungen';
    score -= 5;
  } else {
    factors.validation.reason = 'Validierung OK';
  }

  return {
    score: Math.round(clamp(score, 0, 100)),
    factors,
  };
}

/**
 * Formatiert Confidence-Score als Text mit Badge
 */
export function formatConfidenceText(score: number): string {
  if (score >= 75) return `${score}/100 (hoch)`;
  if (score >= 50) return `${score}/100 (mittel)`;
  return `${score}/100 (niedrig)`;
}

/**
 * Gibt Confidence-Farbe zurück
 */
export function getConfidenceColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

/**
 * Erstellt Tooltip-Text mit Breakdown
 */
export function formatConfidenceTooltip(breakdown: ConfidenceBreakdown): string {
  const lines: string[] = [];
  
  Object.entries(breakdown.factors).forEach(([key, factor]) => {
    if (factor.reason) {
      const symbol = factor.penalty === 0 ? '✓' : '−' + factor.penalty;
      lines.push(`${symbol} ${factor.reason}`);
    }
  });
  
  lines.push(`\nErgebnis: ${breakdown.score}/100`);
  
  return lines.join('\n');
}

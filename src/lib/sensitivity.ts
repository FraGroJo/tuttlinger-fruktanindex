/**
 * Sensitivitäts-Analyse
 * V25: Perturbation-Analyse - Was treibt den Score?
 */

import { calculateScore, type ScoringInput } from "./scoring";
import type { TimeSlot } from "@/types/fruktan";

export interface SensitivityResult {
  parameter: string;
  baseValue: number;
  baseScore: number;
  deltaPlus10: number;
  deltaMinus10: number;
  sensitivity: number; // |Δscore| / |Δinput|
  rank: number;
}

/**
 * Perturbiert Input-Parameter und misst Score-Änderung
 */
export function analyzeSensitivity(
  baseInput: ScoringInput,
  pastureMultiplier: number = 1.0,
  pastureOffset: number = 0
): SensitivityResult[] {
  const baseScore = calculateScore(baseInput, pastureMultiplier, pastureOffset);

  const results: SensitivityResult[] = [];

  // Parameter zum Testen
  const params: Array<{ key: keyof ScoringInput; label: string }> = [
    { key: "tempMin", label: "Temperatur Min" },
    { key: "tempMax", label: "Temperatur Max" },
    { key: "radiationMorning", label: "Strahlung" },
    { key: "cloudCoverSlot", label: "Bewölkung" },
    { key: "precip_7d_sum", label: "Niederschlag 7d" },
    { key: "wind_3d_avg", label: "Wind 3d" },
    { key: "relativeHumidityMorning", label: "Luftfeuchte" },
    { key: "et0_7d_avg", label: "ET0 7d" },
  ];

  params.forEach(({ key, label }) => {
    const baseValue = baseInput[key] as number;

    // +10% Perturbation
    const inputPlus = { ...baseInput, [key]: baseValue * 1.1 };
    const scorePlus = calculateScore(inputPlus, pastureMultiplier, pastureOffset);
    const deltaPlus10 = scorePlus - baseScore;

    // -10% Perturbation
    const inputMinus = { ...baseInput, [key]: baseValue * 0.9 };
    const scoreMinus = calculateScore(inputMinus, pastureMultiplier, pastureOffset);
    const deltaMinus10 = scoreMinus - baseScore;

    // Sensitivität = durchschnittliche |Δscore|
    const sensitivity = (Math.abs(deltaPlus10) + Math.abs(deltaMinus10)) / 2;

    results.push({
      parameter: label,
      baseValue,
      baseScore,
      deltaPlus10,
      deltaMinus10,
      sensitivity,
      rank: 0, // Wird später gesetzt
    });
  });

  // Sortiere nach Sensitivität (absteigend)
  results.sort((a, b) => b.sensitivity - a.sensitivity);

  // Setze Ranks
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return results;
}

/**
 * Formatiert Sensitivitäts-Analyse für UI
 */
export function formatSensitivityReport(results: SensitivityResult[]): string {
  let report = "# Sensitivitäts-Analyse\n\n";
  report += "Perturbation: ±10% je Parameter (ceteris paribus)\n\n";
  report += "| Rang | Parameter | Basis-Wert | Δ Score (+10%) | Δ Score (-10%) | Sensitivität |\n";
  report += "|------|-----------|------------|----------------|----------------|-------------|\n";

  results.forEach((r) => {
    report += `| ${r.rank} | ${r.parameter} | ${r.baseValue.toFixed(1)} | ${r.deltaPlus10 >= 0 ? "+" : ""}${r.deltaPlus10.toFixed(1)} | ${r.deltaMinus10 >= 0 ? "+" : ""}${r.deltaMinus10.toFixed(1)} | ${r.sensitivity.toFixed(2)} |\n`;
  });

  report += "\n**Interpretation:** Je höher die Sensitivität, desto stärker beeinflusst der Parameter den Score.\n";

  return report;
}

/**
 * Export-Funktionen für Pferde-Weidezeiten
 */

import type { TurnoutRecommendation, HorseMinimal } from "@/types/horse";

const WINDOW_LABELS = {
  morning: "Morgen (5-11h)",
  noon: "Mittag (11-16h)",
  evening: "Abend (16-21h)",
};

/**
 * Exportiert Weidezeit-Empfehlungen als CSV
 */
export function exportTurnoutsToCSV(
  recommendations: TurnoutRecommendation[],
  horses: HorseMinimal[],
  date: string
): void {
  const getHorseName = (horseId: string) => {
    return horses.find((h) => h.id === horseId)?.name || "Unbekannt";
  };

  // CSV Header
  const headers = ["Pferd", "Zeitfenster", "Minuten", "NSC Budget (g)", "Grundlast (g)", "Verfügbar (g)", "Weide NSC (%)", "Aufnahme (kg/h)", "NSC/h (g)"];
  
  // CSV Rows
  const rows = recommendations.map((rec) => [
    getHorseName(rec.horse_id),
    WINDOW_LABELS[rec.window],
    rec.turnout_min.toString(),
    rec.explain.NSC_budget_g.toFixed(0),
    rec.explain.base_nsc_g.toFixed(0),
    rec.explain.nsc_allow_g.toFixed(0),
    rec.explain.pasture_nsc_pct.toFixed(1),
    rec.explain.intake_rate_kg_dm_per_h.toFixed(1),
    rec.explain.nsc_per_hour_g.toFixed(0),
  ]);

  // Kombiniere zu CSV
  const csv = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  // Download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `weidezeiten_${date}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

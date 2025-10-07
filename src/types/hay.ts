/**
 * Heuanalyse-Typen
 * Basierend auf LUFA-Analyseberichten
 */

export interface HayAnalysis {
  sampleDate: string; // ISO-Datum der Probenahme
  sampleName: string; // z.B. "1. Schnitt 2025"
  reportNumber: string; // z.B. "25FG008305"
  
  // Hauptwerte (in % der Trockensubstanz)
  fruktan: number; // % - KRITISCH für EMS-Pferde
  gesamtzucker: number; // % - KRITISCH
  nfc: number; // Nicht-Faser-Kohlenhydrate %
  
  // Strukturwerte
  rohfaser: number; // %
  adfom: number; // %
  andfom: number; // %
  
  // Nährstoffe
  rohprotein: number; // %
  rohfett: number; // %
  rohasche: number; // %
  
  // Energie
  mePferd: number; // MJ/kg
  
  // Mineralien
  calcium: number; // %
  selen: number; // mg/kg
  
  // Validierung
  uploadDate: string; // Wann wurde die Analyse hochgeladen
  validUntil: string; // Gültig bis (max. 6 Monate nach Probenahme)
}

/**
 * Berechnet Risiko-Multiplikator basierend auf Heuanalyse
 */
export function calculateHayRiskMultiplier(hay: HayAnalysis): {
  multiplier: number;
  offset: number;
  reasons: string[];
} {
  let multiplier = 1.0;
  let offset = 0;
  const reasons: string[] = [];

  // Fruktan-Gehalt (SEHR KRITISCH)
  if (hay.fruktan > 5.0) {
    const fruktan_excess = hay.fruktan - 5.0;
    const fruktan_multiplier = 1.0 + (fruktan_excess * 0.4); // Pro 1% über Zielwert +40% Risiko
    multiplier *= fruktan_multiplier;
    offset += fruktan_excess * 5; // +5 Punkte pro 1% über Zielwert
    reasons.push(`⚠️ Heu-Fruktan erhöht (${hay.fruktan.toFixed(1)}%, Ziel: <5%)`);
  }

  // Gesamtzucker (KRITISCH)
  if (hay.gesamtzucker > 10.0) {
    const zucker_excess = hay.gesamtzucker - 10.0;
    const zucker_multiplier = 1.0 + (zucker_excess * 0.25); // Pro 1% über Zielwert +25% Risiko
    multiplier *= zucker_multiplier;
    offset += zucker_excess * 3; // +3 Punkte pro 1% über Zielwert
    reasons.push(`⚠️ Heu-Zucker erhöht (${hay.gesamtzucker.toFixed(1)}%, Ziel: <10%)`);
  }

  // NFC (Nicht-Faser-Kohlenhydrate)
  if (hay.nfc > 25.0) {
    offset += (hay.nfc - 25.0) * 2; // +2 Punkte pro 1% über 25%
    reasons.push(`ℹ️ Heu-NFC erhöht (${hay.nfc.toFixed(1)}%)`);
  }

  // Positive Faktoren: Hohe Rohfaser = gut
  if (hay.rohfaser > 28.0) {
    multiplier *= 0.95; // -5% Risiko bei hoher Rohfaser
    reasons.push(`✓ Heu mit hoher Rohfaser (${hay.rohfaser.toFixed(1)}%)`);
  }

  return {
    multiplier: Math.min(multiplier, 2.5), // Max 2.5x Multiplikator
    offset: Math.min(offset, 25), // Max +25 Punkte Offset
    reasons
  };
}

/**
 * Prüft ob Heuanalyse noch gültig ist (max. 6 Monate)
 */
export function isHayAnalysisValid(hay: HayAnalysis): boolean {
  const sampleDate = new Date(hay.sampleDate);
  const validUntil = new Date(hay.validUntil);
  const now = new Date();
  
  return now <= validUntil && validUntil <= new Date(sampleDate.getTime() + 180 * 24 * 60 * 60 * 1000);
}

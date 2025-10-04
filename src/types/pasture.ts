/**
 * Weidestand-Parameter für präzisere Fruktan-Berechnung
 */

export interface PastureData {
  // Metadata
  savedAt?: string; // ISO timestamp when data was saved
  
  // Wachstumsbedingungen (sich verändernde Parameter)
  grassHeight: "<5" | "5-10" | "10-15" | "15-20" | ">20"; // cm
  growthPhase: "ruhend" | "langsam" | "aktiv" | "sehr-schnell";
  cloverPercentage: "0-10" | "10-30" | ">30";
  
  // Kräuter & Unkräuter
  buttercupPresence: "keiner" | "gering" | "mittel" | "hoch";
  herbDiversity: "keine" | "gering" | "mittel" | "hoch";
  
  // Notizen
  notes: string;

  // Beibehaltene Parameter für Berechnung (nicht mehr in Form sichtbar)
  grassType: "weidelgras" | "wiesenrispe" | "wiesenschwingel" | "rotschwingel" | "mix";
  pastureAge: "<1" | "1-3" | "3-10" | ">10";
  floweringVisible: "ja" | "nein" | "teilweise";
  daysSinceLastUse: "0-3" | "4-7" | "8-14" | "15-21" | "22-28" | ">28";
  stubbleHeight: "<3" | "3-5" | "5-8" | ">8";
  grazingIntensity: "stark" | "mittel" | "leicht" | "ungenutzt";
  grazingType: "rotation" | "stand" | "portion";
  lastNFertilization: "<2w" | "2-4w" | "4-8w" | ">8w" | "keine";
  nAmount: "0" | "1-40" | "40-80" | "80-120" | ">120";
  organicFertilization: boolean;
  soilType: "sandig" | "lehmig" | "tonig" | "torf" | "mix";
  soilMoisture: "trocken" | "normal" | "feucht" | "nass";
  drainage: "gut" | "mittel" | "schlecht" | "staunaesse";
  visibleStress: "verfaerbung" | "welke" | "flecken" | "keine";
  laminitisSensitive: boolean;
}

export const DEFAULT_PASTURE_DATA: PastureData = {
  savedAt: undefined,
  grassHeight: "10-15",
  growthPhase: "aktiv",
  cloverPercentage: "0-10",
  buttercupPresence: "keiner",
  herbDiversity: "gering",
  notes: "",
  // Defaults für Berechnungsparameter
  grassType: "mix",
  pastureAge: "1-3",
  floweringVisible: "nein",
  daysSinceLastUse: "8-14",
  stubbleHeight: "3-5",
  grazingIntensity: "mittel",
  grazingType: "rotation",
  lastNFertilization: "4-8w",
  nAmount: "40-80",
  organicFertilization: false,
  soilType: "lehmig",
  soilMoisture: "normal",
  drainage: "gut",
  visibleStress: "keine",
  laminitisSensitive: false,
};

/**
 * Prüft, ob die Weidestand-Daten noch gültig sind (max. 7 Tage alt)
 */
export function isPastureDataValid(data: PastureData): boolean {
  if (!data.savedAt) return false;
  
  const savedDate = new Date(data.savedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysDiff <= 7;
}

/**
 * Gibt die verbleibenden Tage zurück, bis die Daten ablaufen
 */
export function getDaysUntilExpiry(data: PastureData): number {
  if (!data.savedAt) return 0;
  
  const savedDate = new Date(data.savedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
  
  return Math.max(0, Math.ceil(7 - daysDiff));
}

/**
 * Berechnet Anpassungsfaktoren basierend auf Weidestand-Daten
 */
export function calculatePastureAdjustments(data: PastureData): {
  multiplier: number;
  offset: number;
  reason: string[];
} {
  let multiplier = 1.0;
  let offset = 0;
  const reasons: string[] = [];

  // Grasarten-Einfluss (±15%)
  const grassFactors = {
    weidelgras: 1.15, // höchste Fruktanakkumulation
    wiesenrispe: 1.05,
    mix: 1.0,
    wiesenschwingel: 0.95,
    rotschwingel: 0.9,
  };
  multiplier *= grassFactors[data.grassType];
  if (data.grassType === "weidelgras") {
    reasons.push("Deutsches Weidelgras (+15% Risiko)");
  } else if (data.grassType === "rotschwingel") {
    reasons.push("Rotschwingel (-10% Risiko)");
  }

  // Kleeanteil senkt Fruktanrisiko
  if (data.cloverPercentage === ">30") {
    multiplier *= 0.85;
    reasons.push("Hoher Kleeanteil (-15% Risiko)");
  } else if (data.cloverPercentage === "10-30") {
    multiplier *= 0.92;
    reasons.push("Moderater Kleeanteil (-8% Risiko)");
  }

  // Grashöhe - kurzes Gras = höheres Risiko
  if (data.grassHeight === "<5") {
    offset += 12;
    reasons.push("Sehr kurzes Gras (+12 Punkte)");
  } else if (data.grassHeight === "5-10") {
    offset += 6;
    reasons.push("Kurzes Gras (+6 Punkte)");
  } else if (data.grassHeight === ">20") {
    offset -= 5;
    reasons.push("Hohes Gras (-5 Punkte)");
  }

  // Wachstumsphase
  if (data.growthPhase === "sehr-schnell") {
    multiplier *= 0.75;
    reasons.push("Sehr schnelles Wachstum (-25% Risiko)");
  } else if (data.growthPhase === "aktiv") {
    multiplier *= 0.85;
    reasons.push("Aktives Wachstum (-15% Risiko)");
  } else if (data.growthPhase === "ruhend") {
    multiplier *= 1.2;
    reasons.push("Ruhendes Wachstum (+20% Risiko)");
  }

  // Tage seit letzter Nutzung - kritischster Faktor
  const daysFactors = {
    "0-3": -8,
    "4-7": -4,
    "8-14": 0,
    "15-21": 8,
    "22-28": 15,
    ">28": 20,
  };
  offset += daysFactors[data.daysSinceLastUse];
  if (data.daysSinceLastUse === ">28") {
    reasons.push("Lange ungenutzt (+20 Punkte)");
  } else if (data.daysSinceLastUse === "0-3") {
    reasons.push("Frisch beweidet (-8 Punkte)");
  }

  // Stickstoffdüngung
  if (data.lastNFertilization === "<2w" && data.nAmount !== "0") {
    multiplier *= 0.8;
    reasons.push("Frische N-Düngung (-20% Risiko)");
  } else if (data.lastNFertilization === ">8w" || data.lastNFertilization === "keine") {
    multiplier *= 1.1;
    reasons.push("Lange keine N-Düngung (+10% Risiko)");
  }

  // Bodenfeuchtigkeit
  if (data.soilMoisture === "trocken") {
    offset += 5;
    reasons.push("Trockener Boden (+5 Punkte)");
  } else if (data.soilMoisture === "nass") {
    multiplier *= 0.9;
    reasons.push("Nasser Boden (-10% Risiko)");
  }

  // Sichtbarer Stress
  if (data.visibleStress !== "keine") {
    offset += 8;
    reasons.push("Sichtbare Stresssymptome (+8 Punkte)");
  }

  // Blütenstände
  if (data.floweringVisible === "ja") {
    offset += 5;
    reasons.push("Blütenstände sichtbar (+5 Punkte)");
  }

  // Hahnenfuß-Anteil (erhöht Risiko)
  if (data.buttercupPresence === "hoch") {
    offset += 8;
    reasons.push("Hoher Hahnenfuß-Anteil (+8 Punkte)");
  } else if (data.buttercupPresence === "mittel") {
    offset += 4;
    reasons.push("Mittlerer Hahnenfuß-Anteil (+4 Punkte)");
  }

  // Kräutervielfalt (senkt Risiko)
  if (data.herbDiversity === "hoch") {
    multiplier *= 0.9;
    reasons.push("Hohe Kräutervielfalt (-10% Risiko)");
  } else if (data.herbDiversity === "mittel") {
    multiplier *= 0.95;
    reasons.push("Mittlere Kräutervielfalt (-5% Risiko)");
  }

  return {
    multiplier: Math.max(0.5, Math.min(1.5, multiplier)), // Begrenzt auf ±50%
    offset: Math.max(-15, Math.min(25, offset)), // Begrenzt auf -15 bis +25
    reason: reasons,
  };
}

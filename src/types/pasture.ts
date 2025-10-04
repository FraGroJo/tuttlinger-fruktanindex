/**
 * Weidestand-Parameter für präzisere Fruktan-Berechnung
 */

/**
 * Spezifische Pflanzenart mit Fruktangehalt und Einfluss
 */
export interface PlantSpecies {
  id: string;
  name: string;
  category: "herb" | "legume" | "weed" | "grass";
  fructanContent: number; // % durchschnittlicher Fruktangehalt
  riskModifier: number; // Multiplikator für Risikoberechnung (0.5 = -50%, 1.5 = +50%)
}

/**
 * Verfügbare Pflanzenarten zur Auswahl
 */
export const PLANT_SPECIES: PlantSpecies[] = [
  // Kräuter (niedrige Fruktanwerte)
  { id: "schafgarbe", name: "Schafgarbe", category: "herb", fructanContent: 2.5, riskModifier: 0.85 },
  { id: "spitzwegerich", name: "Spitzwegerich", category: "herb", fructanContent: 1.5, riskModifier: 0.80 },
  { id: "breitwegerich", name: "Breitwegerich", category: "herb", fructanContent: 1.8, riskModifier: 0.82 },
  { id: "loewenzahn", name: "Löwenzahn", category: "herb", fructanContent: 6.0, riskModifier: 0.95 },
  { id: "storchschnabel", name: "Storchschnabel", category: "herb", fructanContent: 0.8, riskModifier: 0.75 },
  { id: "wilde-moehre", name: "Wilde Möhre", category: "herb", fructanContent: 1.2, riskModifier: 0.78 },
  { id: "wiesenkerbel", name: "Wiesenkerbel", category: "herb", fructanContent: 1.5, riskModifier: 0.80 },
  
  // Leguminosen (niedrige Fruktanwerte)
  { id: "weissklee", name: "Weißklee", category: "legume", fructanContent: 0.5, riskModifier: 0.70 },
  { id: "rotklee", name: "Rotklee", category: "legume", fructanContent: 0.8, riskModifier: 0.73 },
  { id: "hornklee", name: "Hornklee", category: "legume", fructanContent: 0.6, riskModifier: 0.71 },
  
  // Unkräuter (teils problematisch)
  { id: "hahnenfuss", name: "Hahnenfuß", category: "weed", fructanContent: 3.0, riskModifier: 1.15 },
  { id: "ampfer", name: "Ampfer", category: "weed", fructanContent: 2.0, riskModifier: 1.08 },
  { id: "disteln", name: "Disteln", category: "weed", fructanContent: 2.5, riskModifier: 1.10 },
];

export interface PastureData {
  // Metadata
  savedAt?: string; // ISO timestamp when data was saved
  
  // Wachstumsbedingungen (sich verändernde Parameter)
  grassHeight: "<5" | "5-10" | "10-15" | "15-20" | ">20"; // cm
  growthPhase: "ruhend" | "langsam" | "aktiv" | "sehr-schnell";
  
  // Spezifische Pflanzenarten (neue detaillierte Erfassung)
  presentSpecies: string[]; // Array von PlantSpecies IDs
  
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
  presentSpecies: [],
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

  // === NEUE: Spezifische Pflanzenarten-Berechnung ===
  if (data.presentSpecies && data.presentSpecies.length > 0) {
    const speciesData = data.presentSpecies
      .map(id => PLANT_SPECIES.find(s => s.id === id))
      .filter((s): s is PlantSpecies => s !== undefined);
    
    // Kategorisiere Pflanzen
    const herbs = speciesData.filter(s => s.category === "herb");
    const legumes = speciesData.filter(s => s.category === "legume");
    const weeds = speciesData.filter(s => s.category === "weed");

    // Kräuter-Einfluss (je mehr, desto besser) - ADDITIV
    if (herbs.length >= 5) {
      const herbReduction = 0.15;
      multiplier -= herbReduction;
      reasons.push(`Hohe Kräutervielfalt (${herbs.length} Arten: ${herbs.map(h => h.name).join(", ")}) - Reduktion -15%`);
    } else if (herbs.length >= 3) {
      const herbReduction = 0.08;
      multiplier -= herbReduction;
      reasons.push(`Mittlere Kräutervielfalt (${herbs.length} Arten: ${herbs.map(h => h.name).join(", ")}) - Reduktion -8%`);
    } else if (herbs.length > 0) {
      const herbReduction = 0.03;
      multiplier -= herbReduction;
      reasons.push(`Geringe Kräutervielfalt (${herbs.length} Arten: ${herbs.map(h => h.name).join(", ")}) - Reduktion -3%`);
    }

    // Leguminosen-Einfluss - ADDITIV
    if (legumes.length >= 2) {
      multiplier -= 0.15;
      offset -= 3;
      reasons.push(`Mehrere Leguminosen (${legumes.map(l => l.name).join(", ")}) - Reduktion -15%, -3 Punkte`);
    } else if (legumes.length === 1) {
      multiplier -= 0.08;
      offset -= 2;
      reasons.push(`${legumes[0].name} vorhanden - Reduktion -8%, -2 Punkte`);
    }

    // Unkräuter-Einfluss (negativ) - ADDITIV
    if (weeds.length > 0) {
      const weedEffect = weeds.reduce((sum, w) => sum + (w.riskModifier - 1.0), 0);
      const weedOffset = weeds.length * 3;
      multiplier += weedEffect;
      offset += weedOffset;
      reasons.push(`Unkräuter erkannt (${weeds.map(w => w.name).join(", ")}) - Erhöhung +${(weedEffect * 100).toFixed(0)}%, +${weedOffset} Punkte`);
    }

    // Spezifische Pflanzen mit besonderen Eigenschaften
    const loewenzahn = speciesData.find(s => s.id === "loewenzahn");
    if (loewenzahn) {
      reasons.push("Löwenzahn: Inulin-basiert (anders als Gras-Fruktane)");
    }

    const schafgarbe = speciesData.find(s => s.id === "schafgarbe");
    if (schafgarbe) {
      reasons.push("Schafgarbe: Sehr niedriger Fruktangehalt (~2,5%)");
    }
  }

  // === Grasarten-Einfluss (±15%) - ADDITIV ===
  const grassFactors = {
    weidelgras: 0.15, // höchste Fruktanakkumulation
    wiesenrispe: 0.05,
    mix: 0.0,
    wiesenschwingel: -0.05,
    rotschwingel: -0.1,
  };
  multiplier += grassFactors[data.grassType];
  if (data.grassType === "weidelgras") {
    reasons.push("Deutsches Weidelgras (+15% Risiko)");
  } else if (data.grassType === "rotschwingel") {
    reasons.push("Rotschwingel (-10% Risiko)");
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

  // Wachstumsphase - ADDITIV
  if (data.growthPhase === "sehr-schnell") {
    multiplier -= 0.25;
    reasons.push("Sehr schnelles Wachstum (-25% Risiko)");
  } else if (data.growthPhase === "aktiv") {
    multiplier -= 0.15;
    reasons.push("Aktives Wachstum (-15% Risiko)");
  } else if (data.growthPhase === "ruhend") {
    multiplier += 0.2;
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

  // Stickstoffdüngung - ADDITIV
  if (data.lastNFertilization === "<2w" && data.nAmount !== "0") {
    multiplier -= 0.2;
    reasons.push("Frische N-Düngung (-20% Risiko)");
  } else if (data.lastNFertilization === ">8w" || data.lastNFertilization === "keine") {
    multiplier += 0.1;
    reasons.push("Lange keine N-Düngung (+10% Risiko)");
  }

  // Bodenfeuchtigkeit
  if (data.soilMoisture === "trocken") {
    offset += 5;
    reasons.push("Trockener Boden (+5 Punkte)");
  } else if (data.soilMoisture === "nass") {
    multiplier -= 0.1;
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

  return {
    multiplier: Math.max(0.5, Math.min(1.5, multiplier)), // Begrenzt auf ±50%
    offset: Math.max(-15, Math.min(25, offset)), // Begrenzt auf -15 bis +25
    reason: reasons,
  };
}

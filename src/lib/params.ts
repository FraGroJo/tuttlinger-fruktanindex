/**
 * Parameter Registry - Single Source of Truth für alle Scoring-Konstanten
 * V25: End-to-End Verifikation & Nachvollziehbarkeit
 */

export type ParamSource = "literature" | "expert" | "fitted" | "assumed";

export interface ParamSpec<T = number> {
  key: string;
  value: T;
  unit?: string;
  range?: [number, number];
  source: ParamSource;
  description: string;
  version: string;
  reference?: string;
}

export const FORMULA_VERSION = "ems-formula@1.6.0";
export const PARAMS_VERSION = "params@2025-10-10";

/**
 * Zentrale Parameter-Registry
 * Alle Scoring-Konstanten mit Metadaten
 */
export const PARAMS: Record<string, ParamSpec> = {
  // === EMS Gewichtungen ===
  "ems.weight.temp": {
    key: "ems.weight.temp",
    value: 0.38,
    range: [0, 1],
    source: "literature",
    description: "Gewicht Temperatur im EMS-Score",
    version: FORMULA_VERSION,
    reference: "Fruktan-Akkumulation Studien 2019-2023",
  },
  "ems.weight.radiation": {
    key: "ems.weight.radiation",
    value: 0.27,
    range: [0, 1],
    source: "literature",
    description: "Gewicht Sonneneinstrahlung",
    version: FORMULA_VERSION,
    reference: "Photosynthese-Korrelation",
  },
  "ems.weight.humidity": {
    key: "ems.weight.humidity",
    value: 0.20,
    range: [0, 1],
    source: "literature",
    description: "Gewicht relative Luftfeuchte",
    version: FORMULA_VERSION,
  },
  "ems.weight.cloud": {
    key: "ems.weight.cloud",
    value: 0.10,
    range: [0, 1],
    source: "expert",
    description: "Bewölkung kompensiert Strahlung",
    version: FORMULA_VERSION,
  },
  "ems.weight.wind": {
    key: "ems.weight.wind",
    value: 0.05,
    range: [0, 1],
    source: "expert",
    description: "Verdunstungskühlung durch Wind",
    version: FORMULA_VERSION,
  },

  // === EMS Schwellenwerte ===
  "ems.threshold.green.max": {
    key: "ems.threshold.green.max",
    value: 29,
    range: [0, 100],
    source: "literature",
    description: "Grenze Sicher (grün) Standard",
    version: FORMULA_VERSION,
  },
  "ems.threshold.yellow.max": {
    key: "ems.threshold.yellow.max",
    value: 59,
    range: [0, 100],
    source: "literature",
    description: "Grenze Erhöht (gelb) Standard",
    version: FORMULA_VERSION,
  },
  "ems.threshold.green.max.ems": {
    key: "ems.threshold.green.max.ems",
    value: 19,
    range: [0, 100],
    source: "expert",
    description: "Grenze Sicher (grün) EMS-Modus",
    version: FORMULA_VERSION,
  },
  "ems.threshold.yellow.max.ems": {
    key: "ems.threshold.yellow.max.ems",
    value: 39,
    range: [0, 100],
    source: "expert",
    description: "Grenze Erhöht (gelb) EMS-Modus",
    version: FORMULA_VERSION,
  },

  // === Frost & Kälte ===
  "ems.frost.bonus": {
    key: "ems.frost.bonus",
    value: 18,
    range: [0, 40],
    source: "literature",
    description: "Frost-Zusatz auf Score (T≤0°C)",
    version: FORMULA_VERSION,
  },
  "ems.cold.threshold": {
    key: "ems.cold.threshold",
    value: 8,
    unit: "°C",
    range: [0, 15],
    source: "literature",
    description: "Kritische Kälte-Schwelle",
    version: FORMULA_VERSION,
  },

  // === Trockenheit (ET0) ===
  "ems.et0.min.summer": {
    key: "ems.et0.min.summer",
    value: 3.0,
    unit: "mm/Tag",
    range: [0, 10],
    source: "literature",
    description: "ET0 Mindestschwelle Sommer",
    version: FORMULA_VERSION,
  },
  "ems.et0.max.summer": {
    key: "ems.et0.max.summer",
    value: 6.0,
    unit: "mm/Tag",
    range: [3, 12],
    source: "literature",
    description: "ET0 Maximalschwelle Sommer",
    version: FORMULA_VERSION,
  },
  "ems.et0.min.spring": {
    key: "ems.et0.min.spring",
    value: 1.2,
    unit: "mm/Tag",
    range: [0, 5],
    source: "literature",
    description: "ET0 Mindestschwelle Frühling/Herbst",
    version: FORMULA_VERSION,
  },
  "ems.et0.max.spring": {
    key: "ems.et0.max.spring",
    value: 3.5,
    unit: "mm/Tag",
    range: [1, 8],
    source: "literature",
    description: "ET0 Maximalschwelle Frühling/Herbst",
    version: FORMULA_VERSION,
  },
  "ems.et0.min.winter": {
    key: "ems.et0.min.winter",
    value: 0.5,
    unit: "mm/Tag",
    range: [0, 3],
    source: "literature",
    description: "ET0 Mindestschwelle Winter",
    version: FORMULA_VERSION,
  },
  "ems.et0.max.winter": {
    key: "ems.et0.max.winter",
    value: 2.0,
    unit: "mm/Tag",
    range: [0.5, 5],
    source: "literature",
    description: "ET0 Maximalschwelle Winter",
    version: FORMULA_VERSION,
  },

  // === Niederschlag ===
  "ems.precip.threshold.summer": {
    key: "ems.precip.threshold.summer",
    value: 5,
    unit: "mm/7d",
    range: [0, 30],
    source: "literature",
    description: "Niederschlagsschwelle Sommer (trocken)",
    version: FORMULA_VERSION,
  },
  "ems.precip.threshold.spring": {
    key: "ems.precip.threshold.spring",
    value: 10,
    unit: "mm/7d",
    range: [0, 40],
    source: "literature",
    description: "Niederschlagsschwelle Frühling/Herbst",
    version: FORMULA_VERSION,
  },
  "ems.precip.threshold.winter": {
    key: "ems.precip.threshold.winter",
    value: 15,
    unit: "mm/7d",
    range: [0, 50],
    source: "literature",
    description: "Niederschlagsschwelle Winter",
    version: FORMULA_VERSION,
  },

  // === Bewölkung ===
  "ems.cloud.high": {
    key: "ems.cloud.high",
    value: 80,
    unit: "%",
    range: [60, 100],
    source: "expert",
    description: "Schwellenwert hohe Bewölkung",
    version: FORMULA_VERSION,
  },
  "ems.cloud.med": {
    key: "ems.cloud.med",
    value: 60,
    unit: "%",
    range: [40, 80],
    source: "expert",
    description: "Schwellenwert mittlere Bewölkung",
    version: FORMULA_VERSION,
  },
  "ems.cloud.high.relief": {
    key: "ems.cloud.high.relief",
    value: -8,
    range: [-20, 0],
    source: "expert",
    description: "Score-Reduktion bei hoher Bewölkung",
    version: FORMULA_VERSION,
  },
  "ems.cloud.med.relief": {
    key: "ems.cloud.med.relief",
    value: -4,
    range: [-10, 0],
    source: "expert",
    description: "Score-Reduktion bei mittlerer Bewölkung",
    version: FORMULA_VERSION,
  },

  // === Wind ===
  "ems.wind.threshold": {
    key: "ems.wind.threshold",
    value: 15,
    unit: "km/h",
    range: [10, 30],
    source: "expert",
    description: "Windschwelle für Verdunstungsbonus",
    version: FORMULA_VERSION,
  },
  "ems.wind.bonus": {
    key: "ems.wind.bonus",
    value: 4,
    range: [0, 10],
    source: "expert",
    description: "Score-Erhöhung bei starkem Wind",
    version: FORMULA_VERSION,
  },

  // === Diurnal Range ===
  "ems.diurnal.min": {
    key: "ems.diurnal.min",
    value: 5,
    unit: "°C",
    range: [0, 10],
    source: "literature",
    description: "Minimale diurnale Spanne",
    version: FORMULA_VERSION,
  },
  "ems.diurnal.max": {
    key: "ems.diurnal.max",
    value: 15,
    unit: "°C",
    range: [10, 25],
    source: "literature",
    description: "Maximale diurnale Spanne",
    version: FORMULA_VERSION,
  },
  "ems.diurnal.max.boost": {
    key: "ems.diurnal.max.boost",
    value: 12,
    range: [0, 20],
    source: "literature",
    description: "Maximaler Score-Boost durch diurnale Spanne",
    version: FORMULA_VERSION,
  },

  // === Strahlung ===
  "ems.radiation.threshold": {
    key: "ems.radiation.threshold",
    value: 100,
    unit: "W/m²",
    range: [50, 200],
    source: "literature",
    description: "Mindeststrahlung für Sonnen-Bonus",
    version: FORMULA_VERSION,
  },
  "ems.radiation.max": {
    key: "ems.radiation.max",
    value: 800,
    unit: "W/m²",
    range: [600, 1200],
    source: "literature",
    description: "Maximale Strahlung für Skalierung",
    version: FORMULA_VERSION,
  },
  "ems.radiation.max.bonus": {
    key: "ems.radiation.max.bonus",
    value: 30,
    range: [10, 50],
    source: "literature",
    description: "Maximaler Strahlung-Score-Bonus",
    version: FORMULA_VERSION,
  },

  // === Luftfeuchte ===
  "ems.humidity.dry.threshold": {
    key: "ems.humidity.dry.threshold",
    value: 65,
    unit: "%",
    range: [50, 80],
    source: "literature",
    description: "Schwelle für trockene Luft",
    version: FORMULA_VERSION,
  },
  "ems.humidity.dry.bonus": {
    key: "ems.humidity.dry.bonus",
    value: 12,
    range: [0, 20],
    source: "literature",
    description: "Score-Erhöhung bei trockener Luft",
    version: FORMULA_VERSION,
  },

  // === Hitze-Relief ===
  "ems.heat.temp.threshold": {
    key: "ems.heat.temp.threshold",
    value: 28,
    unit: "°C",
    range: [25, 35],
    source: "literature",
    description: "Temperaturschwelle für Hitze-Relief",
    version: FORMULA_VERSION,
  },
  "ems.heat.precip.threshold": {
    key: "ems.heat.precip.threshold",
    value: 10,
    unit: "mm/7d",
    range: [5, 20],
    source: "literature",
    description: "Niederschlagsschwelle für Hitze-Relief",
    version: FORMULA_VERSION,
  },
  "ems.heat.relief": {
    key: "ems.heat.relief",
    value: -10,
    range: [-20, 0],
    source: "literature",
    description: "Score-Reduktion bei Hitze mit Feuchtigkeit",
    version: FORMULA_VERSION,
  },

  // === Base Score ===
  "ems.base.score": {
    key: "ems.base.score",
    value: 20,
    range: [0, 50],
    source: "fitted",
    description: "Basis-Score für Berechnung",
    version: FORMULA_VERSION,
  },

  // === Scoring Bounds ===
  "ems.score.min": {
    key: "ems.score.min",
    value: 0,
    range: [0, 0],
    source: "assumed",
    description: "Minimaler Score-Wert",
    version: FORMULA_VERSION,
  },
  "ems.score.max": {
    key: "ems.score.max",
    value: 100,
    range: [100, 100],
    source: "assumed",
    description: "Maximaler Score-Wert",
    version: FORMULA_VERSION,
  },
};

/**
 * Validiert Parameter-Registry
 */
export function assertParams(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Prüfe alle Parameter
  Object.values(PARAMS).forEach((param) => {
    // Typ-Check
    if (typeof param.value !== "number") {
      errors.push(`${param.key}: value must be number, got ${typeof param.value}`);
    }

    // Range-Check
    if (param.range) {
      const [min, max] = param.range;
      if (param.value < min || param.value > max) {
        errors.push(
          `${param.key}: value ${param.value} out of range [${min}, ${max}]`
        );
      }
    }

    // Version-Check
    if (!param.version) {
      errors.push(`${param.key}: missing version`);
    }
  });

  // Prüfe Gewichtungen summieren zu ~1.0
  const weights = [
    PARAMS["ems.weight.temp"].value,
    PARAMS["ems.weight.radiation"].value,
    PARAMS["ems.weight.humidity"].value,
    PARAMS["ems.weight.cloud"].value,
    PARAMS["ems.weight.wind"].value,
  ];
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (Math.abs(weightSum - 1.0) > 0.02) {
    errors.push(`Weight sum ${weightSum.toFixed(3)} != 1.0 (±0.02)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Exportiert Parameter als JSON
 */
export function exportParams(): string {
  return JSON.stringify(
    {
      version: PARAMS_VERSION,
      formula: FORMULA_VERSION,
      timestamp: new Date().toISOString(),
      params: PARAMS,
    },
    null,
    2
  );
}

/**
 * Liefert Parameter-Wert (typed)
 */
export function getParam(key: string): number {
  const param = PARAMS[key];
  if (!param) {
    throw new Error(`Unknown parameter: ${key}`);
  }
  return param.value;
}

/**
 * Liefert Parameter-Spec
 */
export function getParamSpec(key: string): ParamSpec {
  const param = PARAMS[key];
  if (!param) {
    throw new Error(`Unknown parameter: ${key}`);
  }
  return { ...param }; // Deep copy
}

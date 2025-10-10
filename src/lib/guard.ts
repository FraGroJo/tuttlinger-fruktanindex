/**
 * Safe-Display Guards - Verhindert falsche/inkonsistente Anzeige
 * V25: Harte Wächter für Datenintegrität
 */

import { assertParams, FORMULA_VERSION, PARAMS_VERSION } from "./params";
import { logger } from "./logger";

export interface IntegrityCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  severity: "ok" | "warning" | "critical";
}

export interface ValidationContext {
  hourlyLength: number;
  timesLength: number;
  timezone: string;
  datasetVersion?: string;
  formulaVersion?: string;
  paramsVersion?: string;
  sourceModel?: string;
}

/**
 * Validiert Daten-SSOT Integrität
 */
export function validateIntegrity(ctx: ValidationContext): IntegrityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // === Rule G1: Stundenlängen identisch ===
  if (ctx.hourlyLength !== ctx.timesLength) {
    errors.push(
      `Hourly data length mismatch: hourly=${ctx.hourlyLength}, times=${ctx.timesLength}`
    );
  }

  // === Rule G2: Zeitzone Europe/Berlin ===
  if (ctx.timezone !== "Europe/Berlin") {
    errors.push(`Invalid timezone: ${ctx.timezone} (expected Europe/Berlin)`);
  }

  // === Rule G3: Parameter-Validierung ===
  const paramCheck = assertParams();
  if (!paramCheck.valid) {
    errors.push(...paramCheck.errors.map((e) => `Param: ${e}`));
  }

  // === Rule G4: Dataset-Version vorhanden ===
  if (!ctx.datasetVersion) {
    warnings.push("Missing datasetVersion hash");
  }

  // === Rule G5: Formel-Version gesetzt ===
  if (!ctx.formulaVersion) {
    errors.push("Missing formulaVersion");
  } else if (ctx.formulaVersion !== FORMULA_VERSION) {
    warnings.push(
      `Formula version mismatch: ${ctx.formulaVersion} != ${FORMULA_VERSION}`
    );
  }

  // === Rule G6: Params-Version gesetzt ===
  if (!ctx.paramsVersion) {
    errors.push("Missing paramsVersion");
  } else if (ctx.paramsVersion !== PARAMS_VERSION) {
    warnings.push(
      `Params version mismatch: ${ctx.paramsVersion} != ${PARAMS_VERSION}`
    );
  }

  // === Rule G7: Source Model vorhanden ===
  if (!ctx.sourceModel) {
    warnings.push("Missing sourceModel");
  }

  // Bestimme Severity
  let severity: "ok" | "warning" | "critical" = "ok";
  if (errors.length > 0) severity = "critical";
  else if (warnings.length > 0) severity = "warning";

  const passed = errors.length === 0;

  if (!passed) {
    logger.error("integrity_check_failed", {
      errors,
      warnings,
      context: ctx,
    });
  } else if (warnings.length > 0) {
    logger.warn("integrity_check_warnings", {
      warnings,
      context: ctx,
    });
  } else {
    logger.info("integrity_check_passed", {
      context: ctx,
    });
  }

  return {
    passed,
    errors,
    warnings,
    severity,
  };
}

/**
 * Validiert Zeitreihen-Konsistenz
 */
export function validateTimeSeries(times: string[]): IntegrityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (times.length === 0) {
    errors.push("Empty time series");
    return { passed: false, errors, warnings, severity: "critical" };
  }

  // === Rule T1: Strikt aufsteigend ===
  for (let i = 1; i < times.length; i++) {
    const prev = new Date(times[i - 1]);
    const curr = new Date(times[i]);
    if (curr <= prev) {
      errors.push(`Time series not strictly ascending at index ${i}`);
    }
  }

  // === Rule T2: 1-Stunden-Schritte ===
  for (let i = 1; i < times.length; i++) {
    const prev = new Date(times[i - 1]);
    const curr = new Date(times[i]);
    const diffHours = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60);
    if (Math.abs(diffHours - 1) > 0.01) {
      warnings.push(`Time step != 1h at index ${i}: ${diffHours.toFixed(2)}h`);
    }
  }

  // === Rule T3: Keine Lücken ===
  const expectedHours = 240; // 72h past + 168h forecast
  if (times.length < expectedHours) {
    warnings.push(`Incomplete time series: ${times.length}/${expectedHours} hours`);
  }

  const passed = errors.length === 0;
  const severity = errors.length > 0 ? "critical" : warnings.length > 0 ? "warning" : "ok";

  return { passed, errors, warnings, severity };
}

/**
 * Validiert Werte-Ranges (Physics-Check)
 */
export function validateValueRanges(data: {
  temps: number[];
  humidity: number[];
  cloud: number[];
  precip: number[];
  wind: number[];
}): IntegrityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // === Rule V1: Temperatur (-30 bis 45 °C) ===
  const invalidTemps = data.temps.filter((t) => t < -30 || t > 45);
  if (invalidTemps.length > 0) {
    errors.push(`${invalidTemps.length} temperatures out of range (-30 to 45°C)`);
  }

  // === Rule V2: Luftfeuchte (0 bis 100 %) ===
  const invalidHum = data.humidity.filter((h) => h < 0 || h > 100);
  if (invalidHum.length > 0) {
    errors.push(`${invalidHum.length} humidity values out of range (0-100%)`);
  }

  // === Rule V3: Bewölkung (0 bis 100 %) ===
  const invalidCloud = data.cloud.filter((c) => c < 0 || c > 100);
  if (invalidCloud.length > 0) {
    errors.push(`${invalidCloud.length} cloud values out of range (0-100%)`);
  }

  // === Rule V4: Niederschlag (≥0 mm) ===
  const invalidPrecip = data.precip.filter((p) => p < 0);
  if (invalidPrecip.length > 0) {
    errors.push(`${invalidPrecip.length} negative precipitation values`);
  }

  // === Rule V5: Wind (0 bis 60 km/h) ===
  const invalidWind = data.wind.filter((w) => w < 0 || w > 60);
  if (invalidWind.length > 0) {
    warnings.push(`${invalidWind.length} wind values unusual (>60 km/h)`);
  }

  const passed = errors.length === 0;
  const severity = errors.length > 0 ? "critical" : warnings.length > 0 ? "warning" : "ok";

  return { passed, errors, warnings, severity };
}

/**
 * Safe-Display State
 */
export type SafeDisplayState = "ok" | "warning" | "blocked";

export interface SafeDisplayStatus {
  state: SafeDisplayState;
  message: string;
  details?: string[];
  canDisplay: boolean;
}

/**
 * Bestimmt Safe-Display Status
 */
export function getSafeDisplayStatus(
  integrity: IntegrityCheckResult,
  timeSeries: IntegrityCheckResult,
  valueRanges: IntegrityCheckResult
): SafeDisplayStatus {
  const allErrors = [
    ...integrity.errors,
    ...timeSeries.errors,
    ...valueRanges.errors,
  ];

  const allWarnings = [
    ...integrity.warnings,
    ...timeSeries.warnings,
    ...valueRanges.warnings,
  ];

  // Kritische Fehler → BLOCKED
  if (allErrors.length > 0) {
    logger.error("safe_display_blocked", {
      errors: allErrors,
      warnings: allWarnings,
    });

    return {
      state: "blocked",
      message: "Daten unter Prüfung – keine Anzeige",
      details: allErrors,
      canDisplay: false,
    };
  }

  // Warnungen → WARNING
  if (allWarnings.length > 0) {
    logger.warn("safe_display_warning", {
      warnings: allWarnings,
    });

    return {
      state: "warning",
      message: "Daten mit Einschränkungen",
      details: allWarnings,
      canDisplay: true,
    };
  }

  // Alles OK
  logger.info("safe_display_ok", {});

  return {
    state: "ok",
    message: "Integrität geprüft",
    details: [],
    canDisplay: true,
  };
}

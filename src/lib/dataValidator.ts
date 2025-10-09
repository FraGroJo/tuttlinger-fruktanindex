/**
 * Umfassende Datenvalidierung für Wetterdaten (ICON-D2 / ECMWF)
 * Phase 2: Integritätsprüfung, Modellvergleich und Score-Validierung
 */

import { logger } from './logger';
import { calculateScore, getRiskLevel } from './scoring';
import type { ScoringInput } from './scoring';
import type { RiskLevel } from '@/types/fruktan';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  confidence?: 'normal' | 'low';
}

export interface ModelComparisonResult {
  tempDelta: number;
  humidityDelta: number;
  radiationDelta: number;
  consistent: boolean;
  confidence: 'normal' | 'low';
}

export interface ScoreValidationResult {
  expected: number;
  actual: number;
  deviation: number;
  withinTolerance: boolean;
}

interface HourlyData {
  time: string[];
  temperature_2m: number[];
  relative_humidity_2m: number[];
  shortwave_radiation: number[];
  cloud_cover: number[];
  precipitation: number[];
  wind_speed_10m: number[];
  et0_fao_evapotranspiration: number[];
}

const VALIDATION_RULES = {
  temperature: { min: -30, max: 45, unit: '°C' },
  humidity: { min: 0, max: 100, unit: '%' },
  cloudCover: { min: 0, max: 100, unit: '%' },
  windSpeed: { min: 0, max: 60, unit: 'm/s' },
  precipitation: { min: 0, max: 500, unit: 'mm' },
  radiation: { min: 0, max: 1500, unit: 'W/m²' },
  et0: { min: 0, max: 20, unit: 'mm' },
};

const MIN_REQUIRED_HOURS = 240; // 10 days (3 past + 7 forecast)
const MAX_TIMESTAMP_DRIFT_MINUTES = 30;
const MAX_MODEL_RUN_AGE_HOURS = 6;

export class DataValidator {
  validateWeatherData(data: any): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    try {
      // 1. Check if data exists
      if (!data || !data.hourly) {
        result.errors.push('Keine Wetterdaten vorhanden');
        result.valid = false;
        return result;
      }

      const hourly: HourlyData = data.hourly;

      // 2. Check for complete time series
      this.validateTimeSeries(hourly, result);

      // 3. Check timestamp alignment
      this.validateTimestamps(hourly.time, result);

      // 4. Validate value ranges
      this.validateValueRanges(hourly, result);

      // 5. Check model run age (if available)
      if (data.generationtime_ms !== undefined) {
        this.validateModelRunAge(data, result);
      }

      // 6. Check for data gaps
      this.checkDataGaps(hourly, result);

      result.valid = result.errors.length === 0;

      if (!result.valid) {
        logger.error('data_validation_failed', { errors: result.errors, warnings: result.warnings });
      } else if (result.warnings.length > 0) {
        logger.warn('data_validation_warnings', { warnings: result.warnings });
      } else {
        logger.info('data_validation_success', { hours: hourly.time.length });
      }

    } catch (error) {
      result.errors.push(`Validierungsfehler: ${error instanceof Error ? error.message : 'Unbekannt'}`);
      result.valid = false;
      logger.error('data_validation_exception', { error: String(error) });
    }

    return result;
  }

  private validateTimeSeries(hourly: HourlyData, result: ValidationResult) {
    if (!hourly.time || hourly.time.length < MIN_REQUIRED_HOURS) {
      result.errors.push(
        `Unvollständige Zeitreihe: ${hourly.time?.length || 0} Stunden (mind. ${MIN_REQUIRED_HOURS} erforderlich)`
      );
    }

    // Check if all arrays have same length
    const lengths = [
      hourly.time.length,
      hourly.temperature_2m?.length || 0,
      hourly.relative_humidity_2m?.length || 0,
      hourly.shortwave_radiation?.length || 0,
      hourly.cloud_cover?.length || 0,
      hourly.precipitation?.length || 0,
      hourly.wind_speed_10m?.length || 0,
    ];

    if (new Set(lengths).size > 1) {
      result.errors.push('Inkonsistente Array-Längen in Wetterdaten');
    }
  }

  private validateTimestamps(timestamps: string[], result: ValidationResult) {
    if (!timestamps || timestamps.length === 0) return;

    const now = new Date();
    const firstTimestamp = new Date(timestamps[0]);
    const lastTimestamp = new Date(timestamps[timestamps.length - 1]);

    // Check for consecutive hourly timestamps
    for (let i = 1; i < timestamps.length; i++) {
      const prev = new Date(timestamps[i - 1]);
      const curr = new Date(timestamps[i]);
      const diffHours = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60);

      if (Math.abs(diffHours - 1) > 0.1) {
        result.warnings.push(`Zeitsprung bei Index ${i}: ${diffHours.toFixed(1)}h statt 1h`);
      }
    }

    // Check timestamp drift from server time
    const currentIndex = timestamps.findIndex(ts => {
      const tsDate = new Date(ts);
      return Math.abs(tsDate.getTime() - now.getTime()) < MAX_TIMESTAMP_DRIFT_MINUTES * 60 * 1000;
    });

    if (currentIndex === -1) {
      result.warnings.push(
        `Keine Zeitstempel innerhalb ±${MAX_TIMESTAMP_DRIFT_MINUTES} Minuten der Serverzeit`
      );
    }
  }

  private validateValueRanges(hourly: HourlyData, result: ValidationResult) {
    // Temperature
    this.validateArray(
      hourly.temperature_2m,
      'Temperatur',
      VALIDATION_RULES.temperature,
      result
    );

    // Humidity
    this.validateArray(
      hourly.relative_humidity_2m,
      'Luftfeuchtigkeit',
      VALIDATION_RULES.humidity,
      result
    );

    // Cloud cover
    this.validateArray(
      hourly.cloud_cover,
      'Bewölkung',
      VALIDATION_RULES.cloudCover,
      result
    );

    // Wind speed
    this.validateArray(
      hourly.wind_speed_10m,
      'Windgeschwindigkeit',
      VALIDATION_RULES.windSpeed,
      result
    );

    // Precipitation
    this.validateArray(
      hourly.precipitation,
      'Niederschlag',
      VALIDATION_RULES.precipitation,
      result
    );

    // Radiation
    this.validateArray(
      hourly.shortwave_radiation,
      'Strahlung',
      VALIDATION_RULES.radiation,
      result
    );

    // ET0
    if (hourly.et0_fao_evapotranspiration) {
      this.validateArray(
        hourly.et0_fao_evapotranspiration,
        'ET0',
        VALIDATION_RULES.et0,
        result
      );
    }
  }

  private validateArray(
    values: number[] | undefined,
    name: string,
    rules: { min: number; max: number; unit: string },
    result: ValidationResult
  ) {
    if (!values) {
      result.warnings.push(`${name}-Daten fehlen`);
      return;
    }

    const outOfRange = values.filter(v => v !== null && (v < rules.min || v > rules.max));
    if (outOfRange.length > 0) {
      result.warnings.push(
        `${name}: ${outOfRange.length} Werte außerhalb ${rules.min}–${rules.max} ${rules.unit}`
      );
    }

    const nullCount = values.filter(v => v === null || v === undefined).length;
    if (nullCount > 0) {
      result.warnings.push(`${name}: ${nullCount} fehlende Werte`);
    }
  }

  private validateModelRunAge(data: any, result: ValidationResult) {
    // ECMWF model runs are typically every 6 hours
    // This is a simplified check - in production you'd parse actual model run time
    const generationAge = data.generationtime_ms || 0;
    if (generationAge > MAX_MODEL_RUN_AGE_HOURS * 60 * 60 * 1000) {
      result.warnings.push(
        `Model-Run möglicherweise veraltet (${(generationAge / 1000 / 60 / 60).toFixed(1)}h alt)`
      );
    }
  }

  private checkDataGaps(hourly: HourlyData, result: ValidationResult) {
    // Check for sequences of null/invalid values
    const temp = hourly.temperature_2m || [];
    let maxGap = 0;
    let currentGap = 0;

    for (let i = 0; i < temp.length; i++) {
      if (temp[i] === null || temp[i] === undefined || isNaN(temp[i])) {
        currentGap++;
        maxGap = Math.max(maxGap, currentGap);
      } else {
        currentGap = 0;
      }
    }

    if (maxGap > 3) {
      result.warnings.push(`Längste Datenlücke: ${maxGap} aufeinanderfolgende Stunden`);
    }
  }

  /**
   * Phase 2: Vergleicht ICON-D2 und ECMWF Daten
   */
  compareModels(iconData: any, ecmwfData: any): ModelComparisonResult {
    const result: ModelComparisonResult = {
      tempDelta: 0,
      humidityDelta: 0,
      radiationDelta: 0,
      consistent: true,
      confidence: 'normal',
    };

    try {
      if (!iconData?.hourly || !ecmwfData?.hourly) {
        logger.warn('model_comparison_incomplete', { 
          hasIcon: !!iconData?.hourly, 
          hasEcmwf: !!ecmwfData?.hourly 
        });
        return result;
      }

      const iconHourly = iconData.hourly;
      const ecmwfHourly = ecmwfData.hourly;

      // Vergleiche überlappende Zeiträume (erste 168h = 7 Tage Prognose)
      const compareLength = Math.min(168, iconHourly.time?.length || 0, ecmwfHourly.time?.length || 0);

      if (compareLength < 24) {
        logger.warn('model_comparison_insufficient_data', { compareLength });
        return result;
      }

      // Berechne durchschnittliche Abweichungen
      let tempSum = 0, humSum = 0, radSum = 0;
      let validCount = 0;

      for (let i = 0; i < compareLength; i++) {
        const iconTemp = iconHourly.temperature_2m?.[i];
        const ecmwfTemp = ecmwfHourly.temperature_2m?.[i];
        const iconHum = iconHourly.relative_humidity_2m?.[i];
        const ecmwfHum = ecmwfHourly.relative_humidity_2m?.[i];
        const iconRad = iconHourly.shortwave_radiation?.[i];
        const ecmwfRad = ecmwfHourly.shortwave_radiation?.[i];

        if (iconTemp != null && ecmwfTemp != null) {
          tempSum += Math.abs(iconTemp - ecmwfTemp);
          validCount++;
        }
        if (iconHum != null && ecmwfHum != null) {
          humSum += Math.abs(iconHum - ecmwfHum);
        }
        if (iconRad != null && ecmwfRad != null) {
          radSum += Math.abs(iconRad - ecmwfRad);
        }
      }

      if (validCount > 0) {
        result.tempDelta = tempSum / validCount;
        result.humidityDelta = humSum / validCount;
        result.radiationDelta = radSum / validCount;

        // Konsistenzprüfung: ΔT > 1.5°C oder ΔRH > 10%
        if (result.tempDelta > 1.5 || result.humidityDelta > 10) {
          result.consistent = false;
          result.confidence = 'low';
          logger.warn('model_comparison_inconsistent', {
            tempDelta: result.tempDelta.toFixed(2),
            humidityDelta: result.humidityDelta.toFixed(2),
          });
        } else {
          logger.info('model_comparison_consistent', {
            tempDelta: result.tempDelta.toFixed(2),
            humidityDelta: result.humidityDelta.toFixed(2),
          });
        }
      }

    } catch (error) {
      logger.error('model_comparison_error', { error: String(error) });
    }

    return result;
  }

  /**
   * Phase 2: Validiert Score-Berechnungen
   */
  validateScoreCalculation(
    input: ScoringInput,
    actualScore: number,
    emsMode: boolean = false
  ): ScoreValidationResult {
    const expected = calculateScore(input);
    const deviation = Math.abs(expected - actualScore);
    const tolerance = 0.5; // 0.5% Toleranz

    const result: ScoreValidationResult = {
      expected,
      actual: actualScore,
      deviation,
      withinTolerance: deviation <= tolerance,
    };

    if (!result.withinTolerance) {
      logger.warn('score_validation_mismatch', {
        slot: input.slot,
        expected,
        actual: actualScore,
        deviation: deviation.toFixed(2),
      });
    }

    return result;
  }

  /**
   * Phase 2: Validiert NSC-Berechnungen
   */
  validateNSCCalculation(
    horseMass: number,
    isEMS: boolean,
    hayKg: number,
    hayNSC: number,
    expectedNSCAllowance: number,
    tolerance: number = 5 // 5% Toleranz
  ): { valid: boolean; deviation: number } {
    const budget = isEMS ? 8 * horseMass : 12 * horseMass;
    const hayDM = hayKg * 0.897;
    const hayNSCg = hayDM * (hayNSC / 100) * 1000;
    const calculated = budget - hayNSCg;
    const deviation = Math.abs((calculated - expectedNSCAllowance) / calculated * 100);

    const valid = deviation <= tolerance;

    if (!valid) {
      logger.warn('nsc_calculation_mismatch', {
        horseMass,
        isEMS,
        calculated: calculated.toFixed(2),
        expected: expectedNSCAllowance.toFixed(2),
        deviation: deviation.toFixed(2),
      });
    }

    return { valid, deviation };
  }

  /**
   * Phase 2: Vollständige Integritätsprüfung
   */
  validateIntegrity(data: any): ValidationResult {
    const result = this.validateWeatherData(data);

    // Zusätzliche Zeitzonenprüfung
    if (data.current_weather?.time) {
      const currentWeatherTime = new Date(data.current_weather.time);
      const now = new Date();
      const diffMinutes = Math.abs(now.getTime() - currentWeatherTime.getTime()) / (1000 * 60);

      if (diffMinutes > MAX_TIMESTAMP_DRIFT_MINUTES) {
        result.warnings.push(
          `Zeitversatz current_weather: ${diffMinutes.toFixed(0)} min (> ${MAX_TIMESTAMP_DRIFT_MINUTES} min)`
        );
        result.confidence = 'low';
      }
    }

    // Prüfe Zeitzone
    if (data.timezone && data.timezone !== 'Europe/Berlin') {
      result.warnings.push(`Unerwartete Zeitzone: ${data.timezone} (erwartet: Europe/Berlin)`);
    }

    if (result.valid) {
      logger.info('integrity_check_passed', { 
        hours: data.hourly?.time?.length || 0,
        confidence: result.confidence || 'normal'
      });
    } else {
      logger.error('integrity_check_failed', { 
        errors: result.errors,
        warnings: result.warnings 
      });
    }

    return result;
  }
}

export const dataValidator = new DataValidator();

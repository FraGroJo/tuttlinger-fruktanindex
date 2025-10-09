/**
 * Hybrid-Wetterdaten-API-Client
 * 
 * Primärquelle: DWD ICON-D2 (hohe Auflösung, Deutschland)
 * Fallback: ECMWF (globales Modell)
 * 
 * Standort: Tuttlingen (47.969083°N, 8.783222°E)
 */

import { logger } from './logger';
import type { ECMWFResponse } from '@/types/api';

// Fester Standort: Tuttlingen
export const TUTTLINGEN_LOCATION = {
  latitude: 47.969083,
  longitude: 8.783222,
  name: 'Tuttlingen',
  timezone: 'Europe/Berlin',
} as const;

// API-Endpunkte
const ICON_D2_URL = 'https://api.open-meteo.com/v1/dwd-icon';
const ECMWF_URL = 'https://api.open-meteo.com/v1/ecmwf';

// Retry-Konfiguration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export type WeatherModel = 'ICON-D2' | 'ECMWF';

export interface WeatherDataResponse {
  data: ECMWFResponse;
  model: WeatherModel;
  source: string;
  timestamp: string;
  fallbackUsed: boolean;
  validationPassed: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class WeatherAPIClient {
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Erstellt URL-Parameter für API-Anfragen
   */
  private createParams(): URLSearchParams {
    return new URLSearchParams({
      latitude: TUTTLINGEN_LOCATION.latitude.toString(),
      longitude: TUTTLINGEN_LOCATION.longitude.toString(),
      timezone: TUTTLINGEN_LOCATION.timezone,
      past_days: '3',
      forecast_days: '7',
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'shortwave_radiation',
        'cloud_cover',
        'precipitation',
        'wind_speed_10m',
        'et0_fao_evapotranspiration',
      ].join(','),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'cloud_cover',
        'wind_speed_10m',
        'precipitation',
      ].join(','),
      daily: 'temperature_2m_min,temperature_2m_max',
    });
  }

  /**
   * Validiert Wetterdaten
   */
  private validateWeatherData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Prüfe erforderliche Strukturen
    if (!data.hourly || !data.hourly.time) {
      errors.push('Hourly data missing');
      return { valid: false, errors, warnings };
    }

    // Prüfe Zeitreihenlänge (240 Stunden = 72h + 168h)
    const hourlyLength = data.hourly.time.length;
    if (hourlyLength !== 240) {
      warnings.push(`Expected 240 hours, got ${hourlyLength}`);
    }

    // Prüfe Temperaturbereich
    const temps = data.hourly.temperature_2m || [];
    const invalidTemps = temps.filter((t: number) => t < -30 || t > 45);
    if (invalidTemps.length > 0) {
      errors.push(`${invalidTemps.length} temperature values out of range (-30 to 45°C)`);
    }

    // Prüfe Luftfeuchte
    const humidity = data.hourly.relative_humidity_2m || [];
    const invalidHumidity = humidity.filter((h: number) => h < 0 || h > 100);
    if (invalidHumidity.length > 0) {
      errors.push(`${invalidHumidity.length} humidity values out of range (0-100%)`);
    }

    // Prüfe Niederschlag
    const precip = data.hourly.precipitation || [];
    const invalidPrecip = precip.filter((p: number) => p < 0);
    if (invalidPrecip.length > 0) {
      errors.push(`${invalidPrecip.length} negative precipitation values`);
    }

    // Prüfe Current Weather Zeitstempel
    if (data.current) {
      const currentTime = new Date(data.current.time);
      const now = new Date();
      const diffMinutes = Math.abs(now.getTime() - currentTime.getTime()) / (1000 * 60);
      
      if (diffMinutes > 30) {
        warnings.push(`Current weather timestamp differs by ${diffMinutes.toFixed(0)} minutes`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Holt Daten von einem spezifischen Modell
   */
  private async fetchFromModel(
    url: string,
    model: WeatherModel,
    attempt: number = 1
  ): Promise<WeatherDataResponse | null> {
    try {
      const params = this.createParams();
      const fullUrl = `${url}?${params}`;

      logger.info('weather_api_request', {
        model,
        attempt,
        url: fullUrl,
        location: TUTTLINGEN_LOCATION,
      });

      const response = await fetch(fullUrl, {
        cache: 'no-store',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Validierung
      const validation = this.validateWeatherData(data);

      if (!validation.valid) {
        logger.error('weather_data_validation_failed', {
          model,
          errors: validation.errors,
          warnings: validation.warnings,
        });
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        logger.warn('weather_data_warnings', {
          model,
          warnings: validation.warnings,
        });
      }

      logger.info('weather_api_success', {
        model,
        attempt,
        hours: data.hourly.time.length,
        warnings: validation.warnings.length,
      });

      return {
        data,
        model,
        source: model === 'ICON-D2' ? 'DWD ICON-D2' : 'ECMWF',
        timestamp: new Date().toISOString(),
        fallbackUsed: false,
        validationPassed: true,
      };

    } catch (error) {
      logger.error('weather_api_error', {
        model,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Hauptmethode: Hybrid-Abruf mit automatischem Fallback
   */
  async fetchWeatherData(): Promise<WeatherDataResponse> {
    // Versuch 1: ICON-D2 (primär)
    logger.info('weather_fetch_start', {
      primary: 'ICON-D2',
      fallback: 'ECMWF',
      location: TUTTLINGEN_LOCATION,
    });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const iconData = await this.fetchFromModel(ICON_D2_URL, 'ICON-D2', attempt);
      
      if (iconData) {
        logger.info('weather_primary_success', { model: 'ICON-D2', attempt });
        return iconData;
      }

      if (attempt < MAX_RETRIES) {
        logger.warn('weather_retry', { model: 'ICON-D2', attempt, nextAttempt: attempt + 1 });
        await this.delay(RETRY_DELAY_MS);
      }
    }

    // ICON-D2 fehlgeschlagen → Fallback zu ECMWF
    logger.warn('weather_fallback_activated', {
      primary: 'ICON-D2',
      fallback: 'ECMWF',
      reason: 'Primary model failed after retries',
    });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const ecmwfData = await this.fetchFromModel(ECMWF_URL, 'ECMWF', attempt);
      
      if (ecmwfData) {
        logger.info('weather_fallback_success', { model: 'ECMWF', attempt });
        return {
          ...ecmwfData,
          fallbackUsed: true,
          source: 'ECMWF [Fallback]',
        };
      }

      if (attempt < MAX_RETRIES) {
        await this.delay(RETRY_DELAY_MS);
      }
    }

    // Beide Modelle fehlgeschlagen
    logger.error('weather_all_sources_failed', {
      primary: 'ICON-D2',
      fallback: 'ECMWF',
      retries: MAX_RETRIES,
    });

    throw new Error('Alle Wetterdatenquellen nicht erreichbar (ICON-D2 und ECMWF)');
  }

  /**
   * Vergleicht ICON-D2 und ECMWF Daten (für Qualitätsprüfung)
   */
  async compareModels(): Promise<{
    icon: WeatherDataResponse | null;
    ecmwf: WeatherDataResponse | null;
    comparison: {
      temperatureDelta: number;
      humidityDelta: number;
      consistent: boolean;
    } | null;
  }> {
    const [icon, ecmwf] = await Promise.all([
      this.fetchFromModel(ICON_D2_URL, 'ICON-D2'),
      this.fetchFromModel(ECMWF_URL, 'ECMWF'),
    ]);

    if (!icon || !ecmwf) {
      return { icon, ecmwf, comparison: null };
    }

    // Vergleiche aktuelle Werte
    const iconTemp = icon.data.current?.temperature_2m || 0;
    const ecmwfTemp = ecmwf.data.current?.temperature_2m || 0;
    const iconHum = icon.data.current?.relative_humidity_2m || 0;
    const ecmwfHum = ecmwf.data.current?.relative_humidity_2m || 0;

    const tempDelta = Math.abs(iconTemp - ecmwfTemp);
    const humDelta = Math.abs(iconHum - ecmwfHum);

    const consistent = tempDelta <= 1.5 && humDelta <= 10;

    logger.info('weather_model_comparison', {
      temperatureDelta: tempDelta.toFixed(2),
      humidityDelta: humDelta.toFixed(1),
      consistent,
      threshold: 'ΔT≤1.5°C, ΔH≤10%',
    });

    return {
      icon,
      ecmwf,
      comparison: {
        temperatureDelta: tempDelta,
        humidityDelta: humDelta,
        consistent,
      },
    };
  }
}

export const weatherApiClient = new WeatherAPIClient();

/**
 * ECMWF API-Client mit Retry & Fallback-Mechanismus
 */

import { logger } from './logger';
import { dataValidator } from './dataValidator';
import { snapshotManager, Snapshot } from './snapshotManager';
import type { LocationData } from '@/types/fruktan';

const API_BASE_URL = 'https://api.open-meteo.com/v1/ecmwf';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

export interface APIResponse {
  data: any;
  source: string;
  integrity: 'ok' | 'degraded';
  apiSyncError: boolean;
  serviceUnavailable: boolean;
}

export class APIClient {
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchWeatherData(location: LocationData): Promise<APIResponse> {
    const params = new URLSearchParams({
      latitude: (location.latitude || location.lat).toString(),
      longitude: (location.longitude || location.lon).toString(),
      timezone: location.timezone || 'Europe/Berlin',
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

    const url = `${API_BASE_URL}?${params}`;

    // Try fetching with retries
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info('api_fetch_attempt', { attempt, maxRetries: MAX_RETRIES, url });

        const response = await fetch(url, {
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate data
        const validation = dataValidator.validateWeatherData(data);

        if (!validation.valid) {
          logger.error('api_data_invalid', {
            attempt,
            errors: validation.errors,
            warnings: validation.warnings,
          });

          if (attempt < MAX_RETRIES) {
            await this.delay(RETRY_DELAY_MS);
            continue;
          } else {
            throw new Error(`Datenvalidierung fehlgeschlagen: ${validation.errors.join(', ')}`);
          }
        }

        // Success - save snapshot
        snapshotManager.saveSnapshot(data, 'Open-Meteo (ECMWF)', 'ok');

        logger.info('api_fetch_success', {
          attempt,
          hours: data.hourly?.time?.length || 0,
          warnings: validation.warnings.length,
        });

        return {
          data,
          source: 'Open-Meteo (ECMWF)',
          integrity: 'ok',
          apiSyncError: false,
          serviceUnavailable: false,
        };

      } catch (error) {
        logger.error('api_fetch_failed', {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });

        if (attempt < MAX_RETRIES) {
          await this.delay(RETRY_DELAY_MS);
        }
      }
    }

    // All retries failed - try fallback
    logger.warn('api_all_retries_failed', { retries: MAX_RETRIES });
    return this.loadFallbackData();
  }

  private loadFallbackData(): APIResponse {
    const snapshot = snapshotManager.loadSnapshot();

    if (snapshot) {
      logger.info('api_fallback_activated', {
        snapshotAge: snapshotManager.getSnapshotAgeHours(snapshot).toFixed(1),
        source: snapshot.source,
      });

      return {
        data: snapshot.data,
        source: `${snapshot.source} [Fallback]`,
        integrity: 'degraded',
        apiSyncError: true,
        serviceUnavailable: false,
      };
    }

    // No fallback available
    logger.error('api_no_fallback_available', {});

    return {
      data: null,
      source: 'Nicht verfügbar',
      integrity: 'degraded',
      apiSyncError: true,
      serviceUnavailable: true,
    };
  }

  checkRecentFallbacks(): number {
    const recentFallbacks = logger.getRecentFallbacks(12);
    return recentFallbacks.length;
  }
}

export const apiClient = new APIClient();

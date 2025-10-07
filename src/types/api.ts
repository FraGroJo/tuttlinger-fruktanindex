/**
 * API-spezifische Typen
 */

export interface ECMWFResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current?: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    cloud_cover: number;
    wind_speed_10m: number;
    precipitation: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    shortwave_radiation: number[];
    cloud_cover: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    et0_fao_evapotranspiration: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export interface DataIntegrityStatus {
  valid: boolean;
  source: string;
  integrity: 'ok' | 'degraded';
  apiSyncError: boolean;
  serviceUnavailable: boolean;
  lastUpdate: string;
}

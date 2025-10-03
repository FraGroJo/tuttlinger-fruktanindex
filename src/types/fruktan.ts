/**
 * Fruktan-Matrix Typen
 * Zentrale Typdefinitionen für die Anwendung
 */

export type TimeSlot = "morning" | "noon" | "evening";
export type RiskLevel = "safe" | "moderate" | "high";

/**
 * Scoring-Konstanten
 * Diese Werte steuern die Berechnung des Fruktan-Risikos
 */
export const SCORING_CONSTANTS = {
  BASE: 20,
  FROST_BONUS: 30,
  COLD_BONUS: 15,
  
  // ET0-basierter Trockenstress
  ET0_MIN: 3.0,
  ET0_MAX: 6.0,
  ET0_MAX_SCORE: 15,
  
  // Zusätzliche Trockenstress-Faktoren
  DRY_PRECIP_THRESHOLD: 5,
  DRY_PRECIP_BONUS: 5,
  WIND_THRESHOLD: 6,
  WIND_BONUS: 5,
  MAX_DRYNESS_SCORE: 25,
  
  // Bewölkung
  CLOUD_HIGH: 85,
  CLOUD_MED: 50,
  CLOUD_HIGH_RELIEF: -15,
  CLOUD_MED_RELIEF: -7,
  
  // Diurnale Spanne
  DIURNAL_MIN: 5,
  DIURNAL_MAX: 15,
  DIURNAL_MAX_BOOST: 10,
  
  // Hitze-Entlastung
  HEAT_TEMP_THRESHOLD: 28,
  HEAT_PRECIP_THRESHOLD: 15,
  HEAT_ET0_THRESHOLD: 3.5,
  HEAT_RELIEF: -10,
  
  // Morgen-spezifisch
  MAX_MORNING_SUN: 20,
  LOW_HUMIDITY_THRESHOLD: 55,
  LOW_HUMIDITY_BOOST: 5,
  MORNING_COLD_STACK: 10,
  MORNING_FROST_STACK: 10,
} as const;

/**
 * Ampel-Schwellen
 */
export const RISK_THRESHOLDS = {
  STANDARD: {
    SAFE_MAX: 39,
    MODERATE_MAX: 69,
  },
  EMS: {
    SAFE_MAX: 29,
    MODERATE_MAX: 59,
  },
} as const;

/**
 * Zeitfenster-Definitionen (Stunden, lokale Zeit)
 */
export const TIME_WINDOWS = {
  MORNING: { start: 5, end: 11 },
  NOON: { start: 11, end: 16 },
  EVENING: { start: 16, end: 21 },
} as const;

/**
 * Standard-Koordinaten Tuttlingen
 */
export const DEFAULT_LOCATION = {
  name: "Tuttlingen",
  lat: 47.985,
  lon: 8.82,
  timezone: "Europe/Berlin",
} as const;

/**
 * Temperatur-Spektrum für ein Zeitfenster
 */
export interface TemperatureSpectrum {
  min: number;      // °C
  max: number;      // °C
  median: number;   // °C
  p10?: number;     // optional, 10. Perzentil
  p90?: number;     // optional, 90. Perzentil
}

/**
 * Quell-Metadaten
 */
export interface SourceMetadata {
  provider: string;              // "open-meteo"
  model: string;                 // "ECMWF", "GFS", oder "auto"
  model_run_time_utc: string;    // ISO timestamp
  data_timestamp_local: string;  // ISO timestamp in Europe/Berlin
}

/**
 * Parity-Hashes für Datenintegrität
 */
export interface ParityHashes {
  hourly_hash: string;   // SHA-256 über hourly-Zeitreihe
  windows_hash: string;  // SHA-256 über aggregierte Fensterwerte
  calc_hash: string;     // SHA-256 über Score-Berechnungs-Inputs
}

/**
 * Rohdaten für ein Zeitfenster
 */
export interface RawWindowData {
  temperatures: number[];        // °C
  relative_humidities: number[]; // %
  cloud_covers: number[];        // %
  precipitations: number[];      // mm
  wind_speeds: number[];         // km/h (direkt von Open-Meteo)
  radiations: number[];          // W/m²
  timestamps: string[];          // ISO timestamps
}

/**
 * Echtzeit-Bedingungen
 */
export interface CurrentConditions {
  as_of_local: string;          // "YYYY-MM-DDTHH:mm"
  temperature_now: number;       // °C
  relative_humidity_now: number; // %
  wind_speed_now: number;        // km/h (direkt von Open-Meteo)
  cloud_cover_now: number;       // %
  precipitation_now: number;     // mm/h
  apparent_temperature?: number; // optional "feels like"
}

/**
 * Zeitfenster-Score mit Begründung und Validierungs-Flags
 */
export interface TimeSlotScore {
  slot: TimeSlot;
  score: number;
  level: RiskLevel;
  reason: string;
  temperature_spectrum?: TemperatureSpectrum;
  raw?: RawWindowData;  // Rohdaten für Transparenz
  flags: string[]; // z.B. ["suspicious_jump", "radiation_cloud_inconsistency"]
  confidence: "normal" | "low";
}

/**
 * Tages-Matrix (3 Zeitfenster)
 */
export interface DayMatrix {
  date: string; // ISO-Format YYYY-MM-DD
  morning: TimeSlotScore;
  noon: TimeSlotScore;
  evening: TimeSlotScore;
}

/**
 * Wetter-Rohdaten für ein Zeitfenster
 */
export interface WeatherData {
  temperature_min: number;
  temperature_max: number;
  radiation_avg: number;
  cloud_cover_avg: number;
  precipitation_sum: number;
  wind_speed_avg: number;
  relative_humidity_avg: number;
  et0_avg: number;
}

/**
 * Fruktan-API-Response mit Metadaten und Validierung
 */
export interface FruktanResponse {
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  source: SourceMetadata;
  parity: ParityHashes;
  current?: CurrentConditions;
  fruktanNow?: {
    score: number;
    level: "safe" | "moderate" | "high";
  };
  today: DayMatrix;
  tomorrow: DayMatrix;
  dayAfterTomorrow: DayMatrix;
  dayThree: DayMatrix;
  generatedAt: string;
  emsMode: boolean;
  metadata: {
    dataSource: string; // z.B. "Open-Meteo ECMWF"
    modelRunTime: string; // UTC
    localTimestamp: string; // Europe/Berlin
    timezone: string;
  };
  flags: string[]; // globale Flags (z.B. "stale_data")
  confidence: "normal" | "low";
}

/**
 * Trend-Datenpunkt (stündlich)
 */
export interface TrendDataPoint {
  timestamp: string;
  temperature: number;
  radiation: number;
  score: number;
  level: RiskLevel;
  isFrost: boolean;
}

/**
 * Location-Daten
 */
export interface LocationData {
  name: string;
  lat: number;
  lon: number;
}

/**
 * Custom Hook: useFruktanData
 * Lädt und berechnet die Fruktan-Matrix-Daten mit Client-Side Caching (10 Min TTL)
 * Nutzt Open-Meteo API für echte Wetterdaten
 */

import { useState, useEffect } from "react";
import { type FruktanResponse, type DayMatrix, type TrendDataPoint, type LocationData, DEFAULT_LOCATION, type TemperatureSpectrum, type CurrentConditions, type RawWindowData, type SourceMetadata, type ParityHashes } from "@/types/fruktan";
import { calculateScore, getRiskLevel, generateReason, type ScoringInput } from "@/lib/scoring";

// Cache-Interface
interface CacheEntry {
  data: FruktanResponse;
  trendData: TrendDataPoint[];
  timestamp: number;
}

/**
 * Validierungs-Hilfsfunktionen
 */
function validateBounds(temp: number, rh: number, cloud: number, precip: number, wind: number): string[] {
  const flags: string[] = [];
  if (temp < -30 || temp > 45) flags.push("temp_out_of_bounds");
  if (rh < 0 || rh > 100) flags.push("rh_out_of_bounds");
  if (cloud < 0 || cloud > 100) flags.push("cloud_out_of_bounds");
  if (precip < 0) flags.push("precip_out_of_bounds");
  if (wind < 0 || wind > 60) flags.push("wind_out_of_bounds");
  return flags;
}

function checkSteps(prevTemp: number, currTemp: number, prevRh: number, currRh: number, prevWind: number, currWind: number): string[] {
  const flags: string[] = [];
  if (Math.abs(currTemp - prevTemp) > 8) flags.push("suspicious_temp_jump");
  if (Math.abs(currRh - prevRh) > 25) flags.push("suspicious_rh_jump");
  if (Math.abs(currWind - prevWind) > 15) flags.push("suspicious_wind_jump");
  return flags;
}

function checkRadiationCloudConsistency(radiation: number, cloud: number): string[] {
  // Hohe Strahlung (>500) bei sehr hoher Bewölkung (>95%) ist inkonsistent
  if (radiation > 500 && cloud > 95) {
    return ["radiation_cloud_inconsistency"];
  }
  return [];
}

/**
 * SHA-256 Hash-Funktion für Parity-Tracking
 */
async function sha256(data: any): Promise<string> {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  const msgBuffer = new TextEncoder().encode(jsonString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function computeTemperatureSpectrum(temps: number[]): TemperatureSpectrum {
  if (temps.length === 0) {
    return { min: 0, max: 0, median: 0 };
  }
  
  const sorted = [...temps].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  // Median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
  
  // Perzentile (optional)
  const p10Idx = Math.floor(sorted.length * 0.1);
  const p90Idx = Math.floor(sorted.length * 0.9);
  const p10 = sorted[p10Idx];
  const p90 = sorted[p90Idx];
  
  return { min, max, median, p10, p90 };
}

// Cache-Storage (10 Min TTL)
const CACHE_TTL = 10 * 60 * 1000; // 10 Minuten
let cache: Map<string, CacheEntry> = new Map();

/**
 * Lädt echte Wetterdaten von Open-Meteo API
 */
async function fetchWeatherData(location: LocationData, emsMode: boolean): Promise<FruktanResponse> {
  const { lat, lon } = location;
  const now = new Date();
  
  // Open-Meteo API URL mit allen benötigten Parametern
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    timezone: "Europe/Berlin",
    hourly: "temperature_2m,relative_humidity_2m,shortwave_radiation,cloud_cover,wind_speed_10m,precipitation,et0_fao_evapotranspiration",
    current: "temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,precipitation",
    daily: "temperature_2m_max,temperature_2m_min",
    past_days: "3",
    forecast_days: "3",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Parse hourly data
  const hourlyData = data.hourly;
  const hourlyTimes = hourlyData.time.map((t: string) => new Date(t));
  
  // Validierung & Flag-Sammlung
  const globalFlags: string[] = [];
  
  // Parse current conditions
  const currentData = data.current;
  const current: CurrentConditions = {
    as_of_local: currentData.time,
    temperature_now: currentData.temperature_2m,
    relative_humidity_now: currentData.relative_humidity_2m,
    wind_speed_now: currentData.wind_speed_10m / 3.6, // Convert km/h to m/s
    cloud_cover_now: currentData.cloud_cover,
    precipitation_now: currentData.precipitation,
  };
  
  // Validiere current vs. letzte hourly
  const lastHourlyTemp = hourlyData.temperature_2m[hourlyData.temperature_2m.length - 1];
  if (Math.abs(current.temperature_now - lastHourlyTemp) > 3) {
    globalFlags.push("current_mismatch");
  }

  // Berechne Source Metadata
  const dataTimestampLocal = hourlyData.time[hourlyData.time.length - 1];
  const dataAge = Math.round((now.getTime() - new Date(dataTimestampLocal).getTime()) / 60000);
  
  const sourceMetadata: SourceMetadata = {
    provider: "open-meteo",
    model: "ECMWF", // Open-Meteo verwendet standardmäßig ECMWF
    model_run_time_utc: now.toISOString(),
    data_timestamp_local: dataTimestampLocal,
    data_age_minutes: dataAge,
  };

  // Sammle alle hourly Daten für Parity-Hash
  const hourlyHash = await sha256({
    times: hourlyData.time,
    temperatures: hourlyData.temperature_2m,
    humidities: hourlyData.relative_humidity_2m,
    radiations: hourlyData.shortwave_radiation,
    clouds: hourlyData.cloud_cover,
    winds: hourlyData.wind_speed_10m,
    precipitations: hourlyData.precipitation,
    et0s: hourlyData.et0_fao_evapotranspiration,
  });
  
  // Finde Tagesgrenzen (00:00 lokale Zeit)
  const getTodayStart = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };
  
  const todayStart = getTodayStart();
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const dayAfterStart = new Date(todayStart);
  dayAfterStart.setDate(dayAfterStart.getDate() + 2);
  
  // Generiere Day-Matrix für einen Tag
  const generateDayMatrix = (dayStart: Date): DayMatrix => {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    // Filtere Stunden für diesen Tag
    const dayHours = hourlyTimes
      .map((time, idx) => ({ time, idx }))
      .filter(({ time }) => time >= dayStart && time < dayEnd);
    
    // Berechne Tagesmin/max
    const dayTemps = dayHours.map(({ idx }) => hourlyData.temperature_2m[idx]);
    const tempMin = Math.min(...dayTemps);
    const tempMax = Math.max(...dayTemps);
    
    // Letzte Nacht (00:00-05:00)
    const nightHours = dayHours.filter(({ time }) => time.getHours() < 5);
    const nightTemps = nightHours.map(({ idx }) => hourlyData.temperature_2m[idx]);
    const nightMin = nightTemps.length > 0 ? Math.min(...nightTemps) : tempMin;
    
    // Berechne 7-Tage-Aggregate (für precip und ET0)
    const sevenDaysAgo = new Date(dayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7DaysHours = hourlyTimes
      .map((time, idx) => ({ time, idx }))
      .filter(({ time }) => time >= sevenDaysAgo && time < dayStart);
    
    const precip_7d = last7DaysHours.reduce((sum, { idx }) => 
      sum + (hourlyData.precipitation[idx] || 0), 0);
    const et0_7d = last7DaysHours.reduce((sum, { idx }) => 
      sum + (hourlyData.et0_fao_evapotranspiration[idx] || 0), 0);
    const et0_7d_avg = last7DaysHours.length > 0 ? et0_7d / last7DaysHours.length : 0;
    
    // 3-Tage Wind-Durchschnitt
    const threeDaysAgo = new Date(dayStart);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const last3DaysHours = hourlyTimes
      .map((time, idx) => ({ time, idx }))
      .filter(({ time }) => time >= threeDaysAgo && time < dayStart);
    const wind_3d_avg = last3DaysHours.length > 0
      ? last3DaysHours.reduce((sum, { idx }) => sum + (hourlyData.wind_speed_10m[idx] || 0), 0) / last3DaysHours.length
      : 3;
    
    // Slot-spezifische Berechnung
    const slots: Array<{ slot: "morning" | "noon" | "evening"; start: number; end: number }> = [
      { slot: "morning", start: 5, end: 11 },
      { slot: "noon", start: 11, end: 16 },
      { slot: "evening", start: 16, end: 21 },
    ];
    
    const result: any = { date: dayStart.toISOString().split("T")[0] };
    
    slots.forEach(({ slot, start, end }) => {
      const slotHours = dayHours.filter(({ time }) => {
        const h = time.getHours();
        return h >= start && h < end;
      });
      
      if (slotHours.length === 0) {
        // Fallback für fehlende Daten
        result[slot] = {
          slot,
          score: 20,
          level: "green",
          reason: "Keine Daten verfügbar für dieses Zeitfenster",
          flags: ["missing_data"],
          confidence: "low",
        };
        return;
      }
      
      // Aggregiere Werte für dieses Slot
      const slotRadiation = slotHours.reduce((sum, { idx }) => 
        sum + (hourlyData.shortwave_radiation[idx] || 0), 0) / slotHours.length;
      const slotCloud = slotHours.reduce((sum, { idx }) => 
        sum + (hourlyData.cloud_cover[idx] || 0), 0) / slotHours.length;
      const slotRh = slotHours.reduce((sum, { idx }) => 
        sum + (hourlyData.relative_humidity_2m[idx] || 0), 0) / slotHours.length;
      
      // Temperatur-Spektrum für dieses Slot
      const slotTemps = slotHours.map(({ idx }) => hourlyData.temperature_2m[idx]);
      const temperature_spectrum = computeTemperatureSpectrum(slotTemps);
      
      // Rohdaten sammeln
      const rawData: RawWindowData = {
        temperatures: slotHours.map(({ idx }) => hourlyData.temperature_2m[idx]),
        relative_humidities: slotHours.map(({ idx }) => hourlyData.relative_humidity_2m[idx]),
        cloud_covers: slotHours.map(({ idx }) => hourlyData.cloud_cover[idx]),
        precipitations: slotHours.map(({ idx }) => hourlyData.precipitation[idx]),
        wind_speeds: slotHours.map(({ idx }) => hourlyData.wind_speed_10m[idx]),
        radiations: slotHours.map(({ idx }) => hourlyData.shortwave_radiation[idx] || 0),
        timestamps: slotHours.map(({ time }) => time.toISOString()),
      };
      
      // Check für sparse window
      const slotValidationFlags: string[] = [];
      if (slotHours.length < 2) {
        slotValidationFlags.push("sparse_window");
      }
      
      // Morning rH (06:00-10:00)
      const morningRhHours = dayHours.filter(({ time }) => {
        const h = time.getHours();
        return h >= 6 && h <= 10;
      });
      const rh_morning = morningRhHours.length > 0
        ? morningRhHours.reduce((sum, { idx }) => sum + (hourlyData.relative_humidity_2m[idx] || 0), 0) / morningRhHours.length
        : slotRh;
      
      const input: ScoringInput = {
        tempMin: nightMin,
        tempMax,
        radiationMorning: slotRadiation,
        cloudCoverSlot: slotCloud,
        precip_7d_sum: precip_7d,
        wind_3d_avg,
        relativeHumidityMorning: rh_morning,
        et0_7d_avg,
        slot,
      };
      
      const score = calculateScore(input);
      const level = getRiskLevel(score, emsMode);
      const reason = generateReason(input, score);
      
      // Validierung
      const validationFlags: string[] = [...slotValidationFlags];
      slotHours.forEach(({ idx }) => {
        const temp = hourlyData.temperature_2m[idx];
        const rh = hourlyData.relative_humidity_2m[idx];
        const cloud = hourlyData.cloud_cover[idx];
        const precip = hourlyData.precipitation[idx];
        const wind = hourlyData.wind_speed_10m[idx];
        
        validationFlags.push(...validateBounds(temp, rh, cloud, precip, wind));
      });
      
      // Check Strahlung vs. Wolken
      validationFlags.push(...checkRadiationCloudConsistency(slotRadiation, slotCloud));
      
      const confidence = validationFlags.length > 0 ? "low" : "normal";
      
      result[slot] = { 
        slot, 
        score, 
        level, 
        reason, 
        temperature_spectrum,
        raw: rawData,
        flags: validationFlags, 
        confidence 
      };
    });
    
    return result as DayMatrix;
  };
  
  // Generiere Matrizen für 3 Tage
  const today = generateDayMatrix(todayStart);
  const tomorrow = generateDayMatrix(tomorrowStart);
  const dayAfterTomorrow = generateDayMatrix(dayAfterStart);
  
  // Berechne Parity-Hashes
  const windowsData = {
    today: { morning: today.morning, noon: today.noon, evening: today.evening },
    tomorrow: { morning: tomorrow.morning, noon: tomorrow.noon, evening: tomorrow.evening },
    dayAfterTomorrow: { morning: dayAfterTomorrow.morning, noon: dayAfterTomorrow.noon, evening: dayAfterTomorrow.evening },
  };
  
  const windowsHash = await sha256(windowsData);
  
  // Calc-Hash über alle Scoring-Inputs (vereinfacht)
  const calcInputs = {
    windows: windowsData,
    constants: { base: 20, frost: 30, cold: 15 }, // Vereinfachte Konstanten
  };
  const calcHash = await sha256(calcInputs);
  
  const parityHashes: ParityHashes = {
    hourly_hash: hourlyHash,
    windows_hash: windowsHash,
    calc_hash: calcHash,
  };
  
  // Metadaten
  if (sourceMetadata.data_age_minutes > 90) {
    globalFlags.push("stale_data");
  }
  
  return {
    location: {
      name: location.name,
      lat: location.lat,
      lon: location.lon,
    },
    source: sourceMetadata,
    parity: parityHashes,
    current,
    today,
    tomorrow,
    dayAfterTomorrow,
    generatedAt: now.toISOString(),
    emsMode,
    metadata: {
      dataSource: "Open-Meteo ECMWF",
      modelRunTime: sourceMetadata.model_run_time_utc,
      localTimestamp: now.toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
      dataAgeMinutes: sourceMetadata.data_age_minutes,
      timezone: "Europe/Berlin",
    },
    flags: globalFlags,
    confidence: globalFlags.length > 0 ? "low" : "normal",
  };
}

/**
 * Lädt echte Trend-Daten von Open-Meteo (-72h bis +48h)
 */
async function fetchTrendData(location: LocationData, emsMode: boolean): Promise<TrendDataPoint[]> {
  const { lat, lon } = location;
  
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    timezone: "Europe/Berlin",
    hourly: "temperature_2m,shortwave_radiation,cloud_cover,precipitation",
    past_days: "3",
    forecast_days: "2",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.statusText}`);
  }

  const data = await response.json();
  const hourlyData = data.hourly;
  
  const trendData: TrendDataPoint[] = [];
  
  for (let i = 0; i < hourlyData.time.length; i++) {
    const timestamp = new Date(hourlyData.time[i]);
    const temperature = hourlyData.temperature_2m[i];
    const radiation = hourlyData.shortwave_radiation[i] || 0;
    const cloudCover = hourlyData.cloud_cover[i] || 0;
    const isFrost = temperature <= 0;
    
    // Vereinfachter Score für Trend
    let score = 20; // Base
    if (temperature <= 0) score += 30;
    if (temperature <= 5) score += 15;
    
    const hour = timestamp.getHours();
    if (hour >= 5 && hour <= 11 && temperature <= 5 && radiation > 300) {
      score += 25;
    }
    score += Math.min(20, radiation / 40);
    
    score = Math.max(0, Math.min(100, Math.round(score)));
    const level = getRiskLevel(score, emsMode);
    
    trendData.push({
      timestamp: timestamp.toISOString(),
      temperature,
      radiation,
      score,
      level,
      isFrost,
    });
  }
  
  return trendData;
}

export function useFruktanData(emsMode: boolean, location: LocationData = DEFAULT_LOCATION) {
  const [data, setData] = useState<FruktanResponse | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cache-Key basierend auf Location und EMS-Modus
    const cacheKey = `${location.lat},${location.lon},${emsMode}`;
    
    // Prüfe Cache
    const cached = cache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      // Cache-Hit: Daten sofort verfügbar
      setData(cached.data);
      setTrendData(cached.trendData);
      setLoading(false);
      return;
    }

    // Cache-Miss oder expired: Neue Daten laden
    setLoading(true);
    setError(null);

    // Lade echte Daten von Open-Meteo
    Promise.all([
      fetchWeatherData(location, emsMode),
      fetchTrendData(location, emsMode)
    ])
      .then(([weatherData, trend]) => {
        // Speichere im Cache
        cache.set(cacheKey, {
          data: weatherData,
          trendData: trend,
          timestamp: Date.now(),
        });
        
        setData(weatherData);
        setTrendData(trend);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Wetterdaten:", err);
        setError("Fehler beim Laden der Wetterdaten von Open-Meteo");
        setLoading(false);
      });
  }, [emsMode, location.lat, location.lon, location.name]);

  return { data, trendData, loading, error };
}

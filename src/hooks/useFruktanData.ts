/**
 * Custom Hook: useFruktanData
 * Lädt und berechnet die Fruktan-Matrix-Daten mit Client-Side Caching (10 Min TTL)
 * Nutzt Open-Meteo API für echte Wetterdaten
 */

import { useState, useEffect } from "react";
import { calculatePastureAdjustments, isPastureDataValid, type PastureData } from "@/types/pasture";
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

/**
 * Berechnet Temperatur-Spektrum mit exakter Perzentil-Methode (keine Rundung)
 * Basis: Nur hourly.temperature_2m Werte aus dem Zeitfenster
 */
function computeTemperatureSpectrum(temps: number[]): TemperatureSpectrum {
  if (temps.length === 0) {
    return { min: 0, max: 0, median: 0 };
  }
  
  if (temps.length === 1) {
    return { min: temps[0], max: temps[0], median: temps[0], p10: temps[0], p90: temps[0] };
  }
  
  const sorted = [...temps].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  // Echter Median (50. Perzentil)
  const mid = sorted.length / 2;
  const median = sorted.length % 2 === 0
    ? (sorted[Math.floor(mid) - 1] + sorted[Math.floor(mid)]) / 2
    : sorted[Math.floor(mid)];
  
  // Lineare Interpolation für Perzentile
  const getPercentile = (arr: number[], p: number): number => {
    const index = (arr.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return arr[lower] * (1 - weight) + arr[upper] * weight;
  };
  
  const p10 = getPercentile(sorted, 0.1);
  const p90 = getPercentile(sorted, 0.9);
  
  return { min, max, median, p10, p90 };
}

// Leichter Cache (nur 60s Debounce für Rate-Limiting)
const CACHE_TTL = 60 * 1000; // 60 Sekunden
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
    forecast_days: "7",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url, { cache: 'no-store' });
  
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  // Parse hourly data (timestamps are already in Europe/Berlin from API)
  const hourlyData = data.hourly;
  const hourlyTimes = hourlyData.time; // Keep as ISO strings initially for correct TZ handling
  
  // Validierung & Flag-Sammlung
  const globalFlags: string[] = [];
  
  // Parse current conditions
  const currentData = data.current;
  const current: CurrentConditions = {
    as_of_local: currentData.time,
    temperature_now: currentData.temperature_2m,
    relative_humidity_now: currentData.relative_humidity_2m,
    wind_speed_now: currentData.wind_speed_10m, // Already in km/h from API
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
  
  // Get current date in Europe/Berlin timezone (strict local bucketing)
  const getTodayInBerlin = (): string => {
    const berlinTime = new Date().toLocaleString("en-CA", { 
      timeZone: "Europe/Berlin", 
      year: "numeric", 
      month: "2-digit", 
      day: "2-digit" 
    });
    return berlinTime.split(',')[0]; // Returns YYYY-MM-DD
  };
  
  const todayDate = getTodayInBerlin();
  const tomorrowDate = new Date(todayDate + 'T12:00:00+02:00');
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowDateStr = tomorrowDate.toISOString().split('T')[0];
  
  const dayAfterDate = new Date(todayDate + 'T12:00:00+02:00');
  dayAfterDate.setDate(dayAfterDate.getDate() + 2);
  const dayAfterDateStr = dayAfterDate.toISOString().split('T')[0];
  
  const dayThreeDate = new Date(todayDate + 'T12:00:00+02:00');
  dayThreeDate.setDate(dayThreeDate.getDate() + 3);
  const dayThreeDateStr = dayThreeDate.toISOString().split('T')[0];
  
  const dayFourDate = new Date(todayDate + 'T12:00:00+02:00');
  dayFourDate.setDate(dayFourDate.getDate() + 4);
  const dayFourDateStr = dayFourDate.toISOString().split('T')[0];
  
  const dayFiveDate = new Date(todayDate + 'T12:00:00+02:00');
  dayFiveDate.setDate(dayFiveDate.getDate() + 5);
  const dayFiveDateStr = dayFiveDate.toISOString().split('T')[0];
  
  const daySixDate = new Date(todayDate + 'T12:00:00+02:00');
  daySixDate.setDate(daySixDate.getDate() + 6);
  const daySixDateStr = daySixDate.toISOString().split('T')[0];
  
  // Generiere Day-Matrix für einen Tag (strict local date string matching)
  const generateDayMatrix = (targetDateStr: string): DayMatrix => {
    // Filter hours that match the target date string (YYYY-MM-DD)
    // Since Open-Meteo returns timestamps in Europe/Berlin, we extract the date portion
    const dayHours = hourlyTimes
      .map((timeStr: string, idx: number) => {
        const dateStr = timeStr.split('T')[0]; // Extract YYYY-MM-DD
        return { timeStr, dateStr, idx };
      })
      .filter(({ dateStr }) => dateStr === targetDateStr);
    
    // Berechne Tagesmin/max (nur aus hourly für diesen lokalen Tag)
    const dayTemps = dayHours.map(({ idx }) => hourlyData.temperature_2m[idx]).filter(t => !isNaN(t));
    const tempMin = dayTemps.length > 0 ? Math.min(...dayTemps) : 0;
    const tempMax = dayTemps.length > 0 ? Math.max(...dayTemps) : 0;
    
    // Letzte Nacht (00:00-05:00 lokal)
    const nightHours = dayHours.filter(({ timeStr }) => {
      const hour = parseInt(timeStr.split('T')[1].substring(0, 2), 10);
      return hour >= 0 && hour < 5;
    });
    const nightTemps = nightHours.map(({ idx }) => hourlyData.temperature_2m[idx]).filter(t => !isNaN(t));
    const nightMin = nightTemps.length > 0 ? Math.min(...nightTemps) : tempMin;
    
    // Berechne 7-Tage-Aggregate (für precip und ET0)
    const targetDate = new Date(targetDateStr + 'T12:00:00+02:00');
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const last7DaysHours = hourlyTimes
      .map((timeStr: string, idx: number) => {
        const dateStr = timeStr.split('T')[0];
        return { dateStr, idx };
      })
      .filter(({ dateStr }) => dateStr >= sevenDaysAgoStr && dateStr < targetDateStr);
    
    const precip_7d = last7DaysHours.reduce((sum, { idx }) => 
      sum + (hourlyData.precipitation[idx] || 0), 0);
    
    // ET0 ist in mm pro Stunde, aufsummieren für 7 Tage und durch 7 teilen = mm/Tag Durchschnitt
    const et0_7d_total = last7DaysHours.reduce((sum, { idx }) => 
      sum + (hourlyData.et0_fao_evapotranspiration[idx] || 0), 0);
    const days7 = last7DaysHours.length / 24; // Umrechnung Stunden -> Tage
    const et0_7d_avg = days7 > 0 ? et0_7d_total / days7 : 0;
    console.log(`[DAY MATRIX ${targetDateStr}] ET0 7d: total=${et0_7d_total.toFixed(2)}mm, days=${days7}, avg=${et0_7d_avg.toFixed(2)}mm/day, hours=${last7DaysHours.length}`);
    
    // 3-Tage Wind-Durchschnitt
    const threeDaysAgo = new Date(targetDate);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
    
    const last3DaysHours = hourlyTimes
      .map((timeStr: string, idx: number) => {
        const dateStr = timeStr.split('T')[0];
        return { dateStr, idx };
      })
      .filter(({ dateStr }) => dateStr >= threeDaysAgoStr && dateStr < targetDateStr);
    const wind_3d_avg = last3DaysHours.length > 0
      ? last3DaysHours.reduce((sum, { idx }) => sum + (hourlyData.wind_speed_10m[idx] || 0), 0) / last3DaysHours.length
      : 3;
    
    // Slot-spezifische Berechnung (strikt lokal, Europe/Berlin)
    // Morning: 05:00-10:59, Noon: 11:00-15:59, Evening: 16:00-21:00
    const slots: Array<{ slot: "morning" | "noon" | "evening"; start: number; end: number }> = [
      { slot: "morning", start: 5, end: 10 },   // 05:00-10:59 (end hour inclusive with minutes < 60)
      { slot: "noon", start: 11, end: 15 },     // 11:00-15:59
      { slot: "evening", start: 16, end: 21 },  // 16:00-21:00 (21:00 included, not 21:59)
    ];
    
    const result: any = { date: targetDateStr };
    
    slots.forEach(({ slot, start, end }) => {
      // Strikt: Stunden im Fenster [start, end] inklusiv (lokal)
      // Morning 05:00-10:59 = hours 5,6,7,8,9,10
      // Noon 11:00-15:59 = hours 11,12,13,14,15
      // Evening 16:00-21:00 = hours 16,17,18,19,20,21 (nur 21:00, nicht 21:59)
      const slotHours = dayHours.filter(({ timeStr }) => {
        const timePart = timeStr.split('T')[1]; // HH:MM:SS format
        const h = parseInt(timePart.substring(0, 2), 10);
        const m = parseInt(timePart.substring(3, 5), 10);
        // Include hour if: h >= start AND (h < end OR (h === end AND m === 0))
        if (h < start) return false;
        if (h < end) return true;
        if (h === end && m === 0) return true;
        return false;
      });
      
      if (slotHours.length === 0) {
        // Fallback für fehlende Daten - keine Darstellung
        result[slot] = {
          slot,
          score: 20,
          level: "safe",
          reason: "Keine Stundenwerte verfügbar für dieses Zeitfenster.",
          temperature_spectrum: { min: 0, max: 0, median: 0 },
          raw: {
            temperatures: [],
            relative_humidities: [],
            cloud_covers: [],
            precipitations: [],
            wind_speeds: [],
            radiations: [],
            timestamps: [],
          },
          flags: ["missing_data"],
          confidence: "low",
        };
        return;
      }
      
      // Check für sparse window (<2 Stunden)
      const slotValidationFlags: string[] = [];
      if (slotHours.length < 2) {
        slotValidationFlags.push("sparse_window");
      }
      
      // Aggregiere Werte für dieses Slot (nur aus hourly!)
      const slotRadiation = slotHours.reduce((sum, { idx }) => 
        sum + (hourlyData.shortwave_radiation[idx] || 0), 0) / slotHours.length;
      const slotCloud = slotHours.reduce((sum, { idx }) => 
        sum + (hourlyData.cloud_cover[idx] || 0), 0) / slotHours.length;
      const slotRh = slotHours.reduce((sum, { idx }) => 
        sum + (hourlyData.relative_humidity_2m[idx] || 0), 0) / slotHours.length;
      
      // Temperatur-Spektrum AUSSCHLIESSLICH aus hourly.temperature_2m
      // KEIN daily mixing!
      const slotTemps = slotHours.map(({ idx }) => hourlyData.temperature_2m[idx]).filter(t => !isNaN(t));
      const temperature_spectrum = slotTemps.length >= 1 
        ? computeTemperatureSpectrum(slotTemps)
        : { min: 0, max: 0, median: 0 };
      
      // Rohdaten sammeln (unveränderbar, keine Glättung)
      const rawData: RawWindowData = {
        temperatures: slotHours.map(({ idx }) => hourlyData.temperature_2m[idx]),
        relative_humidities: slotHours.map(({ idx }) => hourlyData.relative_humidity_2m[idx]),
        cloud_covers: slotHours.map(({ idx }) => hourlyData.cloud_cover[idx]),
        precipitations: slotHours.map(({ idx }) => hourlyData.precipitation[idx]),
        wind_speeds: slotHours.map(({ idx }) => hourlyData.wind_speed_10m[idx]),
        radiations: slotHours.map(({ idx }) => hourlyData.shortwave_radiation[idx] || 0),
        timestamps: slotHours.map(({ timeStr }) => timeStr),
      };
      
      // Morning rH (06:00-10:00 lokal)
      const morningRhHours = dayHours.filter(({ timeStr }) => {
        const h = parseInt(timeStr.split('T')[1].substring(0, 2), 10);
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
        date: new Date(targetDateStr), // Datum für Jahreszeit-Anpassung
      };
      
      // Weidestand-Anpassungen laden (falls vorhanden und noch gültig)
      const pastureDataStr = localStorage.getItem("pastureData");
      let pastureMultiplier = 1.0;
      let pastureOffset = 0;
      let pastureReasons: string[] = [];
      
      if (pastureDataStr) {
        try {
          const pastureData: PastureData = JSON.parse(pastureDataStr);
          
          // Prüfe, ob Daten noch gültig sind (max. 7 Tage alt)
          if (isPastureDataValid(pastureData)) {
            const adjustments = calculatePastureAdjustments(pastureData);
            pastureMultiplier = adjustments.multiplier;
            pastureOffset = adjustments.offset;
            pastureReasons = adjustments.reason;
          } else {
            // Daten sind abgelaufen - markiere dies
            pastureReasons.push("⚠️ Weidestand-Daten abgelaufen (>7 Tage alt)");
          }
        } catch (e) {
          console.warn("Failed to parse pasture data", e);
        }
      }
      
      const score = calculateScore(input, pastureMultiplier, pastureOffset);
      const level = getRiskLevel(score, emsMode);
      let reason = generateReason(input, score);
      
      // Weidestand-Gründe anhängen
      if (pastureReasons.length > 0) {
        reason += "\n\nWeidestand-Anpassungen: " + pastureReasons.join(", ");
      }
      
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
  
  // Generiere Matrizen für 7 Tage (strict local date strings)
  const today = generateDayMatrix(todayDate);
  const tomorrow = generateDayMatrix(tomorrowDateStr);
  const dayAfterTomorrow = generateDayMatrix(dayAfterDateStr);
  const dayThree = generateDayMatrix(dayThreeDateStr);
  const dayFour = generateDayMatrix(dayFourDateStr);
  const dayFive = generateDayMatrix(dayFiveDateStr);
  const daySix = generateDayMatrix(daySixDateStr);
  
  // Berechne Parity-Hashes
  const windowsData = {
    today: { morning: today.morning, noon: today.noon, evening: today.evening },
    tomorrow: { morning: tomorrow.morning, noon: tomorrow.noon, evening: tomorrow.evening },
    dayAfterTomorrow: { morning: dayAfterTomorrow.morning, noon: dayAfterTomorrow.noon, evening: dayAfterTomorrow.evening },
    dayThree: { morning: dayThree.morning, noon: dayThree.noon, evening: dayThree.evening },
    dayFour: { morning: dayFour.morning, noon: dayFour.noon, evening: dayFour.evening },
    dayFive: { morning: dayFive.morning, noon: dayFive.noon, evening: dayFive.evening },
    daySix: { morning: daySix.morning, noon: daySix.noon, evening: daySix.evening },
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
  
  // Calculate fruktan_now from current conditions and today's data
  const localHour = parseInt(now.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Europe/Berlin" }));
  let currentSlot: "morning" | "noon" | "evening" = "morning";
  if (localHour >= 11 && localHour < 16) currentSlot = "noon";
  else if (localHour >= 16 && localHour <= 21) currentSlot = "evening";
  
  const fruktanNow = {
    score: today[currentSlot].score,
    level: today[currentSlot].level as "safe" | "moderate" | "high"
  };
  
  return {
    location: {
      name: location.name,
      lat: location.lat,
      lon: location.lon,
    },
    source: sourceMetadata,
    parity: parityHashes,
    current,
    fruktanNow,
    today,
    tomorrow,
    dayAfterTomorrow,
    dayThree,
    dayFour,
    dayFive,
    daySix,
    generatedAt: now.toISOString(),
    emsMode,
    metadata: {
      dataSource: "Open-Meteo ECMWF",
      modelRunTime: sourceMetadata.model_run_time_utc,
      localTimestamp: now.toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
      timezone: "Europe/Berlin",
    },
    flags: globalFlags,
    confidence: today.morning.confidence === "low" || today.noon.confidence === "low" || today.evening.confidence === "low" ? "low" : "normal",
  };
}

/**
 * Lädt echte Trend-Daten von Open-Meteo (-72h bis +168h) mit vollständiger Scoring-Logik
 */
async function fetchTrendData(location: LocationData, emsMode: boolean): Promise<TrendDataPoint[]> {
  const { lat, lon } = location;
  
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    timezone: "Europe/Berlin",
    hourly: "temperature_2m,relative_humidity_2m,shortwave_radiation,cloud_cover,wind_speed_10m,precipitation,et0_fao_evapotranspiration",
    past_days: "3",
    forecast_days: "7",
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const response = await fetch(url, { cache: 'no-store' });
  
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.statusText}`);
  }

  const data = await response.json();
  const hourlyData = data.hourly;
  const hourlyTimes = hourlyData.time;
  
  const trendData: TrendDataPoint[] = [];
  
  for (let i = 0; i < hourlyTimes.length; i++) {
    const timestamp = new Date(hourlyTimes[i]);
    const temperature = hourlyData.temperature_2m[i];
    const radiation = hourlyData.shortwave_radiation[i] || 0;
    const cloudCover = hourlyData.cloud_cover[i] || 0;
    const relativeHumidity = hourlyData.relative_humidity_2m[i] || 70;
    const isFrost = temperature <= 0;
    
    // Berechne tempMin und tempMax für diesen Tag
    const dateStr = hourlyTimes[i].split('T')[0];
    const dayHours = hourlyTimes
      .map((timeStr: string, idx: number) => ({ timeStr, idx }))
      .filter(({ timeStr }) => timeStr.split('T')[0] === dateStr);
    
    const dayTemps = dayHours.map(({ idx }) => hourlyData.temperature_2m[idx]).filter(t => !isNaN(t));
    const tempMin = dayTemps.length > 0 ? Math.min(...dayTemps) : temperature;
    const tempMax = dayTemps.length > 0 ? Math.max(...dayTemps) : temperature;
    
    // Berechne 7-Tage Aggregate (ET0 & Niederschlag)
    const targetDate = new Date(dateStr + 'T12:00:00+02:00');
    const sevenDaysAgo = new Date(targetDate);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    
    const last7DaysHours = hourlyTimes
      .map((timeStr: string, idx: number) => ({ dateStr: timeStr.split('T')[0], idx }))
      .filter(({ dateStr }) => dateStr >= sevenDaysAgoStr && dateStr < dateStr);
    
    const precip_7d = last7DaysHours.reduce((sum, { idx }) => 
      sum + (hourlyData.precipitation[idx] || 0), 0);
    
    // ET0 ist in mm pro Stunde, aufsummieren für 7 Tage und durch 7 teilen = mm/Tag Durchschnitt
    const et0_7d_total = last7DaysHours.reduce((sum, { idx }) => 
      sum + (hourlyData.et0_fao_evapotranspiration[idx] || 0), 0);
    const days7 = last7DaysHours.length / 24;
    const et0_7d_avg = days7 > 0 ? et0_7d_total / days7 : 0;
    console.log(`[TREND ${hourlyTimes[i]}] ET0 7d: total=${et0_7d_total.toFixed(2)}mm, days=${days7}, avg=${et0_7d_avg.toFixed(2)}mm/day`);
    
    // 3-Tage Wind-Durchschnitt
    const threeDaysAgo = new Date(targetDate);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
    
    const last3DaysHours = hourlyTimes
      .map((timeStr: string, idx: number) => ({ dateStr: timeStr.split('T')[0], idx }))
      .filter(({ dateStr }) => dateStr >= threeDaysAgoStr && dateStr < dateStr);
    const wind_3d_avg = last3DaysHours.length > 0
      ? last3DaysHours.reduce((sum, { idx }) => sum + (hourlyData.wind_speed_10m[idx] || 0), 0) / last3DaysHours.length
      : 3;
    
    // Bestimme Zeitfenster
    const hour = timestamp.getHours();
    let slot: "morning" | "noon" | "evening" = "morning";
    if (hour >= 11 && hour < 16) slot = "noon";
    else if (hour >= 16 && hour <= 21) slot = "evening";
    
    // Vollständige Scoring-Logik verwenden
    const input: ScoringInput = {
      tempMin,
      tempMax,
      radiationMorning: radiation,
      cloudCoverSlot: cloudCover,
      precip_7d_sum: precip_7d,
      wind_3d_avg,
      relativeHumidityMorning: relativeHumidity,
      et0_7d_avg,
      slot,
      date: timestamp, // Datum für Jahreszeit-Anpassung
    };
    
    const score = calculateScore(input, 1.0, 0);
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
  const [isInitialMount, setIsInitialMount] = useState(true);

  useEffect(() => {
    // Cache-Key basierend auf Location und EMS-Modus
    const cacheKey = `${location.lat},${location.lon},${emsMode}`;
    
    // Prüfe Cache (nur 60s Debounce für Rate-Limiting)
    const cached = cache.get(cacheKey);
    const now = Date.now();
    
    // Beim ersten Mount IMMER frische Daten laden (Seitenaufruf)
    // Bei nachfolgenden Mounts nur wenn Cache abgelaufen ist (Navigation)
    const shouldFetch = isInitialMount || !cached || (now - cached.timestamp) >= CACHE_TTL;
    
    if (!shouldFetch) {
      // Debounce-Hit: Verwende gecachte Daten (nur bei Navigation, nicht bei initialem Seitenaufruf)
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
        setIsInitialMount(false); // Nach erstem Laden nicht mehr als initial behandeln
      })
      .catch((err) => {
        console.error("Fehler beim Laden der Wetterdaten:", err);
        setError("Fehler beim Laden der Wetterdaten von Open-Meteo");
        setLoading(false);
      });
  }, [emsMode, location.lat, location.lon, location.name]);

  return { data, trendData, loading, error };
}

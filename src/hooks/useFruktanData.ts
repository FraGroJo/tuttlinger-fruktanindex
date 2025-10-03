/**
 * Custom Hook: useFruktanData
 * Lädt und berechnet die Fruktan-Matrix-Daten mit Client-Side Caching (10 Min TTL)
 * 
 * WICHTIG: Dies ist eine Mock-Implementierung für die UI-Demonstration.
 * In der finalen Version wird hier Lovable Cloud mit Edge Functions genutzt.
 */

import { useState, useEffect } from "react";
import { type FruktanResponse, type DayMatrix, type TrendDataPoint, type LocationData, DEFAULT_LOCATION } from "@/types/fruktan";
import { calculateScore, getRiskLevel, generateReason, type ScoringInput } from "@/lib/scoring";

// Cache-Interface
interface CacheEntry {
  data: FruktanResponse;
  trendData: TrendDataPoint[];
  timestamp: number;
}

// Cache-Storage (10 Min TTL)
const CACHE_TTL = 10 * 60 * 1000; // 10 Minuten
let cache: Map<string, CacheEntry> = new Map();

/**
 * Generiert Mock-Wetterdaten für Demo-Zwecke
 */
function generateMockData(emsMode: boolean, location: LocationData): FruktanResponse {
  const now = new Date();
  
  // Simuliere verschiedene Wetter-Szenarien für die drei Tage
  const scenarios = [
    {
      // Heute: Kalte Nacht + sonniger Morgen (hohes Risiko)
      tempMin: 2,
      tempMax: 18,
      radiationMorning: 650,
      cloudCover: 20,
      precip_7d: 3,
      wind_3d: 7,
      rh_morning: 52,
      et0_7d: 5.8,
    },
    {
      // Morgen: Moderate Bedingungen
      tempMin: 8,
      tempMax: 22,
      radiationMorning: 450,
      cloudCover: 45,
      precip_7d: 8,
      wind_3d: 4,
      rh_morning: 65,
      et0_7d: 4.2,
    },
    {
      // Übermorgen: Bewölkt und feucht (geringes Risiko)
      tempMin: 12,
      tempMax: 19,
      radiationMorning: 250,
      cloudCover: 85,
      precip_7d: 18,
      wind_3d: 3,
      rh_morning: 78,
      et0_7d: 2.8,
    },
  ];

  const generateDayMatrix = (dayOffset: number, scenario: typeof scenarios[0]): DayMatrix => {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    
    const slots: Array<{ slot: "morning" | "noon" | "evening"; cloudMod: number }> = [
      { slot: "morning", cloudMod: 0 },
      { slot: "noon", cloudMod: -5 },
      { slot: "evening", cloudMod: 10 },
    ];

    const result: any = { date: date.toISOString().split("T")[0] };

    slots.forEach(({ slot, cloudMod }) => {
      const input: ScoringInput = {
        tempMin: scenario.tempMin,
        tempMax: scenario.tempMax,
        radiationMorning: scenario.radiationMorning,
        cloudCoverSlot: Math.max(0, Math.min(100, scenario.cloudCover + cloudMod)),
        precip_7d_sum: scenario.precip_7d,
        wind_3d_avg: scenario.wind_3d,
        relativeHumidityMorning: scenario.rh_morning,
        et0_7d_avg: scenario.et0_7d,
        slot,
      };

      const score = calculateScore(input);
      const level = getRiskLevel(score, emsMode);
      const reason = generateReason(input, score);

      result[slot] = { slot, score, level, reason };
    });

    return result as DayMatrix;
  };

  return {
    location: {
      name: location.name,
      lat: location.lat,
      lon: location.lon,
    },
    today: generateDayMatrix(0, scenarios[0]),
    tomorrow: generateDayMatrix(1, scenarios[1]),
    dayAfterTomorrow: generateDayMatrix(2, scenarios[2]),
    generatedAt: now.toISOString(),
    emsMode,
  };
}

/**
 * Generiert Mock-Trend-Daten (-72h bis +48h, stündlich)
 */
function generateMockTrendData(emsMode: boolean): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  const now = new Date();
  
  // -72h bis +48h = 120 Stunden
  for (let i = -72; i <= 48; i++) {
    const timestamp = new Date(now.getTime() + i * 60 * 60 * 1000);
    
    // Simuliere Temperaturverlauf (Tag/Nacht-Zyklus)
    const hour = timestamp.getHours();
    const dayProgress = Math.sin((hour - 6) * Math.PI / 12); // Peak um 14 Uhr
    const baseTemp = 12 + dayProgress * 8;
    
    // Füge Variation über Tage hinzu
    const dayOffset = Math.floor(i / 24);
    const tempVariation = Math.sin(dayOffset * Math.PI / 3) * 3;
    const temperature = baseTemp + tempVariation;
    
    // Simuliere Strahlung (nur tagsüber)
    const radiation = hour >= 6 && hour <= 20 
      ? Math.max(0, 400 + dayProgress * 400 + Math.random() * 100)
      : 0;
    
    // Frost-Flag
    const isFrost = temperature <= 0;
    
    // Berechne vereinfachten Score basierend auf Temperatur und Strahlung
    let score = 20; // Base
    if (temperature <= 0) score += 30; // Frost
    if (temperature <= 5) score += 15; // Kalt
    if (hour >= 5 && hour <= 11 && temperature <= 5 && radiation > 300) {
      score += 25; // Kalter sonniger Morgen
    }
    score += Math.min(20, radiation / 40); // Strahlungseffekt
    
    // Clamp
    score = Math.max(0, Math.min(100, Math.round(score)));
    
    const level = getRiskLevel(score, emsMode);
    
    data.push({
      timestamp: timestamp.toISOString(),
      temperature,
      radiation,
      score,
      level,
      isFrost,
    });
  }
  
  return data;
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

    const timer = setTimeout(() => {
      try {
        const mockData = generateMockData(emsMode, location);
        const mockTrend = generateMockTrendData(emsMode);
        
        // Speichere im Cache
        cache.set(cacheKey, {
          data: mockData,
          trendData: mockTrend,
          timestamp: Date.now(),
        });
        
        setData(mockData);
        setTrendData(mockTrend);
      } catch (err) {
        setError("Fehler beim Laden der Daten");
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [emsMode, location.lat, location.lon, location.name]);

  return { data, trendData, loading, error };
}

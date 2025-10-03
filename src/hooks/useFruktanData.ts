/**
 * Custom Hook: useFruktanData
 * Lädt und berechnet die Fruktan-Matrix-Daten
 * 
 * WICHTIG: Dies ist eine Mock-Implementierung für die UI-Demonstration.
 * In der finalen Version wird hier Lovable Cloud mit Edge Functions genutzt.
 */

import { useState, useEffect } from "react";
import { type FruktanResponse, type DayMatrix, DEFAULT_LOCATION } from "@/types/fruktan";
import { calculateScore, getRiskLevel, generateReason, type ScoringInput } from "@/lib/scoring";

/**
 * Generiert Mock-Wetterdaten für Demo-Zwecke
 */
function generateMockData(emsMode: boolean): FruktanResponse {
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
      name: DEFAULT_LOCATION.name,
      lat: DEFAULT_LOCATION.lat,
      lon: DEFAULT_LOCATION.lon,
    },
    today: generateDayMatrix(0, scenarios[0]),
    tomorrow: generateDayMatrix(1, scenarios[1]),
    dayAfterTomorrow: generateDayMatrix(2, scenarios[2]),
    generatedAt: now.toISOString(),
    emsMode,
  };
}

export function useFruktanData(emsMode: boolean) {
  const [data, setData] = useState<FruktanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simuliere API-Aufruf
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      try {
        const mockData = generateMockData(emsMode);
        setData(mockData);
      } catch (err) {
        setError("Fehler beim Laden der Daten");
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [emsMode]);

  return { data, loading, error };
}

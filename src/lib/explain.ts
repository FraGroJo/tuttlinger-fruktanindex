/**
 * Erklärbarkeit & Beitrags-Analyse
 * V25: Transparenz - Input → Beitrag → Score
 */

import { getParam } from "./params";
import type { TimeSlot } from "@/types/fruktan";

export interface ContributionVector {
  temp: number;
  radiation: number;
  humidity: number;
  cloud: number;
  wind: number;
  frost: number;
  dryness: number;
  diurnal: number;
  heatRelief: number;
  total: number;
}

export interface ExplanationData {
  slot: TimeSlot;
  score: number;
  contributions: ContributionVector;
  formulaVersion: string;
  paramsVersion: string;
  factors: {
    key: string;
    label: string;
    value: number;
    contribution: number;
    unit?: string;
  }[];
}

/**
 * Berechnet Beiträge einzelner Parameter zum Score
 */
export function calculateContributions(input: {
  tempMin: number;
  tempMax: number;
  radiationMorning: number;
  cloudCoverSlot: number;
  precip_7d_sum: number;
  wind_3d_avg: number;
  relativeHumidityMorning: number;
  et0_7d_avg: number;
  slot: TimeSlot;
  date?: Date;
}): ContributionVector {
  const { tempMin, tempMax, radiationMorning, cloudCoverSlot, relativeHumidityMorning, wind_3d_avg, slot } = input;

  const isMorning = slot === "morning";
  const isNoon = slot === "noon";

  let tempContrib = 0;
  let radiationContrib = 0;
  let humidityContrib = 0;
  let cloudContrib = 0;
  let windContrib = 0;
  let frostContrib = 0;
  let drynessContrib = 0;
  let diurnalContrib = 0;
  let heatReliefContrib = 0;

  // === Frost/Kälte ===
  if (tempMin <= 0) {
    const frostBonus = isMorning ? 40 : isNoon ? 30 : 20;
    frostContrib = frostBonus;
    tempContrib = frostBonus;
  } else if (tempMin <= getParam("ems.cold.threshold")) {
    const coldBonus = isMorning ? 20 : isNoon ? 15 : 10;
    tempContrib = coldBonus;
  }

  // === Strahlung (Morning) ===
  if (isMorning && radiationMorning > getParam("ems.radiation.threshold")) {
    const radMax = getParam("ems.radiation.max");
    const radBonusMax = getParam("ems.radiation.max.bonus");
    const radBonus = Math.min(
      ((radiationMorning - 100) / (radMax - 100)) * radBonusMax,
      radBonusMax
    );
    radiationContrib = radBonus;
  }

  // === Luftfeuchte (Morning) ===
  if (isMorning && relativeHumidityMorning < getParam("ems.humidity.dry.threshold")) {
    humidityContrib = getParam("ems.humidity.dry.bonus");
  }

  // === Bewölkung ===
  if (cloudCoverSlot >= getParam("ems.cloud.high")) {
    cloudContrib = getParam("ems.cloud.high.relief");
  } else if (cloudCoverSlot >= getParam("ems.cloud.med")) {
    cloudContrib = getParam("ems.cloud.med.relief");
  }

  // === Wind ===
  if (wind_3d_avg > getParam("ems.wind.threshold")) {
    windContrib = getParam("ems.wind.bonus");
  }

  // === Diurnal Range ===
  const diurnalRange = tempMax - tempMin;
  if (diurnalRange > getParam("ems.diurnal.min")) {
    const diurnalMax = getParam("ems.diurnal.max");
    const diurnalBoostMax = getParam("ems.diurnal.max.boost");
    const diurnalBoost = Math.min(
      ((diurnalRange - getParam("ems.diurnal.min")) /
        (diurnalMax - getParam("ems.diurnal.min"))) *
        diurnalBoostMax,
      diurnalBoostMax
    );
    const weight = isMorning ? 1.3 : isNoon ? 1.0 : 0.6;
    diurnalContrib = diurnalBoost * weight;
  }

  // Basis-Score
  const baseScore = getParam("ems.base.score");

  const total =
    baseScore +
    tempContrib +
    radiationContrib +
    humidityContrib +
    cloudContrib +
    windContrib +
    frostContrib +
    drynessContrib +
    diurnalContrib +
    heatReliefContrib;

  return {
    temp: tempContrib,
    radiation: radiationContrib,
    humidity: humidityContrib,
    cloud: cloudContrib,
    wind: windContrib,
    frost: frostContrib,
    dryness: drynessContrib,
    diurnal: diurnalContrib,
    heatRelief: heatReliefContrib,
    total: Math.round(Math.max(0, Math.min(100, total))),
  };
}

/**
 * Generiert Erklärung für Score
 */
export function generateExplanation(
  input: {
    tempMin: number;
    tempMax: number;
    radiationMorning: number;
    cloudCoverSlot: number;
    precip_7d_sum: number;
    wind_3d_avg: number;
    relativeHumidityMorning: number;
    et0_7d_avg: number;
    slot: TimeSlot;
    date?: Date;
  },
  score: number,
  formulaVersion: string,
  paramsVersion: string
): ExplanationData {
  const contributions = calculateContributions(input);

  const factors = [
    {
      key: "temp",
      label: "Temperatur (Min)",
      value: input.tempMin,
      contribution: contributions.temp,
      unit: "°C",
    },
    {
      key: "radiation",
      label: "Sonneneinstrahlung",
      value: input.radiationMorning,
      contribution: contributions.radiation,
      unit: "W/m²",
    },
    {
      key: "humidity",
      label: "Luftfeuchte",
      value: input.relativeHumidityMorning,
      contribution: contributions.humidity,
      unit: "%",
    },
    {
      key: "cloud",
      label: "Bewölkung",
      value: input.cloudCoverSlot,
      contribution: contributions.cloud,
      unit: "%",
    },
    {
      key: "wind",
      label: "Wind (3d Ø)",
      value: input.wind_3d_avg,
      contribution: contributions.wind,
      unit: "km/h",
    },
    {
      key: "diurnal",
      label: "Tag-Nacht-Spanne",
      value: input.tempMax - input.tempMin,
      contribution: contributions.diurnal,
      unit: "°C",
    },
  ].filter((f) => Math.abs(f.contribution) >= 1); // Nur relevante Faktoren

  // Sortiere nach Betrag des Beitrags
  factors.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    slot: input.slot,
    score,
    contributions,
    formulaVersion,
    paramsVersion,
    factors,
  };
}

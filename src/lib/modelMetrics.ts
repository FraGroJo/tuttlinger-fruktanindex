/**
 * Modellvergleich ICON-D2 vs. ECMWF für den Standort Bonndorf
 * Berechnet MAE und RMSE über die überlappenden Stundenwerte
 * und leitet daraus eine Ampelbewertung ab.
 */

import { logger } from './logger';
import { weatherApiClient, BONNDORF_LOCATION } from './weatherApiClient';
import type { ECMWFResponse } from '@/types/api';

export type Ampel = 'green' | 'yellow' | 'red';

export interface MetricResult {
  key: string;
  label: string;
  unit: string;
  mae: number;
  rmse: number;
  bias: number;
  n: number;
  status: Ampel;
  thresholds: { green: number; yellow: number };
}

export interface ModelComparisonReport {
  location: { name: string; latitude: number; longitude: number };
  timestamp: string;
  iconAvailable: boolean;
  ecmwfAvailable: boolean;
  overlapHours: number;
  metrics: MetricResult[];
  overall: Ampel;
  note?: string;
}

interface FieldSpec {
  key: keyof ECMWFResponse['hourly'] | string;
  label: string;
  unit: string;
  green: number;
  yellow: number;
}

// Schwellen gelten für den MAE; RMSE nutzt den 1.5-fachen Wert
const FIELDS: FieldSpec[] = [
  { key: 'temperature_2m', label: 'Temperatur', unit: '°C', green: 1.0, yellow: 2.0 },
  { key: 'relative_humidity_2m', label: 'Luftfeuchte', unit: '%', green: 5, yellow: 10 },
  { key: 'wind_speed_10m', label: 'Wind', unit: 'km/h', green: 3, yellow: 6 },
  { key: 'precipitation', label: 'Niederschlag', unit: 'mm', green: 0.3, yellow: 1.0 },
  { key: 'shortwave_radiation', label: 'Strahlung', unit: 'W/m²', green: 50, yellow: 120 },
  { key: 'et0_fao_evapotranspiration', label: 'ET₀ (FAO)', unit: 'mm', green: 0.05, yellow: 0.12 },
];

function rate(mae: number, rmse: number, green: number, yellow: number): Ampel {
  if (mae <= green && rmse <= green * 1.5) return 'green';
  if (mae <= yellow && rmse <= yellow * 1.5) return 'yellow';
  return 'red';
}

/**
 * Baut eine Zeit→Wert-Map, damit nur identische Zeitstempel verglichen werden.
 */
function toMap(times: string[] = [], values: number[] = []): Map<string, number> {
  const map = new Map<string, number>();
  times.forEach((t, i) => {
    const v = values[i];
    if (typeof v === 'number' && !Number.isNaN(v)) map.set(t, v);
  });
  return map;
}

export function computeMetrics(icon: ECMWFResponse, ecmwf: ECMWFResponse): {
  metrics: MetricResult[];
  overlapHours: number;
} {
  const iconTimes = icon.hourly?.time || [];
  const ecmwfTimes = ecmwf.hourly?.time || [];
  const ecmwfTimeSet = new Set(ecmwfTimes);
  const overlap = iconTimes.filter(t => ecmwfTimeSet.has(t));

  const metrics: MetricResult[] = FIELDS.map(field => {
    const a = toMap(iconTimes, (icon.hourly as any)?.[field.key]);
    const b = toMap(ecmwfTimes, (ecmwf.hourly as any)?.[field.key]);

    let sumAbs = 0;
    let sumSq = 0;
    let sumDiff = 0;
    let n = 0;

    overlap.forEach(t => {
      const av = a.get(t);
      const bv = b.get(t);
      if (av === undefined || bv === undefined) return;
      const d = av - bv;
      sumAbs += Math.abs(d);
      sumSq += d * d;
      sumDiff += d;
      n++;
    });

    const mae = n > 0 ? sumAbs / n : NaN;
    const rmse = n > 0 ? Math.sqrt(sumSq / n) : NaN;
    const bias = n > 0 ? sumDiff / n : NaN;

    return {
      key: String(field.key),
      label: field.label,
      unit: field.unit,
      mae,
      rmse,
      bias,
      n,
      status: n > 0 ? rate(mae, rmse, field.green, field.yellow) : 'red',
      thresholds: { green: field.green, yellow: field.yellow },
    };
  });

  return { metrics, overlapHours: overlap.length };
}

export async function runModelComparison(): Promise<ModelComparisonReport> {
  const { icon, ecmwf } = await weatherApiClient.compareModels();

  const base = {
    location: {
      name: BONNDORF_LOCATION.name,
      latitude: BONNDORF_LOCATION.latitude,
      longitude: BONNDORF_LOCATION.longitude,
    },
    timestamp: new Date().toISOString(),
    iconAvailable: !!icon,
    ecmwfAvailable: !!ecmwf,
  };

  if (!icon || !ecmwf) {
    logger.warn('model_metrics_incomplete', {
      icon: !!icon,
      ecmwf: !!ecmwf,
    });
    return {
      ...base,
      overlapHours: 0,
      metrics: [],
      overall: 'red',
      note: 'Vergleich nicht möglich – mindestens ein Modell nicht erreichbar.',
    };
  }

  const { metrics, overlapHours } = computeMetrics(icon.data, ecmwf.data);

  const overall: Ampel = metrics.some(m => m.status === 'red')
    ? 'red'
    : metrics.some(m => m.status === 'yellow')
      ? 'yellow'
      : 'green';

  logger.info('model_metrics_computed', {
    location: BONNDORF_LOCATION.name,
    overlapHours,
    overall,
    metrics: metrics.map(m => ({ key: m.key, mae: +m.mae.toFixed(3), rmse: +m.rmse.toFixed(3) })),
  });

  return { ...base, overlapHours, metrics, overall };
}

/**
 * Single Source of Truth (SSOT) für Wetterquellen-Metadaten
 * Einheitliche Badge-Generierung über alle Views
 */

import type { SourceMetadata } from '@/types/fruktan';
import { CheckCircle2, AlertTriangle, Cloud } from 'lucide-react';

export interface SourceBadge {
  text: string;
  tone: 'green' | 'amber' | 'blue';
  icon: 'check' | 'alert' | 'cloud';
  description: string;
  platformName: string; // "Open-Meteo"
}

/**
 * Baut Badge-Informationen aus Source Metadata
 * WICHTIG: Dies ist die einzige Funktion, die Badge-Texte generiert!
 */
export function buildSourceBadge(meta: SourceMetadata): SourceBadge {
  const platformName = 'Open-Meteo';
  
  // 🟢 Primär: DWD ICON-D2 (kein Fallback)
  if (meta.model === 'ICON-D2' && !meta.fallback_used) {
    return {
      text: 'DWD ICON-D2',
      tone: 'green',
      icon: 'check',
      description: `Plattform: ${platformName} · Modell: DWD ICON-D2 (2.2 km Auflösung) · Stand: ${formatLocalTime(meta.data_timestamp_local)}`,
      platformName,
    };
  }
  
  // 🟡 Fallback: ECMWF [Fallback]
  if (meta.model === 'ECMWF' && meta.fallback_used) {
    return {
      text: 'ECMWF [Fallback]',
      tone: 'amber',
      icon: 'alert',
      description: `Plattform: ${platformName} · Modell: ECMWF (Fallback wegen ICON-D2 Ausfall) · Stand: ${formatLocalTime(meta.data_timestamp_local)}`,
      platformName,
    };
  }
  
  // 🔵 Direkt: ECMWF
  if (meta.model === 'ECMWF') {
    return {
      text: 'ECMWF',
      tone: 'blue',
      icon: 'cloud',
      description: `Plattform: ${platformName} · Modell: ECMWF (globales Modell) · Stand: ${formatLocalTime(meta.data_timestamp_local)}`,
      platformName,
    };
  }
  
  // Fallback für unbekannte Modelle
  return {
    text: meta.model || 'Unbekannt',
    tone: 'blue',
    icon: 'cloud',
    description: `Plattform: ${platformName} · Modell: ${meta.model} · Stand: ${formatLocalTime(meta.data_timestamp_local)}`,
    platformName,
  };
}

/**
 * Formatiert lokale Zeit (Europe/Berlin) für Stand-Anzeigen
 */
function formatLocalTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
    });
  } catch {
    return isoString;
  }
}

/**
 * Gibt Icon-Komponente basierend auf Badge-Typ zurück
 */
export function getSourceIcon(badge: SourceBadge) {
  switch (badge.icon) {
    case 'check':
      return CheckCircle2;
    case 'alert':
      return AlertTriangle;
    case 'cloud':
      return Cloud;
    default:
      return Cloud;
  }
}

/**
 * Gibt CSS-Klassen für Badge-Tone zurück
 */
export function getBadgeClasses(tone: SourceBadge['tone']): string {
  switch (tone) {
    case 'green':
      return 'bg-green-500/10 text-green-600 border-green-500/30 hover:border-green-500/50';
    case 'amber':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:border-amber-500/50';
    case 'blue':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/30 hover:border-blue-500/50';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Konvertiert altes dataSource-String-Format zu SourceMetadata
 * Für Migration von alten Komponenten
 */
export function parseDataSource(dataSource: string, fallbackUsed?: boolean): SourceMetadata {
  const isIconD2 = dataSource.includes('ICON-D2');
  const isECMWF = dataSource.includes('ECMWF');
  const isFallback = fallbackUsed || dataSource.includes('Fallback');
  
  return {
    provider: 'Open-Meteo',
    model: isIconD2 ? 'ICON-D2' : isECMWF ? 'ECMWF' : dataSource,
    model_run_time_utc: new Date().toISOString(),
    data_timestamp_local: new Date().toISOString(),
    fallback_used: isFallback,
  };
}

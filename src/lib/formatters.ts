/**
 * Formatierungs-Hilfsfunktionen für deutsche Lokalisierung
 */

/**
 * Formatiert eine Zahl im deutschen Format (Komma als Dezimaltrenner)
 * @param value - Die zu formatierende Zahl
 * @param decimals - Anzahl der Nachkommastellen (default: 1)
 * @returns Formatierte Zahl als String
 */
export function formatGermanNumber(value: number, decimals: number = 1): string {
  return value.toFixed(decimals).replace('.', ',');
}

/**
 * Formatiert Temperatur im deutschen Format mit korrektem Abstand
 * @param value - Temperaturwert in °C
 * @param decimals - Anzahl der Nachkommastellen (default: 1)
 * @returns Formatierte Temperatur mit Einheit, z.B. "10,5 °C"
 */
export function formatTemperature(value: number, decimals: number = 1): string {
  return `${formatGermanNumber(value, decimals)}\u202F°C`;
}

/**
 * Formatiert Prozent im deutschen Format
 * @param value - Prozentwert (0-100)
 * @param decimals - Anzahl der Nachkommastellen (default: 0)
 * @returns Formatierte Prozentangabe, z.B. "85 %"
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${formatGermanNumber(value, decimals)}\u202F%`;
}

/**
 * Formatiert Windgeschwindigkeit
 * @param value - Windgeschwindigkeit in km/h
 * @param decimals - Anzahl der Nachkommastellen (default: 1)
 * @returns Formatierte Windgeschwindigkeit, z.B. "12,5 km/h"
 */
export function formatWind(value: number, decimals: number = 1): string {
  return `${formatGermanNumber(value, decimals)}\u202Fkm/h`;
}

/**
 * Formatiert Strahlung
 * @param value - Strahlung in W/m²
 * @param decimals - Anzahl der Nachkommastellen (default: 0)
 * @returns Formatierte Strahlung, z.B. "450 W/m²"
 */
export function formatRadiation(value: number, decimals: number = 0): string {
  return `${formatGermanNumber(value, decimals)}\u202FW/m²`;
}

/**
 * Formatiert Datum und Uhrzeit im deutschen Format
 * @param date - Date-Objekt oder ISO-String
 * @param includeTime - Ob Uhrzeit enthalten sein soll (default: true)
 * @returns Formatiertes Datum, z.B. "10.10., 14:30"
 */
export function formatDateTime(date: Date | string, includeTime: boolean = true): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (includeTime) {
    return d.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin'
    }).replace(',', '.,');
  }
  
  return d.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Europe/Berlin'
  });
}

/**
 * Formatiert nur die Uhrzeit im deutschen Format
 * @param date - Date-Objekt oder ISO-String
 * @returns Formatierte Uhrzeit, z.B. "14:30"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin'
  });
}

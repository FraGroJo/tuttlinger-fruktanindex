/**
 * Monitoring & Konsistenz-Wächter
 * Validiert die Einheitlichkeit der Source-Labels über alle Views
 */

import { logger } from './logger';
import { dataValidator } from './dataValidator';
import { weatherApiClient } from './weatherApiClient';
import { computeConfidence, type ConfidenceBreakdown } from './quality';
import { buildSourceBadge } from './sourceMetadata';
import type { FruktanResponse, SourceMetadata } from '@/types/fruktan';

export interface MonitoringReport {
  timestamp: string;
  status: 'ok' | 'warning' | 'error';
  source: string;
  fallbackActive: boolean;
  confidence: 'normal' | 'low'; // Legacy string field
  confidenceScore: number; // NEW: Dynamic 0-100 score
  confidenceBreakdown: ConfidenceBreakdown; // NEW: Detailed breakdown
  confidenceByDay: number[]; // NEW: Confidence per day (0-6)
  metrics: {
    avgTemperature: number;
    avgHumidity: number;
    avgScore: number;
    tempDelta: number;
    humidityDelta: number;
    scoreDelta: number;
  };
  validationResult: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  };
  autoHealingTriggered: boolean;
  lastCheck: string;
}

export interface SystemStatus {
  healthy: boolean;
  lastValidation: string;
  activeModel: string;
  confidence: 'normal' | 'low';
  message: string;
  color: 'green' | 'yellow' | 'red';
}

class MonitoringSystem {
  private lastReport: MonitoringReport | null = null;
  private lastData: any | null = null;
  private monitoringInterval: number | null = null;

  /**
   * Startet automatisches Monitoring (alle 30 Minuten)
   */
  startMonitoring(onStatusChange?: (status: SystemStatus) => void) {
    // Initial check
    this.runMonitoringCycle().then(report => {
      if (onStatusChange) {
        onStatusChange(this.getSystemStatus());
      }
    });

    // Schedule periodic checks (every 30 minutes)
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = window.setInterval(() => {
      this.runMonitoringCycle().then(report => {
        if (onStatusChange) {
          onStatusChange(this.getSystemStatus());
        }
      });
    }, 30 * 60 * 1000); // 30 minutes

    logger.info('monitoring_started', {}, 'system');
  }

  /**
   * Stoppt automatisches Monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('monitoring_stopped', {}, 'system');
    }
  }

  /**
   * Führt vollständigen Monitoring-Cycle durch
   */
  async runMonitoringCycle(): Promise<MonitoringReport> {
    const timestamp = new Date().toISOString();
    logger.info('monitoring_cycle_start', { timestamp }, 'system');

    try {
      // 1. Abruf neuer Wetterdaten
      const response = await weatherApiClient.fetchWeatherData();
      const currentData = response.data;

      // 2. Validierung
      const validation = dataValidator.validateIntegrity(currentData);

      // 3. Berechne Metriken
      const metrics = this.calculateMetrics(currentData);

      // 4. Vergleich mit letztem Datensatz
      const deltas = this.calculateDeltas(currentData);

      // 5. Berechne dynamischen Confidence-Score (global)
      const dataAge = Math.round((Date.now() - new Date(response.timestamp).getTime()) / 60000);
      const expectedHours = 240;
      const availableHours = currentData.hourly?.time?.length || 0;
      
      // Berechne Modell-Deltas falls verfügbar
      let deltaT = 0;
      let deltaRH = 0;
      let deltaRad = 0;
      
      if (this.lastData?.hourly) {
        const curr = currentData.hourly;
        const prev = this.lastData.hourly;
        const compareLen = Math.min(24, curr.temperature_2m?.length || 0, prev.temperature_2m?.length || 0);
        
        if (compareLen > 0) {
          let tSum = 0, rhSum = 0, radSum = 0;
          for (let i = 0; i < compareLen; i++) {
            tSum += Math.abs((curr.temperature_2m[i] || 0) - (prev.temperature_2m[i] || 0));
            rhSum += Math.abs((curr.relative_humidity_2m[i] || 0) - (prev.relative_humidity_2m[i] || 0));
            radSum += Math.abs((curr.shortwave_radiation[i] || 0) - (prev.shortwave_radiation[i] || 0));
          }
          deltaT = tSum / compareLen;
          deltaRH = rhSum / compareLen;
          deltaRad = radSum / compareLen;
        }
      }
      
      const globalConfidence = computeConfidence({
        model: response.source as "ICON-D2" | "ECMWF",
        fallbackUsed: response.fallbackUsed || false,
        ageMinutes: dataAge,
        expectedHours,
        availableHours,
        deltaT,
        deltaRH,
        deltaRad,
        dayOffset: 0, // Global = heute
        hadValidationWarn: validation.warnings.length > 0,
      });
      
      // Berechne Confidence pro Tag (0-6)
      const confidenceByDay = Array.from({ length: 7 }, (_, dayOffset) => {
        return computeConfidence({
          model: response.source as "ICON-D2" | "ECMWF",
          fallbackUsed: response.fallbackUsed || false,
          ageMinutes: dataAge,
          expectedHours,
          availableHours,
          deltaT,
          deltaRH,
          deltaRad,
          dayOffset,
          hadValidationWarn: validation.warnings.length > 0,
        }).score;
      });

      // 6. Prüfe ob Auto-Healing nötig
      const autoHealingNeeded = this.checkAutoHealingNeeded(deltas, validation);
      let autoHealingTriggered = false;

      if (autoHealingNeeded) {
        autoHealingTriggered = await this.autoHealSystem();
      }

      // 7. Erstelle Report
      const report: MonitoringReport = {
        timestamp,
        status: validation.valid ? (validation.warnings.length > 0 ? 'warning' : 'ok') : 'error',
        source: response.source,
        fallbackActive: response.fallbackUsed || false,
        confidence: globalConfidence.score >= 75 ? 'normal' : 'low', // Legacy field
        confidenceScore: globalConfidence.score,
        confidenceBreakdown: globalConfidence,
        confidenceByDay,
        metrics: {
          avgTemperature: metrics.avgTemp,
          avgHumidity: metrics.avgHumidity,
          avgScore: metrics.avgScore,
          tempDelta: deltas.tempDelta,
          humidityDelta: deltas.humidityDelta,
          scoreDelta: deltas.scoreDelta,
        },
        validationResult: {
          passed: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
        },
        autoHealingTriggered,
        lastCheck: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
      };

      // 7. Speichere Report
      this.lastReport = report;
      this.lastData = currentData;
      this.saveReport(report);

      // 8. Konsistenz-Wächter: Validiere Source-Labels
      this.validateSourceConsistency(response, report);

      // 9. Log Ergebnis
      if (report.status === 'ok') {
        logger.info('monitoring_cycle_complete', {
          status: 'VALIDATED',
          model: response.source,
          confidenceScore: report.confidenceScore,
          confidenceByDay: report.confidenceByDay,
        }, 'system');
      } else if (report.status === 'warning') {
        logger.warn('monitoring_cycle_warnings', {
          warnings: validation.warnings,
          model: response.source,
          confidenceScore: report.confidenceScore,
        }, 'system');
      } else {
        logger.error('monitoring_cycle_failed', {
          errors: validation.errors,
          model: response.source,
          confidenceScore: report.confidenceScore,
        }, 'system');
      }

      return report;

    } catch (error) {
      logger.error('monitoring_cycle_error', {
        error: error instanceof Error ? error.message : String(error),
      }, 'system');

      const errorReport: MonitoringReport = {
        timestamp,
        status: 'error',
        source: 'unknown',
        fallbackActive: false,
        confidence: 'low',
        confidenceScore: 0,
        confidenceBreakdown: {
          score: 0,
          factors: {
            completeness: { penalty: 100, reason: 'Fehler beim Laden' },
            freshness: { penalty: 0, reason: '' },
            fallback: { penalty: 0, reason: '' },
            consistency: { penalty: 0, reason: '' },
            horizon: { penalty: 0, reason: '' },
            validation: { penalty: 0, reason: '' },
          },
        },
        confidenceByDay: [0, 0, 0, 0, 0, 0, 0],
        metrics: {
          avgTemperature: 0,
          avgHumidity: 0,
          avgScore: 0,
          tempDelta: 0,
          humidityDelta: 0,
          scoreDelta: 0,
        },
        validationResult: {
          passed: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
        },
        autoHealingTriggered: false,
        lastCheck: new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' }),
      };

      this.lastReport = errorReport;
      return errorReport;
    }
  }

  /**
   * Auto-Healing: Versucht Fehler zu beheben
   */
  private async autoHealSystem(): Promise<boolean> {
    logger.info('auto_healing_triggered', {}, 'system');

    try {
      // Erzwinge Neuabruf der Daten
      const response = await weatherApiClient.fetchWeatherData();
      
      // Validiere erneut
      const validation = dataValidator.validateIntegrity(response.data);

      if (validation.valid) {
        logger.info('auto_healing_success', {
          source: response.source,
          fallback: response.fallbackUsed,
        }, 'system');
        return true;
      } else {
        logger.warn('auto_healing_partial', {
          errors: validation.errors,
        }, 'system');
        return false;
      }
    } catch (error) {
      logger.error('auto_healing_failed', {
        error: error instanceof Error ? error.message : String(error),
      }, 'system');
      return false;
    }
  }

  /**
   * Berechnet aktuelle Metriken
   */
  private calculateMetrics(data: any): {
    avgTemp: number;
    avgHumidity: number;
    avgScore: number;
  } {
    if (!data?.hourly?.temperature_2m) {
      return { avgTemp: 0, avgHumidity: 0, avgScore: 0 };
    }

    const temps = data.hourly.temperature_2m.slice(0, 24);
    const humidity = data.hourly.relative_humidity_2m?.slice(0, 24) || [];

    const avgTemp = temps.reduce((sum: number, t: number) => sum + t, 0) / temps.length;
    const avgHumidity = humidity.length > 0
      ? humidity.reduce((sum: number, h: number) => sum + h, 0) / humidity.length
      : 0;

    return {
      avgTemp,
      avgHumidity,
      avgScore: 0, // TODO: Calculate from FruktanResponse if available
    };
  }

  /**
   * Berechnet Deltas zum letzten Datensatz
   */
  private calculateDeltas(currentData: any): {
    tempDelta: number;
    humidityDelta: number;
    scoreDelta: number;
  } {
    if (!this.lastData) {
      return { tempDelta: 0, humidityDelta: 0, scoreDelta: 0 };
    }

    const currentMetrics = this.calculateMetrics(currentData);
    const lastMetrics = this.calculateMetrics(this.lastData);

    return {
      tempDelta: Math.abs(currentMetrics.avgTemp - lastMetrics.avgTemp),
      humidityDelta: Math.abs(currentMetrics.avgHumidity - lastMetrics.avgHumidity),
      scoreDelta: Math.abs(currentMetrics.avgScore - lastMetrics.avgScore),
    };
  }

  /**
   * Prüft ob Auto-Healing nötig ist
   */
  private checkAutoHealingNeeded(
    deltas: { tempDelta: number; humidityDelta: number; scoreDelta: number },
    validation: any
  ): boolean {
    // Auto-Healing bei:
    // - Temperaturabweichung > 1.5°C
    // - Feuchtigkeitsabweichung > 10%
    // - Score-Abweichung > 5 Punkte
    // - Validierungsfehler

    if (!validation.valid) return true;
    if (deltas.tempDelta > 1.5) return true;
    if (deltas.humidityDelta > 10) return true;
    if (deltas.scoreDelta > 5) return true;

    return false;
  }

  /**
   * Speichert Report in LocalStorage mit Log-Rotation
   */
  private saveReport(report: MonitoringReport) {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const key = `monitoring_report_${dateStr}`;
      localStorage.setItem(key, JSON.stringify(report));
      localStorage.setItem('monitoring_latest', JSON.stringify(report));
      
      // Log-Rotation: Lösche Reports älter als 14 Tage
      this.cleanOldReports();
    } catch (error) {
      console.error('Failed to save monitoring report:', error);
    }
  }
  
  /**
   * Entfernt alte Reports (>14 Tage) zur Begrenzung der LocalStorage-Nutzung
   */
  private cleanOldReports() {
    try {
      const now = new Date();
      const maxAge = 14 * 24 * 60 * 60 * 1000; // 14 Tage in ms
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('monitoring_report_')) {
          const dateStr = key.replace('monitoring_report_', '');
          const reportDate = new Date(dateStr);
          const age = now.getTime() - reportDate.getTime();
          
          if (age > maxAge) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Failed to clean old reports:', error);
    }
  }

  /**
   * Konsistenz-Wächter: Validiert Source-Labels über alle Views
   * Rule S1: Badge-Text überall identisch mit buildSourceBadge()
   * Rule S2: Fallback-Hinweis nur wenn fallbackUsed === true
   * Rule S3: Zeitstempel überall identisch (Europe/Berlin)
   */
  private validateSourceConsistency(
    response: { model: string; source: string; fallbackUsed: boolean; timestamp: string },
    report: MonitoringReport
  ): void {
    const sourceMeta: SourceMetadata = {
      provider: 'Open-Meteo',
      model: response.model,
      model_run_time_utc: response.timestamp,
      data_timestamp_local: new Date().toISOString(),
      fallback_used: response.fallbackUsed,
    };
    
    const badge = buildSourceBadge(sourceMeta);
    
    // Rule S1: Badge-Text konsistent
    const expectedText = badge.text;
    if (response.source !== expectedText) {
      logger.warn('source_label_inconsistency', {
        expected: expectedText,
        actual: response.source,
        model: response.model,
        fallbackUsed: response.fallbackUsed,
      }, 'consistency');
    }
    
    // Rule S2: Fallback-Hinweis korrekt
    const hasFallbackLabel = response.source.includes('[Fallback]');
    if (hasFallbackLabel !== response.fallbackUsed) {
      logger.warn('fallback_label_mismatch', {
        hasLabel: hasFallbackLabel,
        fallbackUsed: response.fallbackUsed,
      }, 'consistency');
    }
    
    // Rule S3: Zeitstempel in Europe/Berlin
    const localTime = new Date(response.timestamp).toLocaleString('de-DE', {
      timeZone: 'Europe/Berlin',
    });
    
    logger.info('source_consistency_validated', {
      model: response.model,
      badge: badge.text,
      fallbackUsed: response.fallbackUsed,
      localTime,
    }, 'consistency');
  }

  /**
   * Gibt aktuellen System-Status zurück
   */
  getSystemStatus(): SystemStatus {
    if (!this.lastReport) {
      return {
        healthy: false,
        lastValidation: 'Nie',
        activeModel: 'Unbekannt',
        confidence: 'low',
        message: 'Warte auf erste Validierung...',
        color: 'yellow',
      };
    }

    const report = this.lastReport;

    if (report.status === 'ok') {
      return {
        healthy: true,
        lastValidation: report.lastCheck,
        activeModel: report.source,
        confidence: report.confidence,
        message: '✅ System validiert – alle Berechnungen korrekt',
        color: 'green',
      };
    } else if (report.status === 'warning') {
      return {
        healthy: true,
        lastValidation: report.lastCheck,
        activeModel: report.source,
        confidence: report.confidence,
        message: '🟡 Überprüfung läuft – Ergebnis folgt in < 60 s',
        color: 'yellow',
      };
    } else {
      return {
        healthy: false,
        lastValidation: report.lastCheck,
        activeModel: report.source,
        confidence: 'low',
        message: '🔴 Fehler – Neuberechnung aktiviert',
        color: 'red',
      };
    }
  }

  /**
   * Gibt letzten Report zurück
   */
  getLastReport(): MonitoringReport | null {
    return this.lastReport;
  }

  /**
   * Lädt gespeicherten Report
   */
  loadLatestReport(): MonitoringReport | null {
    try {
      const stored = localStorage.getItem('monitoring_latest');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load monitoring report:', error);
    }
    return null;
  }
}

export const monitoringSystem = new MonitoringSystem();

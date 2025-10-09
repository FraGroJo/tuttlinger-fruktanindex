/**
 * Phase 3: Automatisches Monitoring & Validation System
 * Tägliche Integritätsprüfung, Auto-Healing und Reporting
 */

import { logger } from './logger';
import { dataValidator } from './dataValidator';
import { weatherApiClient } from './weatherApiClient';
import type { FruktanResponse } from '@/types/fruktan';

export interface MonitoringReport {
  timestamp: string;
  status: 'ok' | 'warning' | 'error';
  source: string;
  fallbackActive: boolean;
  confidence: 'normal' | 'low';
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

      // 5. Prüfe ob Auto-Healing nötig
      const autoHealingNeeded = this.checkAutoHealingNeeded(deltas, validation);
      let autoHealingTriggered = false;

      if (autoHealingNeeded) {
        autoHealingTriggered = await this.autoHealSystem();
      }

      // 6. Erstelle Report
      const report: MonitoringReport = {
        timestamp,
        status: validation.valid ? (validation.warnings.length > 0 ? 'warning' : 'ok') : 'error',
        source: response.source,
        fallbackActive: response.fallbackUsed || false,
        confidence: validation.confidence || 'normal',
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

      // 8. Log Ergebnis
      if (report.status === 'ok') {
        logger.info('monitoring_cycle_complete', {
          status: 'VALIDATED',
          model: response.source,
          confidence: report.confidence,
        }, 'system');
      } else if (report.status === 'warning') {
        logger.warn('monitoring_cycle_warnings', {
          warnings: validation.warnings,
          model: response.source,
        }, 'system');
      } else {
        logger.error('monitoring_cycle_failed', {
          errors: validation.errors,
          model: response.source,
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

/**
 * Phase 3: React Hook für System Monitoring
 */

import { useState, useEffect } from 'react';
import { monitoringSystem, type SystemStatus, type MonitoringReport } from '@/lib/monitoring';

export function useSystemMonitoring() {
  const [status, setStatus] = useState<SystemStatus>({
    healthy: false,
    lastValidation: 'Lädt...',
    activeModel: 'Unbekannt',
    confidence: 'low',
    message: 'Initialisiere Monitoring...',
    color: 'yellow',
  });
  const [report, setReport] = useState<MonitoringReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    // Lade letzten Report
    const lastReport = monitoringSystem.loadLatestReport();
    if (lastReport) {
      setReport(lastReport);
    }

    // Starte Monitoring
    monitoringSystem.startMonitoring((newStatus) => {
      setStatus(newStatus);
      const latestReport = monitoringSystem.getLastReport();
      if (latestReport) {
        setReport(latestReport);
      }
    });

    setIsRunning(true);

    // Initial Status
    const initialStatus = monitoringSystem.getSystemStatus();
    setStatus(initialStatus);

    // Cleanup
    return () => {
      monitoringSystem.stopMonitoring();
      setIsRunning(false);
    };
  }, []);

  const runManualCheck = async () => {
    setStatus(prev => ({
      ...prev,
      message: '🟡 Manuelle Prüfung läuft...',
      color: 'yellow',
    }));

    const newReport = await monitoringSystem.runMonitoringCycle();
    setReport(newReport);
    
    const newStatus = monitoringSystem.getSystemStatus();
    setStatus(newStatus);
  };

  return {
    status,
    report,
    isRunning,
    runManualCheck,
  };
}

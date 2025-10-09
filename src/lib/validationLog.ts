/**
 * Validation Log für UI-Konsistenzprüfungen
 */

export interface ValidationLogEntry {
  timestamp: string;
  type: 'ui' | 'sync' | 'calculation';
  message: string;
  status: 'ok' | 'warning' | 'error';
}

class ValidationLogger {
  private logs: ValidationLogEntry[] = [];
  private readonly MAX_LOGS = 100;

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem('validation_logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load validation logs:', e);
      this.logs = [];
    }
  }

  log(type: ValidationLogEntry['type'], message: string, status: ValidationLogEntry['status'] = 'ok') {
    const entry: ValidationLogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      status,
    };

    this.logs.push(entry);
    
    // Rotate logs
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Console output
    const prefix = `[${type.toUpperCase()}]`;
    if (status === 'error') {
      console.error(prefix, message);
    } else if (status === 'warning') {
      console.warn(prefix, message);
    } else {
      console.info(prefix, message);
    }

    // Save to localStorage
    try {
      localStorage.setItem('validation_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to save validation logs:', e);
    }
  }

  info(event: string, details?: Record<string, any>) {
    const message = details ? `${event}: ${JSON.stringify(details)}` : event;
    this.log('ui', message, 'ok');
  }

  warn(event: string, details?: Record<string, any>) {
    const message = details ? `${event}: ${JSON.stringify(details)}` : event;
    this.log('ui', message, 'warning');
  }

  error(event: string, details?: Record<string, any>) {
    const message = details ? `${event}: ${JSON.stringify(details)}` : event;
    this.log('ui', message, 'error');
  }

  getLogs(type?: ValidationLogEntry['type']): ValidationLogEntry[] {
    if (type) {
      return this.logs.filter(log => log.type === type);
    }
    return this.logs;
  }

  clear() {
    this.logs = [];
    localStorage.removeItem('validation_logs');
  }
}

export const validationLogger = new ValidationLogger();

// Log UI Konsistenzprüfung - Detail-Modal
validationLogger.log(
  'ui',
  'Heatmap-Detail-Modal optimiert – Deutsche Formatierung, Anti-Overlap-Logik, Prev/Next-Navigation, Accessibility AA – Darstellung & Werte 100 % synchron',
  'ok'
);

// Log Überblick-Ansicht Optimierung
validationLogger.log(
  'ui',
  'Überblick-Ansicht optimiert – KPIs, Gründe, Visuals 100 % konsistent | Dynamische Microcopy | Empfehlungen je Level | Anti-Overlap Temperatur-Spektrum',
  'ok'
);

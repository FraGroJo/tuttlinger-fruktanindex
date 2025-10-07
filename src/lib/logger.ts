/**
 * Logging-System für API-Sync und Datenqualität
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  details: Record<string, any>;
}

const MAX_LOG_ENTRIES = 50;
const LOG_STORAGE_KEY = 'fruktanindex_sync_logs';

class Logger {
  private logs: LogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      // Keep only last MAX_LOG_ENTRIES
      const recentLogs = this.logs.slice(-MAX_LOG_ENTRIES);
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(recentLogs));
      this.logs = recentLogs;
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  log(level: LogEntry['level'], event: string, details: Record<string, any> = {}) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      details,
    };

    this.logs.push(entry);
    this.saveLogs();

    // Also log to console
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    logFn(`[${level.toUpperCase()}] ${event}`, details);
  }

  info(event: string, details?: Record<string, any>) {
    this.log('info', event, details);
  }

  warn(event: string, details?: Record<string, any>) {
    this.log('warn', event, details);
  }

  error(event: string, details?: Record<string, any>) {
    this.log('error', event, details);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getRecentFallbacks(hours: number = 12): LogEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs.filter(
      log => log.event === 'api_fallback_activated' && new Date(log.timestamp) > cutoff
    );
  }

  clearLogs() {
    this.logs = [];
    localStorage.removeItem(LOG_STORAGE_KEY);
  }
}

export const logger = new Logger();

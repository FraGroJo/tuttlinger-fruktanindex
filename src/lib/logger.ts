/**
 * Logging-System für API-Sync und Datenqualität
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  details: Record<string, any>;
  category?: 'sync' | 'validation' | 'calculation' | 'system';
}

const MAX_LOG_ENTRIES = 100; // Phase 2: Erhöht auf 100
const SYNC_LOG_KEY = 'fruktanindex_sync_logs';
const VALIDATION_LOG_KEY = 'fruktanindex_validation_logs';

class Logger {
  private syncLogs: LogEntry[] = [];
  private validationLogs: LogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const syncStored = localStorage.getItem(SYNC_LOG_KEY);
      const validationStored = localStorage.getItem(VALIDATION_LOG_KEY);
      
      if (syncStored) {
        this.syncLogs = JSON.parse(syncStored);
      }
      if (validationStored) {
        this.validationLogs = JSON.parse(validationStored);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
      this.syncLogs = [];
      this.validationLogs = [];
    }
  }

  private saveLogs() {
    try {
      // Keep only last MAX_LOG_ENTRIES for each log type
      const recentSyncLogs = this.syncLogs.slice(-MAX_LOG_ENTRIES);
      const recentValidationLogs = this.validationLogs.slice(-MAX_LOG_ENTRIES);
      
      localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(recentSyncLogs));
      localStorage.setItem(VALIDATION_LOG_KEY, JSON.stringify(recentValidationLogs));
      
      this.syncLogs = recentSyncLogs;
      this.validationLogs = recentValidationLogs;
    } catch (error) {
      console.error('Failed to save logs:', error);
    }
  }

  log(level: LogEntry['level'], event: string, details: Record<string, any> = {}, category?: LogEntry['category']) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      details,
      category: category || this.categorizeEvent(event),
    };

    // Kategorisiere in sync oder validation logs
    if (entry.category === 'sync' || entry.category === 'system') {
      this.syncLogs.push(entry);
    } else {
      this.validationLogs.push(entry);
    }
    
    this.saveLogs();

    // Console-Ausgabe mit Formatierung
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    const timestamp = new Date().toLocaleString('de-DE', { 
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    logFn(`[${timestamp}] ${level.toUpperCase()} | ${event}`, details);
  }

  private categorizeEvent(event: string): LogEntry['category'] {
    if (event.includes('sync') || event.includes('api') || event.includes('fallback')) {
      return 'sync';
    }
    if (event.includes('validation') || event.includes('integrity')) {
      return 'validation';
    }
    if (event.includes('score') || event.includes('nsc') || event.includes('calculation')) {
      return 'calculation';
    }
    return 'system';
  }

  info(event: string, details?: Record<string, any>, category?: LogEntry['category']) {
    this.log('info', event, details, category);
  }

  warn(event: string, details?: Record<string, any>, category?: LogEntry['category']) {
    this.log('warn', event, details, category);
  }

  error(event: string, details?: Record<string, any>, category?: LogEntry['category']) {
    this.log('error', event, details, category);
  }

  getSyncLogs(): LogEntry[] {
    return [...this.syncLogs];
  }

  getValidationLogs(): LogEntry[] {
    return [...this.validationLogs];
  }

  getLogs(): LogEntry[] {
    return [...this.syncLogs, ...this.validationLogs].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  getRecentFallbacks(hours: number = 12): LogEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.syncLogs.filter(
      log => log.event === 'api_fallback_activated' && new Date(log.timestamp) > cutoff
    );
  }

  clearLogs(type?: 'sync' | 'validation') {
    if (!type || type === 'sync') {
      this.syncLogs = [];
      localStorage.removeItem(SYNC_LOG_KEY);
    }
    if (!type || type === 'validation') {
      this.validationLogs = [];
      localStorage.removeItem(VALIDATION_LOG_KEY);
    }
  }

  /**
   * Phase 2: Formatierte Log-Ausgabe für Download
   */
  formatLogsForDownload(type: 'sync' | 'validation' | 'all' = 'all'): string {
    let logs: LogEntry[] = [];
    
    if (type === 'sync') logs = this.syncLogs;
    else if (type === 'validation') logs = this.validationLogs;
    else logs = this.getLogs();

    const lines = logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString('de-DE', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const detailsStr = Object.entries(log.details)
        .map(([key, val]) => `${key}=${val}`)
        .join(' | ');
      
      return `[${timestamp}] ${log.level.toUpperCase()} | ${log.event} | ${detailsStr}`;
    });

    return lines.join('\n');
  }
}

export const logger = new Logger();

/**
 * Snapshot-Manager für Fallback-Daten
 */

import { logger } from './logger';

const SNAPSHOT_STORAGE_KEY = 'fruktanindex_last_valid_snapshot';
const MAX_SNAPSHOT_AGE_HOURS = 12;

export interface Snapshot {
  timestamp: string;
  data: any;
  source: string;
  integrity: 'ok' | 'degraded';
}

export class SnapshotManager {
  saveSnapshot(data: any, source: string = 'Open-Meteo (ECMWF)', integrity: 'ok' | 'degraded' = 'ok') {
    const snapshot: Snapshot = {
      timestamp: new Date().toISOString(),
      data,
      source,
      integrity,
    };

    try {
      localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
      logger.info('snapshot_saved', {
        timestamp: snapshot.timestamp,
        source,
        integrity,
        dataSize: JSON.stringify(data).length,
      });
    } catch (error) {
      logger.error('snapshot_save_failed', { error: String(error) });
    }
  }

  loadSnapshot(): Snapshot | null {
    try {
      const stored = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      if (!stored) {
        logger.info('snapshot_not_found');
        return null;
      }

      const snapshot: Snapshot = JSON.parse(stored);
      const age = this.getSnapshotAgeHours(snapshot);

      if (age > MAX_SNAPSHOT_AGE_HOURS) {
        logger.warn('snapshot_too_old', {
          age: age.toFixed(1),
          maxAge: MAX_SNAPSHOT_AGE_HOURS,
        });
        return null;
      }

      logger.info('snapshot_loaded', {
        age: age.toFixed(1),
        source: snapshot.source,
        integrity: snapshot.integrity,
      });

      return snapshot;
    } catch (error) {
      logger.error('snapshot_load_failed', { error: String(error) });
      return null;
    }
  }

  getSnapshotAgeHours(snapshot: Snapshot): number {
    const now = new Date();
    const snapshotTime = new Date(snapshot.timestamp);
    return (now.getTime() - snapshotTime.getTime()) / (1000 * 60 * 60);
  }

  clearSnapshot() {
    localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
    logger.info('snapshot_cleared');
  }

  hasValidSnapshot(): boolean {
    const snapshot = this.loadSnapshot();
    return snapshot !== null;
  }
}

export const snapshotManager = new SnapshotManager();

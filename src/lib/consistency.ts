/**
 * UI-Kohärenz-Checks
 * V25: Automatische Verifikation nach jedem Render
 */

import { logger } from "./logger";

export interface ConsistencyCheckResult {
  passed: boolean;
  violations: string[];
  autoFixed: boolean;
}

/**
 * Prüft Konsistenz zwischen Header, Heatmap, Modal, Trend
 */
export function checkUIConsistency(data: {
  headerScore?: number;
  heatmapScore?: number;
  modalScore?: number;
  trendScore?: number;
  slotLabel: string;
  date: string;
}): ConsistencyCheckResult {
  const violations: string[] = [];
  let autoFixed = false;

  const scores = [
    data.headerScore,
    data.heatmapScore,
    data.modalScore,
    data.trendScore,
  ].filter((s) => s !== undefined) as number[];

  if (scores.length < 2) {
    // Nicht genug Daten für Vergleich
    return { passed: true, violations: [], autoFixed: false };
  }

  // === Rule C1: Alle Scores identisch (Toleranz ±1) ===
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const diff = max - min;

  if (diff > 1) {
    violations.push(
      `Score mismatch for ${data.slotLabel} (${data.date}): min=${min}, max=${max}, diff=${diff}`
    );

    logger.error("ui_consistency_violation", {
      slotLabel: data.slotLabel,
      date: data.date,
      scores: {
        header: data.headerScore,
        heatmap: data.heatmapScore,
        modal: data.modalScore,
        trend: data.trendScore,
      },
      diff,
    });
  }

  const passed = violations.length === 0;

  if (passed) {
    logger.info("ui_consistency_ok", {
      slotLabel: data.slotLabel,
      date: data.date,
      score: scores[0],
    });
  }

  return {
    passed,
    violations,
    autoFixed,
  };
}

/**
 * Auto-Resync (bei leichten Verstößen)
 */
export function autoResync(reason: string): void {
  logger.warn("ui_auto_resync", { reason });

  // Trigger Re-Render durch Event
  window.dispatchEvent(
    new CustomEvent("fruktan:resync", {
      detail: { reason, timestamp: new Date().toISOString() },
    })
  );
}

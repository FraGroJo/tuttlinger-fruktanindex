/**
 * Heatmap-View: 7 Tage × 3 Zeitfenster mit Klick-Detail-Modal
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "./RiskBadge";
import { DetailModal } from "./DetailModal";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DayMatrix, TimeSlot } from "@/types/fruktan";

interface HeatmapViewProps {
  days: DayMatrix[];
  className?: string;
}

const TIME_SLOTS: { key: TimeSlot; label: string }[] = [
  { key: "morning", label: "Morgen\n05-11h" },
  { key: "noon", label: "Mittag\n11-16h" },
  { key: "evening", label: "Abend\n16-21h" },
];

export function HeatmapView({ days, className = "" }: HeatmapViewProps) {
  const [selectedSlot, setSelectedSlot] = useState<{
    day: DayMatrix;
    slot: TimeSlot;
  } | null>(null);

  const getRiskColor = (level: string, score: number): string => {
    switch (level) {
      case "safe":
        // Noch deutlichere Abstufungen innerhalb "Sicher" (0-29)
        if (score <= 8) return "bg-green-200 hover:bg-green-300"; // Sehr niedrig
        if (score <= 16) return "bg-green-300 hover:bg-green-400"; // Niedrig
        if (score <= 24) return "bg-green-500 hover:bg-green-600"; // Mittel
        return "bg-green-600 hover:bg-green-700"; // Grenzwertig
      case "moderate":
        // Deutliche Abstufungen innerhalb "Erhöht" (30-59)
        if (score <= 38) return "bg-yellow-300 hover:bg-yellow-400"; // Leicht erhöht
        if (score <= 46) return "bg-yellow-500 hover:bg-yellow-600"; // Erhöht
        if (score <= 54) return "bg-orange-500 hover:bg-orange-600"; // Stark erhöht
        return "bg-orange-600 hover:bg-orange-700"; // Sehr stark erhöht
      case "high":
        // Deutliche Abstufungen innerhalb "Riskant" (≥60)
        if (score <= 70) return "bg-red-500 hover:bg-red-600"; // Riskant
        if (score <= 80) return "bg-red-600 hover:bg-red-700"; // Sehr riskant
        if (score <= 90) return "bg-red-700 hover:bg-red-800"; // Extrem riskant
        return "bg-red-900 hover:bg-red-950"; // Kritisch
      default:
        return "bg-gray-300 hover:bg-gray-400";
    }
  };

  // Berechne Trend im Vergleich zum vorherigen Zeitfenster
  const getTrend = (dayIndex: number, slotKey: TimeSlot): { icon: any; diff: number } | null => {
    const currentDay = days[dayIndex];
    const currentSlot = currentDay[slotKey];
    
    if (!currentSlot) return null;

    // Vergleiche mit vorherigem Slot (innerhalb des Tages oder vom Vortag)
    let previousScore: number | null = null;

    if (slotKey === "noon") {
      previousScore = currentDay.morning?.score || null;
    } else if (slotKey === "evening") {
      previousScore = currentDay.noon?.score || null;
    } else if (slotKey === "morning" && dayIndex > 0) {
      previousScore = days[dayIndex - 1].evening?.score || null;
    }

    if (previousScore === null) return null;

    const diff = currentSlot.score - previousScore;

    if (diff > 3) return { icon: TrendingUp, diff };
    if (diff < -3) return { icon: TrendingDown, diff };
    return { icon: Minus, diff };
  };

  return (
    <>
      <Card className={`p-4 ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold">7-Tage Heatmap</h3>
          <p className="text-sm text-muted-foreground">
            Klicken Sie auf eine Zelle für Details
          </p>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Header Row */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div className="text-xs font-medium text-muted-foreground"></div>
              {TIME_SLOTS.map(({ label }) => (
                <div
                  key={label}
                  className="text-xs font-medium text-center whitespace-pre-line"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {days.map((day, dayIndex) => (
              <div key={day.date} className="grid grid-cols-4 gap-2 mb-2">
                {/* Date Label */}
                <div className="flex items-center text-xs font-medium">
                  <div>
                    <div className="font-semibold">{day.date}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {day.weekday}
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                {TIME_SLOTS.map(({ key }) => {
                  const slot = day[key];
                  const trend = getTrend(dayIndex, key);

                  if (!slot) {
                    return (
                      <div
                        key={key}
                        className="aspect-square rounded bg-gray-100 flex items-center justify-center"
                      >
                        <span className="text-xs text-gray-400">—</span>
                      </div>
                    );
                  }

                  const TrendIcon = trend?.icon;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedSlot({ day, slot: key })}
                      className={`aspect-square rounded ${getRiskColor(
                        slot.level,
                        slot.score
                      )} transition-all cursor-pointer flex flex-col items-center justify-center text-white font-medium shadow-sm hover:shadow-md relative group`}
                      title={`${day.date} ${key}: ${slot.score} (${slot.level})${trend ? `\nTrend: ${trend.diff > 0 ? '+' : ''}${trend.diff.toFixed(0)}` : ''}`}
                    >
                      {/* Score */}
                      <div className="text-lg font-bold">{Math.round(slot.score)}</div>
                      
                      {/* Temperatur */}
                      <div className="text-[10px] opacity-90">
                        {(slot.tempSpectrum?.median || slot.temperature_spectrum?.median || 0).toFixed(0)}°C
                      </div>

                      {/* Trend-Icon */}
                      {TrendIcon && (
                        <div className="absolute top-0.5 right-0.5 opacity-70">
                          <TrendIcon className="w-3 h-3" />
                        </div>
                      )}

                      {/* Intensitäts-Balken am unteren Rand */}
                      <div 
                        className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b"
                        style={{ width: `${Math.min(100, (slot.score / 100) * 100)}%` }}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t space-y-3">
          {/* Farblegende */}
          <div>
            <div className="text-xs font-semibold mb-2">Risiko-Abstufungen:</div>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="w-3 h-4 rounded-l bg-green-200"></div>
                  <div className="w-3 h-4 bg-green-300"></div>
                  <div className="w-3 h-4 bg-green-500"></div>
                  <div className="w-3 h-4 rounded-r bg-green-600"></div>
                </div>
                <span>Sicher (0-29)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="w-3 h-4 rounded-l bg-yellow-300"></div>
                  <div className="w-3 h-4 bg-yellow-500"></div>
                  <div className="w-3 h-4 bg-orange-500"></div>
                  <div className="w-3 h-4 rounded-r bg-orange-600"></div>
                </div>
                <span>Erhöht (30-59)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  <div className="w-3 h-4 rounded-l bg-red-500"></div>
                  <div className="w-3 h-4 bg-red-600"></div>
                  <div className="w-3 h-4 bg-red-700"></div>
                  <div className="w-3 h-4 rounded-r bg-red-900"></div>
                </div>
                <span>Riskant (≥60)</span>
              </div>
            </div>
          </div>

          {/* Trend-Legende */}
          <div>
            <div className="text-xs font-semibold mb-2">Trend-Indikatoren:</div>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                <span>Steigend (+3)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Minus className="w-3 h-3" />
                <span>Stabil (±3)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3 h-3" />
                <span>Fallend (-3)</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedSlot && (
        <DetailModal
          day={selectedSlot.day}
          slot={selectedSlot.slot}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </>
  );
}

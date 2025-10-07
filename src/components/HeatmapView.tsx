/**
 * Heatmap-View: 7 Tage × 3 Zeitfenster mit Klick-Detail-Modal
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "./RiskBadge";
import { DetailModal } from "./DetailModal";
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
        // Abstufungen innerhalb "Sicher" (0-29)
        if (score <= 10) return "bg-green-300 hover:bg-green-400"; // Sehr sicher
        if (score <= 20) return "bg-green-400 hover:bg-green-500"; // Sicher
        return "bg-green-500 hover:bg-green-600"; // Noch sicher, aber höher
      case "moderate":
        // Abstufungen innerhalb "Erhöht" (30-59)
        if (score <= 40) return "bg-yellow-400 hover:bg-yellow-500"; // Leicht erhöht
        if (score <= 50) return "bg-yellow-500 hover:bg-yellow-600"; // Erhöht
        return "bg-yellow-600 hover:bg-yellow-700"; // Stark erhöht
      case "high":
        // Abstufungen innerhalb "Riskant" (≥60)
        if (score <= 70) return "bg-red-500 hover:bg-red-600"; // Riskant
        if (score <= 85) return "bg-red-600 hover:bg-red-700"; // Sehr riskant
        return "bg-red-700 hover:bg-red-800"; // Extrem riskant
      default:
        return "bg-gray-300 hover:bg-gray-400";
    }
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
            {days.map((day) => (
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

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedSlot({ day, slot: key })}
                      className={`aspect-square rounded ${getRiskColor(
                        slot.level,
                        slot.score
                      )} transition-all cursor-pointer flex flex-col items-center justify-center text-white font-medium shadow-sm hover:shadow-md`}
                      title={`${day.date} ${key}: ${slot.score} (${slot.level})`}
                    >
                      <div className="text-lg">{Math.round(slot.score)}</div>
                      <div className="text-[10px] opacity-90">
                        {(slot.tempSpectrum?.median || slot.temperature_spectrum?.median || 0).toFixed(0)}°C
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-3 h-4 rounded-l bg-green-300"></div>
                <div className="w-3 h-4 bg-green-400"></div>
                <div className="w-3 h-4 rounded-r bg-green-500"></div>
              </div>
              <span>Sicher (0-29)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-3 h-4 rounded-l bg-yellow-400"></div>
                <div className="w-3 h-4 bg-yellow-500"></div>
                <div className="w-3 h-4 rounded-r bg-yellow-600"></div>
              </div>
              <span>Erhöht (30-59)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                <div className="w-3 h-4 rounded-l bg-red-500"></div>
                <div className="w-3 h-4 bg-red-600"></div>
                <div className="w-3 h-4 rounded-r bg-red-700"></div>
              </div>
              <span>Riskant (≥60)</span>
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

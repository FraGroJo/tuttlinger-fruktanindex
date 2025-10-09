/**
 * Heatmap-View: 7 Tage × 3 Zeitfenster mit Klick-Detail-Modal
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "./RiskBadge";
import { DetailModal } from "./DetailModal";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { DayMatrix, TimeSlot, SourceMetadata } from "@/types/fruktan";

interface HeatmapViewProps {
  days: DayMatrix[];
  sourceMetadata?: SourceMetadata; // Jetzt SourceMetadata statt string
  className?: string;
}

const TIME_SLOTS: { key: TimeSlot; label: string }[] = [
  { key: "morning", label: "Morgen\n05-11h" },
  { key: "noon", label: "Mittag\n11-16h" },
  { key: "evening", label: "Abend\n16-21h" },
];

export function HeatmapView({ days, sourceMetadata, className = "" }: HeatmapViewProps) {
  const [selectedSlot, setSelectedSlot] = useState<{
    dayIndex: number;
    slotIndex: number;
  } | null>(null);

  // Navigation zwischen Slots
  const handleNavigate = (direction: "prev" | "next") => {
    if (!selectedSlot) return;

    const { dayIndex, slotIndex } = selectedSlot;
    const totalSlots = 3; // morning, noon, evening
    const totalDays = days.length;

    let newDayIndex = dayIndex;
    let newSlotIndex = slotIndex;

    if (direction === "next") {
      newSlotIndex++;
      if (newSlotIndex >= totalSlots) {
        newSlotIndex = 0;
        newDayIndex++;
        if (newDayIndex >= totalDays) {
          newDayIndex = 0; // Wrap to first day
        }
      }
    } else {
      newSlotIndex--;
      if (newSlotIndex < 0) {
        newSlotIndex = totalSlots - 1;
        newDayIndex--;
        if (newDayIndex < 0) {
          newDayIndex = totalDays - 1; // Wrap to last day
        }
      }
    }

    setSelectedSlot({ dayIndex: newDayIndex, slotIndex: newSlotIndex });
  };

  const getRiskColor = (level: string, score: number): string => {
    switch (level) {
      case "safe":
        // Sehr deutliche Grün-Abstufungen (0-29)
        if (score <= 8) return "bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-900 border-2 border-emerald-300"; // Sehr niedrig
        if (score <= 16) return "bg-gradient-to-br from-emerald-300 to-emerald-400 text-white border-2 border-emerald-500"; // Niedrig
        if (score <= 24) return "bg-gradient-to-br from-green-500 to-green-600 text-white border-2 border-green-700"; // Mittel
        return "bg-gradient-to-br from-green-700 to-green-800 text-white border-2 border-green-900"; // Grenzwertig
      case "moderate":
        // Sehr deutliche Gelb/Orange-Abstufungen (30-59)
        if (score <= 38) return "bg-gradient-to-br from-yellow-300 to-yellow-400 text-yellow-900 border-2 border-yellow-500"; // Leicht erhöht
        if (score <= 46) return "bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-2 border-yellow-700"; // Erhöht
        if (score <= 54) return "bg-gradient-to-br from-orange-500 to-orange-600 text-white border-2 border-orange-700"; // Stark erhöht
        return "bg-gradient-to-br from-orange-700 to-orange-800 text-white border-2 border-orange-900"; // Sehr stark erhöht
      case "high":
        // Sehr deutliche Rot-Abstufungen (≥60)
        if (score <= 70) return "bg-gradient-to-br from-red-500 to-red-600 text-white border-2 border-red-700"; // Riskant
        if (score <= 80) return "bg-gradient-to-br from-red-600 to-red-700 text-white border-2 border-red-800"; // Sehr riskant
        if (score <= 90) return "bg-gradient-to-br from-red-700 to-red-800 text-white border-2 border-red-900"; // Extrem riskant
        return "bg-gradient-to-br from-red-900 to-red-950 text-white border-2 border-black"; // Kritisch
      default:
        return "bg-gray-200 text-gray-600 border-2 border-gray-400";
    }
  };

  const getHoverEffect = (level: string): string => {
    switch (level) {
      case "safe": return "hover:scale-105 hover:shadow-lg hover:shadow-green-500/50";
      case "moderate": return "hover:scale-105 hover:shadow-lg hover:shadow-orange-500/50";
      case "high": return "hover:scale-105 hover:shadow-lg hover:shadow-red-500/50";
      default: return "hover:scale-105";
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
        <div className="overflow-x-auto bg-gradient-to-br from-muted/30 to-background p-2 md:p-4 rounded-lg">
          <div className="inline-block min-w-full">
            {/* Header Row */}
            <div className="grid grid-cols-4 gap-1.5 md:gap-3 mb-2 md:mb-3">
              <div className="text-xs font-medium text-muted-foreground"></div>
              {TIME_SLOTS.map(({ label }) => (
                <div
                  key={label}
                  className="text-[10px] md:text-xs font-bold text-center whitespace-pre-line bg-primary/10 rounded-md py-1 md:py-2 px-0.5 md:px-1"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {days.map((day, dayIndex) => (
              <div key={day.date} className="grid grid-cols-4 gap-1.5 md:gap-3 mb-2 md:mb-3">
                {/* Date Label */}
                <div className="flex items-center text-xs font-bold bg-gradient-to-r from-primary/10 to-transparent rounded-md px-1 md:px-2 py-1">
                  <div>
                    <div className="font-black text-[11px] md:text-sm">{day.date}</div>
                    <div className="text-muted-foreground text-[9px] md:text-[10px] font-normal">
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
                        className="aspect-square rounded bg-gray-100 flex items-center justify-center min-h-[60px] md:min-h-[80px]"
                      >
                        <span className="text-[10px] md:text-xs text-gray-400">—</span>
                      </div>
                    );
                  }

                  const TrendIcon = trend?.icon;

                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setSelectedSlot({
                          dayIndex,
                          slotIndex: TIME_SLOTS.findIndex((s) => s.key === key),
                        })
                      }
                      className={`aspect-square min-h-[60px] md:min-h-[80px] rounded-lg ${getRiskColor(
                        slot.level,
                        slot.score
                      )} ${getHoverEffect(slot.level)} transition-all duration-200 cursor-pointer flex flex-col items-center justify-center font-bold shadow-md relative group`}
                      title={`${day.date} ${key}: ${slot.score} (${slot.level})${trend ? `\nTrend: ${trend.diff > 0 ? '+' : ''}${trend.diff.toFixed(0)}` : ''}`}
                    >
                      {/* Score - responsive sizing */}
                      <div className="text-lg md:text-2xl font-black drop-shadow-sm">
                        {Math.round(slot.score)}
                      </div>
                      
                      {/* Temperatur - responsive sizing */}
                      <div className="text-[10px] md:text-xs font-semibold mt-0.5 drop-shadow-sm">
                        {(slot.tempSpectrum?.median || slot.temperature_spectrum?.median || 0).toFixed(0)}°C
                      </div>

                      {/* Trend-Icon - responsive sizing */}
                      {TrendIcon && (
                        <div className="absolute top-0.5 md:top-1 right-0.5 md:right-1 bg-black/20 rounded-full p-0.5 backdrop-blur-sm">
                          <TrendIcon className="w-3 h-3 md:w-4 md:h-4 drop-shadow" />
                        </div>
                      )}

                      {/* Intensitäts-Balken - responsive sizing */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 md:h-1.5 bg-black/20 rounded-b-lg overflow-hidden">
                        <div 
                          className="h-full bg-white/60"
                          style={{ width: `${Math.min(100, (slot.score / 100) * 100)}%` }}
                        />
                      </div>

                      {/* Puls-Effekt bei hohem Score */}
                      {slot.score >= 60 && (
                        <div className="absolute inset-0 rounded-lg animate-pulse bg-white/10" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t-2 space-y-3 md:space-y-4">
          {/* Farblegende */}
          <div>
            <div className="text-xs md:text-sm font-bold mb-2 md:mb-3 flex items-center gap-2">
              <div className="w-0.5 md:w-1 h-4 md:h-5 bg-gradient-to-b from-primary to-primary/50 rounded" />
              Risiko-Abstufungen
            </div>
            <div className="flex flex-wrap gap-2 md:gap-4 text-[10px] md:text-xs">
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="flex gap-0.5 md:gap-1 shadow-md rounded-lg overflow-hidden">
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-emerald-100 to-emerald-200 border-r border-emerald-300"></div>
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-emerald-300 to-emerald-400 border-r border-emerald-500"></div>
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-green-500 to-green-600 border-r border-green-700"></div>
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-green-700 to-green-800"></div>
                </div>
                <span className="font-semibold">Sicher (0-29)</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="flex gap-0.5 md:gap-1 shadow-md rounded-lg overflow-hidden">
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-yellow-300 to-yellow-400 border-r border-yellow-500"></div>
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-yellow-500 to-yellow-600 border-r border-yellow-700"></div>
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-orange-500 to-orange-600 border-r border-orange-700"></div>
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-orange-700 to-orange-800"></div>
                </div>
                <span className="font-semibold">Erhöht (30-59)</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="flex gap-0.5 md:gap-1 shadow-md rounded-lg overflow-hidden">
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-red-500 to-red-600 border-r border-red-700"></div>
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-red-600 to-red-700 border-r border-red-800"></div>
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-red-700 to-red-800 border-r border-red-900"></div>
                  <div className="w-3 h-4 md:w-4 md:h-6 bg-gradient-to-br from-red-900 to-red-950"></div>
                </div>
                <span className="font-semibold">Riskant (≥60)</span>
              </div>
            </div>
          </div>

          {/* Trend-Legende */}
          <div>
            <div className="text-xs md:text-sm font-bold mb-2 md:mb-3 flex items-center gap-2">
              <div className="w-0.5 md:w-1 h-4 md:h-5 bg-gradient-to-b from-primary to-primary/50 rounded" />
              Trend-Indikatoren
            </div>
            <div className="flex flex-wrap gap-2 md:gap-4 text-[10px] md:text-xs">
              <div className="flex items-center gap-1.5 md:gap-2 bg-green-50 px-2 py-1 md:px-3 md:py-1.5 rounded-md">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                <span className="font-semibold">Steigend (+3)</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 bg-gray-50 px-2 py-1 md:px-3 md:py-1.5 rounded-md">
                <Minus className="w-3 h-3 md:w-4 md:h-4 text-gray-600" />
                <span className="font-semibold">Stabil (±3)</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2 bg-blue-50 px-2 py-1 md:px-3 md:py-1.5 rounded-md">
                <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                <span className="font-semibold">Fallend (-3)</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedSlot && sourceMetadata && (
        <DetailModal
          day={days[selectedSlot.dayIndex]}
          slot={TIME_SLOTS[selectedSlot.slotIndex].key}
          onClose={() => setSelectedSlot(null)}
          onNavigate={handleNavigate}
          sourceMetadata={sourceMetadata}
        />
      )}
    </>
  );
}

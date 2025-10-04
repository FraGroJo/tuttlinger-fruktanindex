/**
 * DayCard Komponente
 * Zeigt die Fruktan-Matrix für einen einzelnen Tag an (3 Zeitfenster)
 */

import { type DayMatrix, type TemperatureSpectrum } from "@/types/fruktan";
import { RiskBadge } from "./RiskBadge";
import { Card } from "./ui/card";
import { Sunrise, Sun, Sunset, Thermometer } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DayCardProps {
  matrix: DayMatrix;
  className?: string;
}

export function DayCard({ matrix, className = "" }: DayCardProps) {
  const slots = [
    { data: matrix.morning, icon: Sunrise, label: "Morgens", time: "05:00–11:00" },
    { data: matrix.noon, icon: Sun, label: "Mittags", time: "11:00–16:00" },
    { data: matrix.evening, icon: Sunset, label: "Abends", time: "16:00–21:00" },
  ];

  // Datum formatieren
  const date = new Date(matrix.date);
  const formattedDate = date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

  // Heute/Morgen/Übermorgen Label
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  let dayLabel = formattedDate;
  if (diffDays === 0) dayLabel = "Heute";
  else if (diffDays === 1) dayLabel = "Morgen";
  else if (diffDays === 2) dayLabel = "Übermorgen";

  return (
    <Card className={`overflow-hidden backdrop-blur-sm bg-card/80 border-2 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl sm:rounded-2xl ${className}`}>
      {/* Header mit Glassmorphism */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 sm:px-6 py-3 sm:py-4 border-b border-border/50 backdrop-blur-sm">
        <h3 className="font-bold text-foreground text-base sm:text-lg md:text-xl tracking-tight">{dayLabel}</h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{formattedDate}</p>
      </div>

      {/* Zeitfenster */}
      <div className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-5">
        {slots.map(({ data, icon: Icon, label, time }) => {
          const keyFactors = getKeyFactors(data.reason);
          const hasWarnings = data.flags && (data.flags.length > 0 || data.confidence === "low");

          return (
            <div
              key={data.slot}
              className="p-3 sm:p-4 md:p-5 rounded-lg sm:rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/30 transition-all duration-200 border border-border/50 shadow-sm"
            >
              {/* Slot-Header */}
              <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm sm:text-base font-semibold text-foreground block truncate">{label}</span>
                    <p className="text-xs text-muted-foreground">{time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground cursor-help">
                          {data.temperature_spectrum?.median !== undefined 
                            ? `${data.temperature_spectrum.median.toFixed(1)}°`
                            : "—"}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Median-Temperatur im Zeitfenster ({time})
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <RiskBadge level={data.level} score={data.score} />
                </div>
              </div>

              {/* Begründung */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {data.reason}
              </p>

              {/* Temperatur-Spektrum */}
              {data.temperature_spectrum && (
                <TemperatureSpectrumBar spectrum={data.temperature_spectrum} />
              )}

              {/* Key Factors */}
              {keyFactors.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {keyFactors.map((factor, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/15 text-primary border border-primary/30 shadow-sm"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              )}

              {/* Validierungs-Warnung */}
              {hasWarnings && (
                <div className="mt-3 p-2 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-xs text-warning font-medium flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-warning"></span>
                    Eingeschränkte Datenqualität
                    {data.confidence === "low" && " • Vertrauen: niedrig"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/**
 * Temperatur-Spektrum-Leiste
 */
function TemperatureSpectrumBar({ spectrum }: { spectrum: TemperatureSpectrum }) {
  // Safe-guards gegen undefined/NaN
  const min = spectrum.min ?? 0;
  const max = spectrum.max ?? 0;
  const median = spectrum.median ?? ((min + max) / 2);
  
  const range = max - min;
  const medianPercent = range > 0 ? ((median - min) / range) * 100 : 50;
  
  // Zahlformatierung
  const formatTemp = (temp: number) => {
    return new Intl.NumberFormat('de-DE', { 
      minimumFractionDigits: 1, 
      maximumFractionDigits: 1 
    }).format(temp);
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="my-3 p-3 rounded-lg bg-background/40 border border-border/40 cursor-help">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Temperaturspanne</span>
            </div>
            <div className="relative h-7 bg-gradient-to-r from-blue-500/20 via-yellow-500/20 to-red-500/20 rounded-full overflow-hidden">
              {/* Min-Max Linie */}
              <div className="absolute inset-0 flex items-center px-3">
                <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 rounded-full" />
              </div>
              
              {/* Median Marker */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-foreground rounded-full border-2 border-background shadow-lg ring-2 ring-primary/20"
                style={{ left: `${medianPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-sm">
              <span className="text-muted-foreground font-medium">{formatTemp(min)}°C</span>
              <span className="font-bold text-foreground">⌀ {formatTemp(median)}°C</span>
              <span className="text-muted-foreground font-medium">{formatTemp(max)}°C</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <div>Min: {formatTemp(min)}°C</div>
            <div>Median: {formatTemp(median)}°C</div>
            <div>Max: {formatTemp(max)}°C</div>
            {spectrum.p10 !== undefined && <div>P10: {formatTemp(spectrum.p10)}°C</div>}
            {spectrum.p90 !== undefined && <div>P90: {formatTemp(spectrum.p90)}°C</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Extrahiert Schlüsselwörter aus der Begründung für Mini-Annotationen
 */
function getKeyFactors(reason: string): string[] {
  const factors: string[] = [];
  
  const keywords = [
    { pattern: /frost/i, label: "❄️ Frost" },
    { pattern: /kalt/i, label: "🌡️ Kalt" },
    { pattern: /sonn|strahl|einstrahlung/i, label: "☀️ Sonne" },
    { pattern: /et0|verdunstung|trockenstress|trocken/i, label: "💧 Trockenstress" },
    { pattern: /bewölk|wolken/i, label: "☁️ Bewölkung" },
    { pattern: /niederschlag|regen/i, label: "🌧️ Niederschlag" },
    { pattern: /wind/i, label: "💨 Wind" },
    { pattern: /günstig|gering/i, label: "✅ Günstig" },
  ];
  
  keywords.forEach(({ pattern, label }) => {
    if (pattern.test(reason) && !factors.includes(label)) {
      factors.push(label);
    }
  });
  
  return factors.slice(0, 3); // Max 3 Faktoren anzeigen
}

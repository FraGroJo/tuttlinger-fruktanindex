/**
 * DayCard Komponente (kompakte UX-Version)
 * Zeigt 3 Zeitfenster nebeneinander mit Icons, Temperatur, Score und sichtbaren Min/Median/Max Werten
 */

import { motion } from "framer-motion";
import { type DayMatrix, type TemperatureSpectrum, type TimeSlotScore } from "@/types/fruktan";
import { RiskBadge } from "./RiskBadge";
import { Card } from "./ui/card";
import { Sunrise, Sun, Sunset, Thermometer, Cloud, CloudRain, Snowflake } from "lucide-react";
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
  const slots: Array<{
    data: TimeSlotScore;
    icon: typeof Sunrise;
    label: string;
    time: string;
  }> = [
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

  // Heute/Morgen/Übermorgen/Tag 3/etc Label
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  let dayLabel = formattedDate;
  if (diffDays === 0) dayLabel = "Heute";
  else if (diffDays === 1) dayLabel = "Morgen";
  else if (diffDays === 2) dayLabel = "Übermorgen";
  else if (diffDays >= 3) dayLabel = `Tag ${diffDays}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className={`overflow-hidden backdrop-blur-sm bg-card/90 border shadow-lg rounded-2xl ${className}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-foreground text-lg">{dayLabel}</h3>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              Stand: {new Date().toLocaleTimeString("de-DE", { 
                hour: "2-digit", 
                minute: "2-digit",
                timeZone: "Europe/Berlin"
              })}
            </div>
          </div>
        </div>

        {/* 3 Segmente nebeneinander */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
          {slots.map(({ data, icon: Icon, label, time }) => {
            const weatherIcon = getWeatherIcon(data);
            
            return (
              <TooltipProvider key={data.slot}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-4 hover:bg-muted/20 transition-colors cursor-help">
                      {/* Icon & Label */}
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                        {weatherIcon && (
                          <span className="ml-auto">{weatherIcon}</span>
                        )}
                      </div>

                      {/* Temperatur & Score */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-3xl font-bold text-foreground">
                          {data.temperature_spectrum?.median !== undefined 
                            ? `${data.temperature_spectrum.median.toFixed(1)}°`
                            : "—"}
                        </div>
                        <RiskBadge level={data.level} score={data.score} className="scale-90" />
                      </div>

                      {/* Temperatur-Bar mit Min/Median/Max Werten */}
                      {data.temperature_spectrum && (
                        <TempBarWithLabels spectrum={data.temperature_spectrum} />
                      )}
                      
                      {/* Reason Text */}
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                        {data.reason.split('\n')[0]}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="text-xs space-y-1">
                      <p className="font-semibold">{label} ({time})</p>
                      <p className="font-medium">Score: {data.score} - {data.level === 'safe' ? 'Sicher' : data.level === 'moderate' ? 'Erhöht' : 'Hoch'}</p>
                      {data.temperature_spectrum && (
                        <p>Temp-Spektrum: {data.temperature_spectrum.min.toFixed(1)}° – {data.temperature_spectrum.median.toFixed(1)}° – {data.temperature_spectrum.max.toFixed(1)}°</p>
                      )}
                      <p className="text-muted-foreground leading-relaxed mt-1">{data.reason}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Temperatur-Bar mit sichtbaren Min/Median/Max Werten
 */
function TempBarWithLabels({ spectrum }: { spectrum: TemperatureSpectrum }) {
  const min = spectrum.min ?? 0;
  const max = spectrum.max ?? 0;
  const median = spectrum.median ?? ((min + max) / 2);
  
  const range = max - min;
  const medianPercent = range > 0 ? ((median - min) / range) * 100 : 50;
  
  return (
    <div className="space-y-1">
      {/* Bar */}
      <div className="relative h-2 bg-gradient-to-r from-blue-400/20 via-yellow-400/20 to-red-400/20 rounded-full overflow-hidden">
        {/* Median Marker */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rounded-full border border-background"
          style={{ left: `${medianPercent}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min.toFixed(1)}°</span>
        <span className="font-medium">{median.toFixed(1)}°</span>
        <span>{max.toFixed(1)}°</span>
      </div>
    </div>
  );
}

/**
 * Wetter-Icon basierend auf Bedingungen
 */
function getWeatherIcon(data: TimeSlotScore): JSX.Element | null {
  const reason = data.reason.toLowerCase();
  
  if (reason.includes("frost") || data.temperature_spectrum?.min !== undefined && data.temperature_spectrum.min <= 0) {
    return <Snowflake className="w-4 h-4 text-blue-400" />;
  }
  
  if (reason.includes("niederschlag") || reason.includes("regen")) {
    return <CloudRain className="w-4 h-4 text-blue-500" />;
  }
  
  if (reason.includes("bewölk") || reason.includes("wolken")) {
    return <Cloud className="w-4 h-4 text-slate-400" />;
  }
  
  if (reason.includes("sonn") || reason.includes("strahl")) {
    return <Sun className="w-4 h-4 text-yellow-500" />;
  }
  
  return null;
}

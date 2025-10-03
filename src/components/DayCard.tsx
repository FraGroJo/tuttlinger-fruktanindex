/**
 * DayCard Komponente
 * Zeigt die Fruktan-Matrix für einen einzelnen Tag an (3 Zeitfenster)
 */

import { type DayMatrix } from "@/types/fruktan";
import { RiskBadge } from "./RiskBadge";
import { Card } from "./ui/card";
import { Sunrise, Sun, Sunset } from "lucide-react";

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
    <Card className={`overflow-hidden backdrop-blur-sm bg-card/80 border-2 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl ${className}`}>
      {/* Header mit Glassmorphism */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-3 border-b border-border/50 backdrop-blur-sm">
        <h3 className="font-semibold text-foreground text-lg">{dayLabel}</h3>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>

      {/* Zeitfenster */}
      <div className="p-5 space-y-4">
        {slots.map(({ data, icon: Icon, label, time }) => {
          const keyFactors = getKeyFactors(data.reason);
          const hasWarnings = data.flags && (data.flags.length > 0 || data.confidence === "low");

          return (
            <div
              key={data.slot}
              className="p-4 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 hover:from-muted/60 hover:to-muted/30 transition-all duration-200 border border-border/50"
            >
              {/* Slot-Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    <p className="text-xs text-muted-foreground">{time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-foreground">
                    {data.score}
                  </span>
                  <RiskBadge level={data.level} score={data.score} />
                </div>
              </div>

              {/* Begründung */}
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {data.reason}
              </p>

              {/* Key Factors */}
              {keyFactors.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
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

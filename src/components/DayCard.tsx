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
    <Card className={`p-6 hover:shadow-lg transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="mb-4 border-b pb-3">
        <h3 className="text-lg font-semibold text-foreground">{dayLabel}</h3>
        <p className="text-sm text-muted-foreground">{formattedDate}</p>
      </div>

      {/* Zeitfenster */}
      <div className="space-y-4">
        {slots.map(({ data, icon: Icon, label, time }) => (
          <div key={data.slot} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="flex-shrink-0 mt-1">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{time}</p>
                </div>
                <RiskBadge level={data.level} score={data.score} />
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

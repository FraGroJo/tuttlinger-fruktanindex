/**
 * RiskBadge Komponente
 * Zeigt einen farbcodierten Badge mit Ampel-Status an
 */

import { type RiskLevel } from "@/types/fruktan";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface RiskBadgeProps {
  level: RiskLevel;
  score: number;
  className?: string;
}

export function RiskBadge({ level, score, className = "" }: RiskBadgeProps) {
  const config = {
    safe: {
      bg: "bg-risk-safe-bg",
      text: "text-risk-safe",
      icon: CheckCircle,
      label: "Sicher",
    },
    moderate: {
      bg: "bg-risk-moderate-bg",
      text: "text-risk-moderate",
      icon: AlertTriangle,
      label: "Erhöht",
    },
    high: {
      bg: "bg-risk-high-bg",
      text: "text-risk-high",
      icon: XCircle,
      label: "Hoch",
    },
  };

  const { bg, text, icon: Icon, label } = config[level];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${bg} ${text} font-medium text-sm transition-all duration-300 ${className}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      <span className="ml-1 font-semibold">{score}</span>
    </div>
  );
}

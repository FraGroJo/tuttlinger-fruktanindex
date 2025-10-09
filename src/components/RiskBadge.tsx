/**
 * RiskBadge Komponente
 * Zeigt einen farbcodierten Badge mit Ampel-Status an
 */

import { type RiskLevel } from "@/types/fruktan";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  emsMode?: boolean;
  className?: string;
}

export function RiskBadge({ level, score, emsMode, className = "" }: RiskBadgeProps) {
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
  
  // ARIA label for accessibility
  const ariaLabel = `Fruktan-Score ${score !== undefined ? Math.round(score) : ''}, ${label}`;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${bg} ${text} font-medium text-sm transition-all duration-300 ${className}`}
      aria-label={ariaLabel}
      role="status"
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {score !== undefined && <span className="ml-1 font-semibold">{Math.round(score)}</span>}
    </div>
  );
}

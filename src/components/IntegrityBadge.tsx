/**
 * Integrity Badge - Zeigt Safe-Display Status
 * V25: Sichtbare, ehrliche Kommunikation
 */

import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import type { SafeDisplayStatus } from "@/lib/guard";

interface IntegrityBadgeProps {
  status: SafeDisplayStatus;
  className?: string;
}

export function IntegrityBadge({ status, className = "" }: IntegrityBadgeProps) {
  const getIcon = () => {
    switch (status.state) {
      case "ok":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case "blocked":
        return <ShieldAlert className="w-3.5 h-3.5" />;
    }
  };

  const getVariant = () => {
    switch (status.state) {
      case "ok":
        return "default";
      case "warning":
        return "outline";
      case "blocked":
        return "destructive";
    }
  };

  const getColor = () => {
    switch (status.state) {
      case "ok":
        return "text-green-600 border-green-300 bg-green-50";
      case "warning":
        return "text-amber-600 border-amber-300 bg-amber-50";
      case "blocked":
        return "text-red-600 border-red-300 bg-red-50";
    }
  };

  const getEmoji = () => {
    switch (status.state) {
      case "ok":
        return "🟢";
      case "warning":
        return "🟡";
      case "blocked":
        return "🔴";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={getVariant()}
            className={`gap-1.5 cursor-help border ${getColor()} ${className}`}
          >
            {getIcon()}
            <span className="text-xs font-medium">
              {getEmoji()} {status.message}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <p className="font-semibold">{status.message}</p>
            {status.details && status.details.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium">Details:</p>
                <ul className="text-xs space-y-0.5 list-disc list-inside">
                  {status.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
            {status.state === "ok" && (
              <p className="text-xs text-muted-foreground">
                Alle Validierungen bestanden • Datenintegrität 100 %
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

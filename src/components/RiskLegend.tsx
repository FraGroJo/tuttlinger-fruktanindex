/**
 * Globale Legende für Fruktan-Risikofarben
 */

import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

export function RiskLegend() {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6 p-3 sm:p-4 bg-muted/30 rounded-lg border mb-4 sm:mb-6">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-risk-safe" />
        <span className="text-sm font-medium">
          <span className="text-risk-safe">0–29</span>
          <span className="text-muted-foreground ml-1">Sicher</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-risk-moderate" />
        <span className="text-sm font-medium">
          <span className="text-risk-moderate">30–59</span>
          <span className="text-muted-foreground ml-1">Erhöht</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <XCircle className="w-4 h-4 text-risk-high" />
        <span className="text-sm font-medium">
          <span className="text-risk-high">≥60</span>
          <span className="text-muted-foreground ml-1">Risiko</span>
        </span>
      </div>
    </div>
  );
}

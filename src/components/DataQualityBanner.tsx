/**
 * Phase 2: Banner für Datenqualität und Validierungsstatus
 */

import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface DataQualityBannerProps {
  confidence: 'normal' | 'low';
  source: string;
  fallbackUsed?: boolean;
  validationStatus?: 'validating' | 'ok' | 'error';
}

export function DataQualityBanner({ 
  confidence, 
  source, 
  fallbackUsed,
  validationStatus = 'ok' 
}: DataQualityBannerProps) {
  
  // Validierung läuft
  if (validationStatus === 'validating') {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <Clock className="h-4 w-4" />
        <AlertDescription>
          🕓 Werte werden geprüft – Ergebnis folgt in &lt; 60 s
        </AlertDescription>
      </Alert>
    );
  }

  // Fallback aktiv
  if (fallbackUsed) {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          ⚠️ Fallback-Modell aktiv – Daten werden validiert
        </AlertDescription>
      </Alert>
    );
  }

  // Low Confidence
  if (confidence === 'low') {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          ⚠️ Abweichungen zwischen Modellen erkannt – reduzierte Konfidenz
        </AlertDescription>
      </Alert>
    );
  }

  // Alles OK - ICON-D2 aktiv
  if (source.includes('ICON-D2')) {
    return (
      <Alert className="border-success/50 bg-success/10">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          ✅ Datenquelle ICON-D2 [DWD 2.2 km] – Integrität OK
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

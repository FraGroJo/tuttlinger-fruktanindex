/**
 * Banner für Datenqualitätsstatus
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
import { logger } from '@/lib/logger';

interface DataQualityBannerProps {
  integrity: 'ok' | 'degraded';
  apiSyncError: boolean;
  serviceUnavailable: boolean;
  source: string;
}

export function DataQualityBanner({
  integrity,
  apiSyncError,
  serviceUnavailable,
  source,
}: DataQualityBannerProps) {
  const recentFallbacks = logger.getRecentFallbacks(12).length;
  const showInstabilityWarning = recentFallbacks >= 3;

  if (serviceUnavailable) {
    return (
      <Alert variant="destructive" className="mb-4">
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="ml-2">
          <strong>Datenquelle nicht erreichbar</strong> – Die ECMWF-Daten können derzeit nicht
          abgerufen werden. Bitte versuchen Sie es später erneut.
        </AlertDescription>
      </Alert>
    );
  }

  if (apiSyncError && integrity === 'degraded') {
    return (
      <Alert variant="default" className="mb-4 border-yellow-500 bg-yellow-50 text-yellow-900">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="ml-2">
          <strong>Echtzeitdaten eingeschränkt</strong> – Zeige letzten validierten Stand.{' '}
          <span className="text-xs">({source})</span>
        </AlertDescription>
      </Alert>
    );
  }

  if (showInstabilityWarning) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="ml-2">
          <strong>ECMWF-Quelle instabil</strong> – {recentFallbacks} Fallbacks in den letzten 12
          Stunden. Bitte Systemcheck durchführen.
        </AlertDescription>
      </Alert>
    );
  }

  // Success state - optional subtle indicator
  if (integrity === 'ok') {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-3 w-3 text-green-600" />
        <span>Live-Daten synchronisiert – {source}</span>
      </div>
    );
  }

  return null;
}

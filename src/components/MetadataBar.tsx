/**
 * MetadataBar Komponente
 * Zeigt Datenquelle, Stand und Alter der Wetterdaten
 */

import { Clock, Database, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";

interface MetadataBarProps {
  metadata: {
    dataSource: string;
    modelRunTime: string;
    localTimestamp: string;
    timezone: string;
  };
  flags: string[];
  onRefresh?: () => void;
}

export function MetadataBar({ metadata, flags, onRefresh }: MetadataBarProps) {
  const hasWarnings = flags.length > 0;

  return (
    <div className="space-y-2">
      {/* Metadaten-Zeile */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          <span>Quelle: {metadata.dataSource}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>Stand: {metadata.localTimestamp} ({metadata.timezone})</span>
        </div>
      </div>

      {/* Warnungen (falls vorhanden) */}
      {hasWarnings && (
        <div className="flex items-center justify-between gap-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-warning">Datenqualitäts-Hinweise</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground mt-1">
                {flags.map((flag, idx) => (
                  <li key={idx}>{flag.replace(/_/g, " ")}</li>
                ))}
              </ul>
            </div>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex-shrink-0"
            >
              Neu laden
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

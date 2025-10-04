/**
 * MetadataBar Komponente
 * Zeigt Datenquelle und Stand der Wetterdaten
 */

import { Clock, Database } from "lucide-react";

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

export function MetadataBar({ metadata }: MetadataBarProps) {
  return (
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
  );
}

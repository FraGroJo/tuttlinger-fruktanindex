/**
 * Anzeige der aktiven Wetterdatenquelle (ICON-D2 oder ECMWF Fallback)
 * Nutzt SSOT aus sourceMetadata.ts
 */

import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { buildSourceBadge, getSourceIcon, getBadgeClasses, parseDataSource } from '@/lib/sourceMetadata';
import type { SourceMetadata } from '@/types/fruktan';

interface WeatherSourceIndicatorProps {
  source?: string | SourceMetadata; // Legacy string oder SourceMetadata
  fallbackUsed?: boolean;
}

export function WeatherSourceIndicator({ source, fallbackUsed }: WeatherSourceIndicatorProps) {
  // Konvertiere zu SourceMetadata falls nötig
  const sourceMeta: SourceMetadata = typeof source === 'string' 
    ? parseDataSource(source, fallbackUsed)
    : source || {
        provider: 'Open-Meteo',
        model: 'ICON-D2',
        model_run_time_utc: new Date().toISOString(),
        data_timestamp_local: new Date().toISOString(),
        fallback_used: false,
      };
  
  // Baue Badge mit SSOT-Funktion
  const badge = buildSourceBadge(sourceMeta);
  const IconComponent = getSourceIcon(badge);
  
  // Emoji für visuellen Kontext
  const emoji = badge.tone === 'green' ? '🟢' : badge.tone === 'amber' ? '🟡' : '🔵';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`gap-1.5 cursor-help border ${getBadgeClasses(badge.tone)}`}
          >
            <IconComponent className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{emoji} {badge.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{badge.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

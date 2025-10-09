/**
 * Anzeige der aktiven Wetterdatenquelle (ICON-D2 oder ECMWF Fallback)
 */

import { Cloud, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface WeatherSourceIndicatorProps {
  source: string;
  fallbackUsed?: boolean;
}

export function WeatherSourceIndicator({ source, fallbackUsed }: WeatherSourceIndicatorProps) {
  const isIconD2 = source.includes('ICON-D2');
  const isFallback = fallbackUsed || source.includes('Fallback');

  const getStatusConfig = () => {
    if (isIconD2 && !isFallback) {
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        variant: 'default' as const,
        label: 'DWD ICON-D2',
        description: 'Hochauflösendes Regionalmodell für Deutschland (2.2 km Auflösung)',
        color: 'text-green-600',
      };
    }
    
    if (isFallback) {
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        variant: 'secondary' as const,
        label: 'ECMWF [Fallback]',
        description: 'Primärquelle ICON-D2 nicht verfügbar. Globales ECMWF-Modell aktiv.',
        color: 'text-yellow-600',
      };
    }

    return {
      icon: <Cloud className="w-3.5 h-3.5" />,
      variant: 'outline' as const,
      label: 'ECMWF',
      description: 'Europäisches Wettermodell (9 km Auflösung)',
      color: 'text-blue-600',
    };
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="gap-1.5 cursor-help">
            <span className={config.color}>{config.icon}</span>
            <span className="text-xs font-medium">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

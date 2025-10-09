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
    // Normalisiere die Quelle
    const modelName = source.includes('ICON-D2') ? 'DWD ICON-D2' : 
                     source.includes('ECMWF') ? 'ECMWF' : source;
    
    // Primary ICON-D2 Active (kein Fallback)
    if (modelName === 'DWD ICON-D2' && !isFallback) {
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        variant: 'default' as const,
        label: '🟢 DWD ICON-D2',
        description: 'Primäres Wettermodell DWD ICON-D2 (2.2 km Auflösung)',
        color: 'text-success',
      };
    }
    
    // Fallback ECMWF Active
    if (isFallback || (modelName === 'ECMWF' && source.includes('Fallback'))) {
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        variant: 'secondary' as const,
        label: '🟡 ECMWF [Fallback]',
        description: 'Fallback auf ECMWF-Modell wegen Ausfall ICON-D2',
        color: 'text-warning',
      };
    }
    
    // ECMWF direkt (primär gewählt)
    if (modelName === 'ECMWF') {
      return {
        icon: <Cloud className="w-3.5 h-3.5" />,
        variant: 'outline' as const,
        label: '🔵 ECMWF',
        description: 'ECMWF Wettermodell aktiv',
        color: 'text-blue-500',
      };
    }
    
    // Fallback für unbekannte Quellen
    return {
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      variant: 'outline' as const,
      label: source,
      description: 'Wettermodell aktiv',
      color: 'text-muted-foreground',
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

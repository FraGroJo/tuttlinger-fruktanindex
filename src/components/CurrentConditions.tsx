import { type CurrentConditions, type SourceMetadata } from "@/types/fruktan";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, Droplets, Wind, Thermometer, Database } from "lucide-react";

interface CurrentConditionsProps {
  current: CurrentConditions;
  source: SourceMetadata;
  flags?: string[];
}

export function CurrentConditions({ current, source, flags = [] }: CurrentConditionsProps) {
  const hasMismatch = flags.includes("current_mismatch");
  
  const formatDateTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
    } catch {
      return isoString;
    }
  };
  
  const formatNumber = (value: number | undefined, decimals = 1) => {
    if (value === undefined || isNaN(value)) return "—";
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };
  
  return (
    <Card className="glass-card p-6 animate-fade-in">
      <div className="space-y-4">
        {/* Haupttemperatur */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Thermometer className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Jetzt</h2>
          </div>
          <div className="text-6xl font-bold text-foreground mb-2">
            {formatNumber(current.temperature_now)}°C
          </div>
          {current.apparent_temperature !== undefined && (
            <p className="text-sm text-muted-foreground">
              Gefühlt: {formatNumber(current.apparent_temperature)}°C
            </p>
          )}
          {hasMismatch && (
            <Badge variant="outline" className="mt-2 text-warning border-warning">
              Geringe Abweichung zu Vorhersage
            </Badge>
          )}
        </div>

        {/* Source Metadata */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Database className="h-3 w-3" />
          <span>Stand: {formatDateTime(source.data_timestamp_local)} (Europe/Berlin)</span>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span>Quelle: {source.provider}</span>
          <span>•</span>
          <span>Modell: {source.model}</span>
          <span>•</span>
          <span>Alter: {source.data_age_minutes} Min</span>
        </div>

        {/* Weitere Werte als Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
          {/* Luftfeuchtigkeit */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="text-2xl font-semibold text-foreground">
              {formatNumber(current.relative_humidity_now, 0)}%
            </span>
            <span className="text-xs text-muted-foreground">Luftfeuchte</span>
          </div>

          {/* Wind */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50">
            <Wind className="h-5 w-5 text-primary" />
            <span className="text-2xl font-semibold text-foreground">
              {formatNumber(current.wind_speed_now)} m/s
            </span>
            <span className="text-xs text-muted-foreground">Wind</span>
          </div>

          {/* Bewölkung */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50">
            <Cloud className="h-5 w-5 text-primary" />
            <span className="text-2xl font-semibold text-foreground">
              {formatNumber(current.cloud_cover_now, 0)}%
            </span>
            <span className="text-xs text-muted-foreground">Bewölkung</span>
          </div>

          {/* Niederschlag */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="text-2xl font-semibold text-foreground">
              {formatNumber(current.precipitation_now)} mm/h
            </span>
            <span className="text-xs text-muted-foreground">Niederschlag</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

import { type CurrentConditions } from "@/types/fruktan";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, Droplets, Wind, Thermometer } from "lucide-react";

interface CurrentConditionsProps {
  current: CurrentConditions;
  flags?: string[];
}

export function CurrentConditions({ current, flags = [] }: CurrentConditionsProps) {
  const hasMismatch = flags.includes("current_mismatch");
  
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
            {current.temperature_now.toFixed(1)}°C
          </div>
          {current.apparent_temperature && (
            <p className="text-sm text-muted-foreground">
              Gefühlt: {current.apparent_temperature.toFixed(1)}°C
            </p>
          )}
          {hasMismatch && (
            <Badge variant="outline" className="mt-2 text-warning border-warning">
              Geringe Abweichung zu Vorhersage
            </Badge>
          )}
        </div>

        {/* Weitere Werte als Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
          {/* Luftfeuchtigkeit */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="text-2xl font-semibold text-foreground">
              {Math.round(current.relative_humidity_now)}%
            </span>
            <span className="text-xs text-muted-foreground">Luftfeuchte</span>
          </div>

          {/* Wind */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50">
            <Wind className="h-5 w-5 text-primary" />
            <span className="text-2xl font-semibold text-foreground">
              {current.wind_speed_now.toFixed(1)} m/s
            </span>
            <span className="text-xs text-muted-foreground">Wind</span>
          </div>

          {/* Bewölkung */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50">
            <Cloud className="h-5 w-5 text-primary" />
            <span className="text-2xl font-semibold text-foreground">
              {Math.round(current.cloud_cover_now)}%
            </span>
            <span className="text-xs text-muted-foreground">Bewölkung</span>
          </div>

          {/* Niederschlag */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-background/50">
            <Droplets className="h-5 w-5 text-primary" />
            <span className="text-2xl font-semibold text-foreground">
              {current.precipitation_now.toFixed(1)} mm/h
            </span>
            <span className="text-xs text-muted-foreground">Niederschlag</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

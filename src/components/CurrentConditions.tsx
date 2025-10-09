import { type CurrentConditions, type SourceMetadata } from "@/types/fruktan";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cloud, Droplets, Wind, Thermometer, TrendingUp } from "lucide-react";
import { WeatherSourceIndicator } from "./WeatherSourceIndicator";

interface CurrentConditionsProps {
  current: CurrentConditions;
  source: SourceMetadata;
  flags?: string[];
  fruktanNow?: {
    score: number;
    level: "safe" | "moderate" | "high";
  };
}

export function CurrentConditions({ current, source, flags = [], fruktanNow }: CurrentConditionsProps) {
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
  
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
    } catch {
      return "";
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
    <Card className="relative overflow-hidden shadow-lg border-2">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="relative p-4 sm:p-6 md:p-8">
        <div className="space-y-4 sm:space-y-6">
          {/* Haupttemperatur */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="p-2 sm:p-3 rounded-full bg-primary/10 ring-2 sm:ring-4 ring-primary/5 animate-pulse">
                <Thermometer className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">Aktuelle Bedingungen</h2>
                <div className="flex items-center gap-2 mt-1">
                  {source.data_timestamp_local && (
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Stand: {formatTime(source.data_timestamp_local)} Uhr
                    </p>
                  )}
                  <WeatherSourceIndicator source={source} />
                </div>
              </div>
            </div>
            
            {/* Temperature Display */}
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl sm:blur-3xl opacity-50 animate-pulse" />
              <div className="relative text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-foreground mb-2 sm:mb-3 tracking-tight">
                {formatNumber(current.temperature_now)}°
              </div>
            </div>
            
            {current.apparent_temperature !== undefined && (
              <p className="text-sm sm:text-base text-muted-foreground font-medium">
                Gefühlt: {formatNumber(current.apparent_temperature)}°C
              </p>
            )}
            {hasMismatch && (
              <Badge variant="outline" className="mt-3 text-warning border-warning/50 bg-warning/5">
                Geringe Abweichung zu Vorhersage
              </Badge>
            )}
          </div>

          {/* Weather Metrics Grid - 5 Karten inkl. Fruktan */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 pt-4 sm:pt-6">
            {/* Fruktan-Wert - Prominente Platzierung */}
            {fruktanNow && (
              <div className={`group relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 ${
                fruktanNow.level === "safe" 
                  ? "bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30 hover:border-green-500/50 hover:shadow-green-500/20" 
                  : fruktanNow.level === "moderate"
                  ? "bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30 hover:border-yellow-500/50 hover:shadow-yellow-500/20"
                  : "bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30 hover:border-red-500/50 hover:shadow-red-500/20"
              }`}>
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl transition-all ${
                  fruktanNow.level === "safe" 
                    ? "bg-green-500/5 group-hover:bg-green-500/10" 
                    : fruktanNow.level === "moderate"
                    ? "bg-yellow-500/5 group-hover:bg-yellow-500/10"
                    : "bg-red-500/5 group-hover:bg-red-500/10"
                }`} />
                <TrendingUp className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 relative z-10 ${
                  fruktanNow.level === "safe" 
                    ? "text-green-500" 
                    : fruktanNow.level === "moderate"
                    ? "text-yellow-500"
                    : "text-red-500"
                }`} />
                <span className="text-2xl sm:text-3xl font-bold text-foreground relative z-10">
                  {fruktanNow.score}
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider relative z-10 ${
                  fruktanNow.level === "safe" 
                    ? "text-green-600" 
                    : fruktanNow.level === "moderate"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}>
                  {fruktanNow.level === "safe" ? "Sicher" : fruktanNow.level === "moderate" ? "Erhöht" : "Hoch"}
                </span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider relative z-10">Fruktan</span>
              </div>
            )}
            {/* Luftfeuchtigkeit */}
            <div className="group relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-2 border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-105">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
              <Droplets className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-500 relative z-10" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground relative z-10">
                {formatNumber(current.relative_humidity_now, 0)}%
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider relative z-10">Luftfeuchte</span>
            </div>

            {/* Wind */}
            <div className="group relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-2 border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-105">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all" />
              <Wind className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-emerald-500 relative z-10" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground relative z-10">
                {formatNumber(current.wind_speed_now)}
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider relative z-10">km/h Wind</span>
            </div>

            {/* Bewölkung */}
            <div className="group relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-500/10 to-slate-600/5 border-2 border-slate-500/20 hover:border-slate-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-slate-500/10 hover:scale-105">
              <div className="absolute top-0 right-0 w-20 h-20 bg-slate-500/5 rounded-full blur-2xl group-hover:bg-slate-500/10 transition-all" />
              <Cloud className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-slate-500 relative z-10" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground relative z-10">
                {formatNumber(current.cloud_cover_now, 0)}%
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider relative z-10">Bewölkung</span>
            </div>

            {/* Niederschlag */}
            <div className="group relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-2 border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10 hover:scale-105">
              <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all" />
              <Droplets className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-indigo-500 relative z-10" />
              <span className="text-2xl sm:text-3xl font-bold text-foreground relative z-10">
                {formatNumber(current.precipitation_now)}
              </span>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider relative z-10">mm/h Regen</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

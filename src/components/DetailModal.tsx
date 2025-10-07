/**
 * Erweitertes Detail-Modal mit Tabs
 * Tabs: Überblick | Stundenverlauf | Berechnung
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "./RiskBadge";
import { Card } from "@/components/ui/card";
import { Thermometer, Cloud, Droplets, Wind, Sun } from "lucide-react";
import type { DayMatrix, TimeSlot, TimeSlotScore } from "@/types/fruktan";

interface DetailModalProps {
  day: DayMatrix;
  slot: TimeSlot;
  onClose: () => void;
}

const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "Morgen (05-11 Uhr)",
  noon: "Mittag (11-16 Uhr)",
  evening: "Abend (16-21 Uhr)",
};

export function DetailModal({ day, slot, onClose }: DetailModalProps) {
  const slotData = day[slot] as TimeSlotScore;

  if (!slotData) {
    return null;
  }

  // Use either tempSpectrum or temperature_spectrum
  const tempSpectrum = slotData.tempSpectrum || slotData.temperature_spectrum;

  if (!tempSpectrum) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {day.date} · {day.weekday} · {SLOT_LABELS[slot]}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Überblick</TabsTrigger>
            <TabsTrigger value="hourly">Stundenverlauf</TabsTrigger>
            <TabsTrigger value="calculation">Berechnung</TabsTrigger>
          </TabsList>

          {/* Tab 1: Überblick */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Score & Level */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Fruktan-Score (EMS)
                  </div>
                  <div className="text-4xl font-bold">
                    {Math.round(slotData.score)}
                  </div>
                </div>
                <RiskBadge level={slotData.level} score={slotData.score} />
              </div>
            </Card>

            {/* Temperatur-Spektrum */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Temperatur-Spektrum
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Minimum:</span>
                  <span className="font-medium">
                    {tempSpectrum.min.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Median:</span>
                  <span className="font-medium">
                    {tempSpectrum.median.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Maximum:</span>
                  <span className="font-medium">
                    {tempSpectrum.max.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spanne:</span>
                  <span className="font-medium">
                    {(tempSpectrum.max - tempSpectrum.min).toFixed(1)}°C
                  </span>
                </div>
              </div>

              {/* Visual Temperature Bar */}
              <div className="mt-4 space-y-2">
                <div className="text-xs text-muted-foreground">Visualisierung:</div>
                <div className="relative h-12 bg-gradient-to-r from-blue-400 via-yellow-300 to-red-400 rounded-lg shadow-inner">
                  {/* Min Marker */}
                  <div
                    className="absolute top-0 h-full w-1 bg-blue-900 shadow-lg"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((tempSpectrum.min + 20) / 60) * 100))}%`,
                    }}
                    title={`Min: ${tempSpectrum.min.toFixed(1)}°C`}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-900 whitespace-nowrap">
                      Min
                    </div>
                  </div>
                  
                  {/* Median Marker */}
                  <div
                    className="absolute top-0 h-full w-1.5 bg-gray-900 shadow-lg"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((tempSpectrum.median + 20) / 60) * 100))}%`,
                    }}
                    title={`Median: ${tempSpectrum.median.toFixed(1)}°C`}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-900 whitespace-nowrap">
                      Median
                    </div>
                  </div>
                  
                  {/* Max Marker */}
                  <div
                    className="absolute top-0 h-full w-1 bg-red-900 shadow-lg"
                    style={{
                      left: `${Math.max(0, Math.min(100, ((tempSpectrum.max + 20) / 60) * 100))}%`,
                    }}
                    title={`Max: ${tempSpectrum.max.toFixed(1)}°C`}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-red-900 whitespace-nowrap">
                      Max
                    </div>
                  </div>
                </div>
                
                {/* Temperature Scale */}
                <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                  <span>-20°C</span>
                  <span>0°C</span>
                  <span>20°C</span>
                  <span>40°C</span>
                </div>
              </div>
            </Card>

            {/* Bewertung */}
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Bewertung</h4>
              <p className="text-sm text-muted-foreground">{slotData.reason}</p>
            </Card>
          </TabsContent>

          {/* Tab 2: Stundenverlauf */}
          <TabsContent value="hourly" className="mt-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-4">Stündliche Wetterdaten</h4>
              
              {slotData.raw && slotData.raw.timestamps && slotData.raw.timestamps.length > 0 ? (
                <div className="space-y-6">
                  {/* Stündliche Tabelle */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs md:text-sm">
                      <thead>
                        <tr className="border-b-2 border-primary/20">
                          <th className="text-left py-2 px-1 md:px-2 font-semibold">Zeit</th>
                          <th className="text-center py-2 px-1 md:px-2 font-semibold">
                            <div className="flex items-center justify-center gap-1">
                              <Thermometer className="w-3 h-3 md:w-4 md:h-4" />
                              <span className="hidden md:inline">Temp</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-1 md:px-2 font-semibold">
                            <div className="flex items-center justify-center gap-1">
                              <Droplets className="w-3 h-3 md:w-4 md:h-4" />
                              <span className="hidden md:inline">LF</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-1 md:px-2 font-semibold">
                            <div className="flex items-center justify-center gap-1">
                              <Cloud className="w-3 h-3 md:w-4 md:h-4" />
                              <span className="hidden md:inline">Wolken</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-1 md:px-2 font-semibold">
                            <div className="flex items-center justify-center gap-1">
                              <Sun className="w-3 h-3 md:w-4 md:h-4" />
                              <span className="hidden md:inline">Strahlung</span>
                            </div>
                          </th>
                          <th className="text-center py-2 px-1 md:px-2 font-semibold">
                            <div className="flex items-center justify-center gap-1">
                              <Wind className="w-3 h-3 md:w-4 md:h-4" />
                              <span className="hidden md:inline">Wind</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {slotData.raw.timestamps.map((timestamp, idx) => {
                          const temp = slotData.raw!.temperatures[idx];
                          const rh = slotData.raw!.relative_humidities[idx];
                          const cloud = slotData.raw!.cloud_covers[idx];
                          const rad = slotData.raw!.radiations[idx];
                          const wind = slotData.raw!.wind_speeds[idx];
                          
                          const time = new Date(timestamp).toLocaleTimeString('de-DE', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Europe/Berlin'
                          });
                          
                          const isFrost = temp <= 0;
                          const isCold = temp > 0 && temp <= 5;
                          const isHighRad = rad > 400;
                          
                          return (
                            <tr 
                              key={timestamp} 
                              className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                                isFrost ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                              }`}
                            >
                              <td className="py-2 px-1 md:px-2 font-medium">{time}</td>
                              <td className={`text-center py-2 px-1 md:px-2 ${
                                isFrost ? 'text-blue-600 font-bold' : 
                                isCold ? 'text-blue-500' : ''
                              }`}>
                                {temp.toFixed(1)}°C
                              </td>
                              <td className="text-center py-2 px-1 md:px-2">
                                {rh.toFixed(0)}%
                              </td>
                              <td className="text-center py-2 px-1 md:px-2">
                                {cloud.toFixed(0)}%
                              </td>
                              <td className={`text-center py-2 px-1 md:px-2 ${
                                isHighRad ? 'text-orange-600 font-semibold' : ''
                              }`}>
                                {rad.toFixed(0)} W/m²
                              </td>
                              <td className="text-center py-2 px-1 md:px-2">
                                {wind.toFixed(1)} km/h
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Statistiken */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 pt-4 border-t">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Sun className="w-3 h-3" />
                        <span>Strahlung ⌀</span>
                      </div>
                      <div className="text-sm md:text-base font-semibold">
                        {slotData.raw.radiation_avg?.toFixed(0) || "—"} W/m²
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Cloud className="w-3 h-3" />
                        <span>Bewölkung ⌀</span>
                      </div>
                      <div className="text-sm md:text-base font-semibold">
                        {slotData.raw.cloud_avg?.toFixed(0) || "—"}%
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Droplets className="w-3 h-3" />
                        <span>Luftfeuchtigkeit ⌀</span>
                      </div>
                      <div className="text-sm md:text-base font-semibold">
                        {slotData.raw.rh_avg?.toFixed(0) || "—"}%
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                        <Wind className="w-3 h-3" />
                        <span>Wind ⌀</span>
                      </div>
                      <div className="text-sm md:text-base font-semibold">
                        {slotData.raw.wind_avg?.toFixed(1) || "—"} km/h
                      </div>
                    </div>
                  </div>

                  {/* Hinweise */}
                  <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
                    <p className="font-semibold mb-1">Legende:</p>
                    <ul className="space-y-1">
                      <li>• <span className="text-blue-600 font-semibold">Blaue Temperaturen</span>: Frost (≤0°C) oder Kälte (≤5°C)</li>
                      <li>• <span className="text-orange-600 font-semibold">Orange Strahlung</span>: Hohe Sonnenstrahlung (&gt;400 W/m²)</li>
                      <li>• Zeit: Lokale Zeit (Europe/Berlin)</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Keine detaillierten Stundendaten verfügbar
                </p>
              )}
            </Card>
          </TabsContent>

          {/* Tab 3: Berechnung */}
          <TabsContent value="calculation" className="mt-4">
            <Card className="p-4">
              <h4 className="font-semibold mb-4">Berechnungsfaktoren</h4>
              
              <div className="space-y-3 text-sm">
                {slotData.flags && slotData.flags.length > 0 ? (
                  slotData.flags.map((flag, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2 bg-muted/50 rounded"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      <span>{getFlagLabel(flag)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    Keine besonderen Faktoren erkannt
                  </p>
                )}

                {/* Zusätzliche Score-Komponenten */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Basis-Score:</span>
                    <span className="font-medium">20</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gesamt-Score:</span>
                    <span className="font-bold">{Math.round(slotData.score)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hilfsfunktion: Übersetzt Flag-Codes in lesbare Labels
 */
function getFlagLabel(flag: string): string {
  const labels: Record<string, string> = {
    frost: "🥶 Frost erkannt (≤ 0°C) → +30 Punkte",
    cold: "❄️ Kälte (≤ 5°C) → +15 Punkte",
    sun: "☀️ Hohe Sonnenstrahlung",
    temp_swing: "🌡️ Große Tagesspanne → +Boost",
    drought: "🌵 Trockenstress (ET0, Niederschlag, Wind)",
    cloud_reduce: "☁️ Bewölkung reduziert Score",
    heat_relief: "🔥 Hitze-Entlastung (>28°C + Feuchtigkeit)",
    low_humidity_morning: "💨 Niedrige Luftfeuchtigkeit am Morgen",
    frost_boost: "🌨️ Frost-Boost aktiviert",
    temp_out_of_bounds: "⚠️ Temperatur außerhalb Plausibilität",
    rh_out_of_bounds: "⚠️ Luftfeuchtigkeit außerhalb Plausibilität",
    suspicious_temp_jump: "⚠️ Verdächtiger Temperatursprung",
  };

  return labels[flag] || `🔹 ${flag}`;
}

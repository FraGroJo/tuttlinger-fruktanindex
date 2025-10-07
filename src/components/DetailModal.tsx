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
                    {slotData.tempSpectrum.min.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Median:</span>
                  <span className="font-medium">
                    {slotData.tempSpectrum.median.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Maximum:</span>
                  <span className="font-medium">
                    {slotData.tempSpectrum.max.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Spanne:</span>
                  <span className="font-medium">
                    {(slotData.tempSpectrum.max - slotData.tempSpectrum.min).toFixed(1)}°C
                  </span>
                </div>
              </div>

              {/* Visual Temperature Bar */}
              <div className="mt-4 relative h-8 bg-gradient-to-r from-blue-200 via-yellow-200 to-red-200 rounded">
                <div
                  className="absolute h-full w-1 bg-gray-800"
                  style={{
                    left: `${((slotData.tempSpectrum.min + 30) / 75) * 100}%`,
                  }}
                  title={`Min: ${slotData.tempSpectrum.min.toFixed(1)}°C`}
                />
                <div
                  className="absolute h-full w-1 bg-black"
                  style={{
                    left: `${((slotData.tempSpectrum.median + 30) / 75) * 100}%`,
                  }}
                  title={`Median: ${slotData.tempSpectrum.median.toFixed(1)}°C`}
                />
                <div
                  className="absolute h-full w-1 bg-gray-800"
                  style={{
                    left: `${((slotData.tempSpectrum.max + 30) / 75) * 100}%`,
                  }}
                  title={`Max: ${slotData.tempSpectrum.max.toFixed(1)}°C`}
                />
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
              
              {slotData.raw && (
                <div className="space-y-4">
                  {/* Mini-Charts könnten hier eingefügt werden */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Sun className="w-4 h-4" />
                        <span>Strahlung</span>
                      </div>
                      <div className="text-xs">
                        Durchschnitt: {slotData.raw.radiation_avg?.toFixed(0) || "—"} W/m²
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Cloud className="w-4 h-4" />
                        <span>Bewölkung</span>
                      </div>
                      <div className="text-xs">
                        Durchschnitt: {slotData.raw.cloud_avg?.toFixed(0) || "—"}%
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Droplets className="w-4 h-4" />
                        <span>Luftfeuchtigkeit</span>
                      </div>
                      <div className="text-xs">
                        Durchschnitt: {slotData.raw.rh_avg?.toFixed(0) || "—"}%
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Wind className="w-4 h-4" />
                        <span>Wind</span>
                      </div>
                      <div className="text-xs">
                        Durchschnitt: {slotData.raw.wind_avg?.toFixed(1) || "—"} km/h
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!slotData.raw && (
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

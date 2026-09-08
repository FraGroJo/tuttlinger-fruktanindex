/**
 * Optimiertes Detail-Modal mit deutscher Formatierung, Anti-Overlap-Logik,
 * Prev/Next-Navigation und vollständiger Accessibility
 */

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskBadge } from "./RiskBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Thermometer,
  Cloud,
  Droplets as Droplet,
  Wind,
  Sun,
  ChevronLeft,
  ChevronRight,
  FileJson,
  X,
  Info,
} from "lucide-react";
import { TemperatureSpectrum } from "./TemperatureSpectrum";
import { WeatherSourceIndicator } from "./WeatherSourceIndicator";
import type { DayMatrix, TimeSlot, TimeSlotScore, SourceMetadata } from "@/types/fruktan";
import {
  formatTemperature,
  formatPercent,
  formatWind,
  formatRadiation,
  formatTime,
} from "@/lib/formatters";

interface DetailModalProps {
  day: DayMatrix;
  slot: TimeSlot;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
  sourceMetadata?: SourceMetadata; // SSOT für Wetterquelle
}

const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "Morgen (05–11 Uhr)",
  noon: "Mittag (11–16 Uhr)",
  evening: "Abend (16–21 Uhr)",
};

const SLOT_ORDER: TimeSlot[] = ["morning", "noon", "evening"];

export function DetailModal({
  day,
  slot,
  onClose,
  onNavigate,
  sourceMetadata,
}: DetailModalProps) {
  const [showRawData, setShowRawData] = useState(false);
  const slotData = day[slot] as TimeSlotScore;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && onNavigate) {
        onNavigate("prev");
      } else if (e.key === "ArrowRight" && onNavigate) {
        onNavigate("next");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onNavigate]);

  // Scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (!slotData) {
    return null;
  }

  const tempSpectrum = slotData.tempSpectrum || slotData.temperature_spectrum;

  if (!tempSpectrum) {
    return null;
  }

  // Berechne Positionen für Temperatur-Marker (−20 bis 40 °C Skala)
  const getMarkerPosition = (temp: number): number => {
    return Math.max(0, Math.min(100, ((temp + 20) / 60) * 100));
  };

  const minPos = getMarkerPosition(tempSpectrum.min);
  const medianPos = getMarkerPosition(tempSpectrum.median);
  const maxPos = getMarkerPosition(tempSpectrum.max);

  // Anti-Overlap-Logik: Wenn Marker zu nahe beieinander (<14px ~ 14%), gestaffelt anzeigen
  const hasOverlap =
    Math.abs(medianPos - minPos) < 14 ||
    Math.abs(maxPos - medianPos) < 14 ||
    Math.abs(maxPos - minPos) < 14;

  const range = tempSpectrum.max - tempSpectrum.min;

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent
          className="max-w-3xl md:max-w-2xl max-h-[90vh] overflow-y-auto px-6 py-5 rounded-t-2xl md:rounded-2xl"
          aria-describedby="detail-modal-description"
        >
          {/* Header */}
          <DialogHeader className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <DialogTitle className="text-xl md:text-2xl font-bold">
                  {day.date} · {day.weekday} · {SLOT_LABELS[slot]}
                </DialogTitle>
                <DialogDescription
                  id="detail-modal-description"
                  className="text-sm text-muted-foreground mt-1 flex items-center gap-2"
                >
                  Stand {formatTime(new Date())}
                  {sourceMetadata && (
                    <>
                      {" · "}
                      <WeatherSourceIndicator source={sourceMetadata} />
                    </>
                  )}
                </DialogDescription>
              </div>

              {/* Prev/Next Navigation */}
              {onNavigate && (
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onNavigate("prev")}
                    aria-label="Vorheriger Zeitslot"
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => onNavigate("next")}
                    aria-label="Nächster Zeitslot"
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 sticky top-0 z-10 bg-background shadow-sm">
              <TabsTrigger value="overview">Überblick</TabsTrigger>
              <TabsTrigger value="hourly">Stundenverlauf</TabsTrigger>
              <TabsTrigger value="calculation">Berechnung</TabsTrigger>
            </TabsList>

            {/* Tab 1: Überblick */}
            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* A) KPI-Strip (oben) */}
              <div className="space-y-4">
                {/* Hauptwerte */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Fruktan-Score
                    </div>
                    <div className="text-5xl font-bold tracking-tight">
                      {Math.round(slotData.score)}
                    </div>
                  </div>
                  <RiskBadge
                    level={slotData.level}
                    score={slotData.score}
                    aria-label={`Fruktan-Score ${Math.round(
                      slotData.score
                    )}, ${
                      slotData.level === "safe"
                        ? "Sicher"
                        : slotData.level === "moderate"
                        ? "Erhöht"
                        : "Risiko"
                    }`}
                  />
                </div>

                {/* Mini-KPIs als Chips */}
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-sm">
                    <Thermometer className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formatTemperature(tempSpectrum.median, 1)}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-sm">
                    <Cloud className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formatPercent(slotData.raw?.cloud_avg || 0, 0)}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-sm">
                    <Sun className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formatRadiation(slotData.raw?.radiation_avg || 0, 0)}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-sm">
                    <Droplet className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formatPercent(slotData.raw?.rh_avg || 0, 0)}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-full text-sm">
                    <Wind className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formatWind(slotData.raw?.wind_avg || 0, 1)}
                    </span>
                  </div>
                  {sourceMetadata && (
                    <WeatherSourceIndicator source={sourceMetadata} />
                  )}
                </div>

                {/* Subline */}
                <div className="text-xs text-muted-foreground">
                  Stand {formatTime(new Date())} · Zeitraum: {SLOT_LABELS[slot]}{" "}
                  · Ort: Bonndorf 47.821°N, 9.103°E
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* B) Risiko-Begründung + C) Visuals (2-Spalten Desktop, 1-Spalte Mobile) */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* B) Risiko-Begründung (links) */}
                <div className="space-y-4">
                  <h4 className="text-base font-semibold flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Warum dieser Score?
                  </h4>

                  <div
                    className="space-y-2"
                    aria-description={`Grund für den Score: Bewölkung ${
                      slotData.raw?.cloud_avg || 0
                    }%`}
                  >
                    {/* Cloud factor */}
                    {slotData.raw?.cloud_avg !== undefined &&
                      slotData.raw.cloud_avg >= 80 && (
                        <div className="flex items-start gap-2 text-sm p-2 rounded bg-risk-safe-bg/50">
                          <span className="text-lg leading-none">✓</span>
                          <div>
                            <span className="font-medium">
                              Bewölkung hoch (
                              {formatPercent(slotData.raw.cloud_avg, 0)})
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              → Risiko reduziert
                            </span>
                          </div>
                        </div>
                      )}
                    {slotData.raw?.cloud_avg !== undefined &&
                      slotData.raw.cloud_avg >= 50 &&
                      slotData.raw.cloud_avg < 80 && (
                        <div className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                          <span className="text-lg leading-none">➖</span>
                          <div>
                            <span className="font-medium">
                              Bewölkung moderat (
                              {formatPercent(slotData.raw.cloud_avg, 0)})
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              → neutraler Effekt
                            </span>
                          </div>
                        </div>
                      )}
                    {slotData.raw?.cloud_avg !== undefined &&
                      slotData.raw.cloud_avg < 50 && (
                        <div className="flex items-start gap-2 text-sm p-2 rounded bg-risk-high-bg/50">
                          <span className="text-lg leading-none">⚠</span>
                          <div>
                            <span className="font-medium">
                              Bewölkung niedrig (
                              {formatPercent(slotData.raw.cloud_avg, 0)})
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              → Risiko erhöht
                            </span>
                          </div>
                        </div>
                      )}

                    {/* Radiation factor */}
                    {slotData.raw?.radiation_avg !== undefined &&
                      slotData.raw.radiation_avg < 100 && (
                        <div className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                          <span className="text-lg leading-none">➖</span>
                          <div>
                            <span className="font-medium">
                              Strahlung niedrig (Ø{" "}
                              {formatRadiation(slotData.raw.radiation_avg, 0)})
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              → geringe Photosynthese
                            </span>
                          </div>
                        </div>
                      )}
                    {slotData.raw?.radiation_avg !== undefined &&
                      slotData.raw.radiation_avg >= 300 && (
                        <div className="flex items-start gap-2 text-sm p-2 rounded bg-risk-high-bg/50">
                          <span className="text-lg leading-none">⚠</span>
                          <div>
                            <span className="font-medium">
                              Strahlung hoch (Ø{" "}
                              {formatRadiation(slotData.raw.radiation_avg, 0)})
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              → starke Photosynthese
                            </span>
                          </div>
                        </div>
                      )}

                    {/* Temperature factor */}
                    {tempSpectrum.min < 0 ? (
                      <div className="flex items-start gap-2 text-sm p-2 rounded bg-risk-high-bg/50">
                        <span className="text-lg leading-none">✳</span>
                        <div>
                          <span className="font-medium">
                            Frost (Min {formatTemperature(tempSpectrum.min, 1)})
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            → Risiko steigt trotz Sonne
                          </span>
                        </div>
                      </div>
                    ) : tempSpectrum.median < 10 ? (
                      <div className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                        <span className="text-lg leading-none">➖</span>
                        <div>
                          <span className="font-medium">
                            Temperatur kühl (Median{" "}
                            {formatTemperature(tempSpectrum.median, 1)})
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            → reduziertes Wachstum
                          </span>
                        </div>
                      </div>
                    ) : tempSpectrum.median >= 15 ? (
                      <div className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                        <span className="text-lg leading-none">➖</span>
                        <div>
                          <span className="font-medium">
                            Temperatur warm (Median{" "}
                            {formatTemperature(tempSpectrum.median, 1)})
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            → gutes Wachstum
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                        <span className="text-lg leading-none">➖</span>
                        <div>
                          <span className="font-medium">
                            Temperatur moderat (Median{" "}
                            {formatTemperature(tempSpectrum.median, 1)})
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            → kein Frost-Trigger
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Empfehlungen */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <h5 className="font-semibold text-sm">Empfehlungen</h5>
                    {slotData.level === "safe" && (
                      <>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-green-600 font-bold">✓</span>
                          <span>
                            <strong>Do:</strong> Weiden ganztägig möglich;
                            ideales Zeitfenster
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-red-600 font-bold">✗</span>
                          <span>
                            <strong>Don't:</strong> Keine besonderen
                            Einschränkungen
                          </span>
                        </div>
                      </>
                    )}
                    {slotData.level === "moderate" && (
                      <>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-green-600 font-bold">✓</span>
                          <span>
                            <strong>Do:</strong> Weiden am späten Vormittag
                            möglich; weiter beobachten
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-red-600 font-bold">✗</span>
                          <span>
                            <strong>Don't:</strong> Kein zusätzliches kurzes,
                            sonniges Zeitfenster erzwingen
                          </span>
                        </div>
                      </>
                    )}
                    {slotData.level === "high" && (
                      <>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-green-600 font-bold">✓</span>
                          <span>
                            <strong>Do:</strong> Weide stark einschränken oder
                            verschieben
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-sm">
                          <span className="text-red-600 font-bold">✗</span>
                          <span>
                            <strong>Don't:</strong> Nicht bei direkter
                            Sonneneinstrahlung weiden
                          </span>
                        </div>
                      </>
                    )}
                    <button
                      onClick={() => {
                        const calculationTab = document.querySelector(
                          '[value="calculation"]'
                        ) as HTMLElement;
                        calculationTab?.click();
                      }}
                      className="text-xs text-primary hover:underline mt-2"
                    >
                      Details → Tab Berechnung
                    </button>
                  </div>
                </div>

                {/* C) Visuals (rechts) */}
                <div className="space-y-6">
                  {/* Temperatur-Spektrum */}
                  <TemperatureSpectrum
                    min={tempSpectrum.min}
                    median={tempSpectrum.median}
                    max={tempSpectrum.max}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Stundenverlauf */}
            <TabsContent value="hourly" className="mt-4">
              <Card className="p-4">
                <h4 className="font-semibold text-lg mb-4">
                  Stündliche Wetterdaten
                </h4>

                {slotData.raw &&
                slotData.raw.timestamps &&
                slotData.raw.timestamps.length > 0 ? (
                  <div className="space-y-6">
                    {/* Tabelle */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm">
                        <thead>
                          <tr className="border-b-2 border-primary/20">
                            <th className="text-left py-2 px-2 font-semibold">
                              Zeit
                            </th>
                            <th className="text-center py-2 px-2 font-semibold">
                              <Thermometer className="w-4 h-4 mx-auto" />
                            </th>
                            <th className="text-center py-2 px-2 font-semibold">
                              <Droplet className="w-4 h-4 mx-auto" />
                            </th>
                            <th className="text-center py-2 px-2 font-semibold">
                              <Cloud className="w-4 h-4 mx-auto" />
                            </th>
                            <th className="text-center py-2 px-2 font-semibold">
                              <Sun className="w-4 h-4 mx-auto" />
                            </th>
                            <th className="text-center py-2 px-2 font-semibold">
                              <Wind className="w-4 h-4 mx-auto" />
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

                            const time = formatTime(timestamp);
                            const isFrost = temp <= 0;
                            const isCold = temp > 0 && temp <= 5;

                            return (
                              <tr
                                key={timestamp}
                                className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                                  isFrost
                                    ? "bg-blue-50 dark:bg-blue-950/20"
                                    : ""
                                }`}
                              >
                                <td className="py-2 px-2 font-medium">
                                  {time}
                                </td>
                                <td
                                  className={`text-center py-2 px-2 ${
                                    isFrost
                                      ? "text-blue-600 font-bold"
                                      : isCold
                                      ? "text-blue-500"
                                      : ""
                                  }`}
                                >
                                  {formatTemperature(temp)}
                                </td>
                                <td className="text-center py-2 px-2">
                                  {formatPercent(rh)}
                                </td>
                                <td className="text-center py-2 px-2">
                                  {formatPercent(cloud)}
                                </td>
                                <td className="text-center py-2 px-2">
                                  {formatRadiation(rad)}
                                </td>
                                <td className="text-center py-2 px-2">
                                  {formatWind(wind)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Durchschnittswerte */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Sun className="w-3 h-3" />
                          <span>Strahlung ⌀</span>
                        </div>
                        <div className="text-base font-semibold">
                          {formatRadiation(slotData.raw.radiation_avg || 0)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Cloud className="w-3 h-3" />
                          <span>Bewölkung ⌀</span>
                        </div>
                        <div className="text-base font-semibold">
                          {formatPercent(slotData.raw.cloud_avg || 0)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Droplet className="w-3 h-3" />
                          <span>Luftfeuchtigkeit ⌀</span>
                        </div>
                        <div className="text-base font-semibold">
                          {formatPercent(slotData.raw.rh_avg || 0)}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Wind className="w-3 h-3" />
                          <span>Wind ⌀</span>
                        </div>
                        <div className="text-base font-semibold">
                          {formatWind(slotData.raw.wind_avg || 0)}
                        </div>
                      </div>
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
                <h4 className="font-semibold text-lg mb-4">
                  Transparente Herleitung
                </h4>

                {/* Eingabewerte */}
                <div className="space-y-3 mb-4">
                  <div className="text-sm font-semibold text-muted-foreground">
                    Eingaben:
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      Temperatur Min: {formatTemperature(tempSpectrum.min)}
                    </div>
                    <div>
                      Temperatur Median:{" "}
                      {formatTemperature(tempSpectrum.median)}
                    </div>
                    <div>
                      Temperatur Max: {formatTemperature(tempSpectrum.max)}
                    </div>
                    <div>
                      Bewölkung: {formatPercent(slotData.raw?.cloud_avg || 0)}
                    </div>
                    <div>
                      Strahlung:{" "}
                      {formatRadiation(slotData.raw?.radiation_avg || 0)}
                    </div>
                    <div>
                      Luftfeuchtigkeit:{" "}
                      {formatPercent(slotData.raw?.rh_avg || 0)}
                    </div>
                  </div>
                </div>

                {/* Faktoren */}
                {slotData.flags && slotData.flags.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <div className="text-sm font-semibold text-muted-foreground">
                      Faktoren:
                    </div>
                    {slotData.flags.map((flag, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                        <span>{getFlagLabel(flag)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Score-Komponenten */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Basis-Score:</span>
                    <span className="font-medium">20</span>
                  </div>
                  <div className="flex justify-between text-base font-bold">
                    <span>Gesamt-Score:</span>
                    <span>{Math.round(slotData.score)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Risiko-Level:</span>
                    <RiskBadge level={slotData.level} />
                  </div>
                </div>

                {/* Rohdaten-Button */}
                <div className="mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRawData(true)}
                    className="w-full"
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    Rohdaten anzeigen (JSON)
                  </Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Risiko-Legende im Footer */}
          <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-risk-safe" />
              <span>0–29 Sicher</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-risk-moderate" />
              <span>30–59 Erhöht</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-risk-high" />
              <span>≥60 Risiko</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Raw Data Modal */}
      {showRawData && (
        <Dialog open={true} onOpenChange={() => setShowRawData(false)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Rohdaten (JSON)</DialogTitle>
              <DialogDescription>
                Read-only Ansicht der Rohdaten
              </DialogDescription>
            </DialogHeader>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono">
              {JSON.stringify(slotData, null, 2)}
            </pre>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/**
 * Hilfsfunktion: Übersetzt Flag-Codes in lesbare Labels
 */
function getFlagLabel(flag: string): string {
  const labels: Record<string, string> = {
    frost: "🥶 Frost erkannt (≤ 0 °C) → +30 Punkte",
    cold: "❄️ Kälte (≤ 5 °C) → +15 Punkte",
    sun: "☀️ Hohe Sonnenstrahlung",
    temp_swing: "🌡️ Große Tagesspanne → +Boost",
    drought: "🌵 Trockenstress (ET0, Niederschlag, Wind)",
    cloud_reduce: "☁️ Bewölkung reduziert Score",
    heat_relief: "🔥 Hitze-Entlastung (>28 °C + Feuchtigkeit)",
    low_humidity_morning: "💨 Niedrige Luftfeuchtigkeit am Morgen",
    frost_boost: "🌨️ Frost-Boost aktiviert",
    temp_out_of_bounds: "⚠️ Temperatur außerhalb Plausibilität",
    rh_out_of_bounds: "⚠️ Luftfeuchtigkeit außerhalb Plausibilität",
    suspicious_temp_jump: "⚠️ Verdächtiger Temperatursprung",
  };

  return labels[flag] || `🔹 ${flag}`;
}

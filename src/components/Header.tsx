/**
 * Header Komponente
 * Zeigt Titel, Kern-KPI und Metadaten minimal an
 */

import { MapPin, TrendingUp, Info } from "lucide-react";
import { Button } from "./ui/button";
import { InfoModal } from "./InfoModal";
import { WeatherSourceIndicator } from "./WeatherSourceIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type LocationData } from "@/types/fruktan";
import { useState } from "react";

interface HeaderProps {
  location: LocationData;
  onLocationChange: (location: LocationData) => void;
  metadata?: {
    dataSource: string;
    localTimestamp: string;
    modelRunTime?: string;
    fallbackUsed?: boolean;
  };
  fruktanNow?: {
    score: number;
    level: "safe" | "moderate" | "high";
  };
}

export function Header({ location, metadata, fruktanNow }: HeaderProps) {
  // Format timestamp
  const formatTimestamp = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Berlin",
      });
    } catch {
      return isoString;
    }
  };

  // Level-Label
  const getLevelLabel = (level: "safe" | "moderate" | "high") => {
    switch (level) {
      case "safe": return "Sicher";
      case "moderate": return "Erhöht";
      case "high": return "Hoch";
    }
  };

  // Level-Farbe
  const getLevelColor = (level: "safe" | "moderate" | "high") => {
    switch (level) {
      case "safe": return "text-green-600";
      case "moderate": return "text-yellow-600";
      case "high": return "text-red-600";
    }
  };

  return (
    <header className="bg-card border-b shadow-sm backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Titel & Ort */}
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">
              Tuttlinger Fruktanindex
            </h1>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{location.name}</span>
                <span className="hidden sm:inline">· 47.969°N, 8.783°E</span>
              </div>
              {metadata?.localTimestamp && (
                <div className="flex items-center gap-1.5">
                  <span className="hidden sm:inline">·</span>
                  <span>Stand {formatTimestamp(metadata.localTimestamp)}</span>
                </div>
              )}
              {metadata?.dataSource && (
                <div className="sm:ml-auto">
                  <WeatherSourceIndicator 
                    source={metadata.dataSource}
                    fallbackUsed={metadata.fallbackUsed}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Kern-KPI */}
          {fruktanNow && (
            <div className="flex items-stretch gap-3 sm:gap-4 bg-gradient-to-br from-muted/30 to-transparent rounded-xl p-3 sm:p-4 border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground">Fruktan (jetzt, EMS)</span>
                </div>
                <div className="flex items-baseline gap-2 sm:gap-3">
                  <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tabular-nums">{fruktanNow.score}</span>
                  <span className={`text-base sm:text-lg lg:text-xl font-semibold ${getLevelColor(fruktanNow.level)}`}>
                    {getLevelLabel(fruktanNow.level)}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <InfoModal emsMode={true} />
              </div>
            </div>
          )}
        </div>

        {/* Metadata (klein darunter) */}
        {metadata && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Quelle: {metadata.dataSource}</span>
            <span>•</span>
            <span>Stand: {formatTimestamp(metadata.localTimestamp)}</span>
            {metadata.modelRunTime && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Modell-Laufzeit: {metadata.modelRunTime}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

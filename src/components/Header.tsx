/**
 * Header Komponente
 * Zeigt Titel, Kern-KPI und Metadaten minimal an
 */

import { MapPin, TrendingUp, Info } from "lucide-react";
import { Button } from "./ui/button";
import { InfoModal } from "./InfoModal";
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
    <header className="bg-card border-b shadow-sm backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Titel & Ort */}
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
              Tuttlinger Fruktanindex
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>{location.name}</span>
            </div>
          </div>

          {/* Kern-KPI */}
          {fruktanNow && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end mb-1">
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Fruktan (jetzt, EMS)</span>
                </div>
                <div className="flex items-baseline gap-2 justify-end">
                  <span className="text-3xl font-bold text-foreground">{fruktanNow.score}</span>
                  <span className={`text-lg font-semibold ${getLevelColor(fruktanNow.level)}`}>
                    {getLevelLabel(fruktanNow.level)}
                  </span>
                </div>
              </div>
              <InfoModal emsMode={true} />
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

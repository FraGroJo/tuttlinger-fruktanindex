/**
 * Header Komponente
 * Zeigt Titel, Ortsauswahl, Quelle, Stand und aktuellen Fruktan-Wert (EMS)
 */

import { MapPin, Database, Clock, TrendingUp } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { InfoModal } from "./InfoModal";
import { type LocationData, type SourceMetadata } from "@/types/fruktan";
import { useState } from "react";

interface HeaderProps {
  location: LocationData;
  onLocationChange: (location: LocationData) => void;
  metadata?: {
    dataSource: string;
    localTimestamp: string;
  };
  fruktanNow?: {
    score: number;
    level: "safe" | "moderate" | "high";
  };
}

export function Header({ location, onLocationChange, metadata, fruktanNow }: HeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLocation, setTempLocation] = useState(location.name);

  const handleLocationSubmit = () => {
    // In einer echten App würde hier Geocoding stattfinden
    // Für Demo: Akzeptiere Eingabe und behalte Koordinaten
    onLocationChange({
      name: tempLocation,
      lat: location.lat,
      lon: location.lon,
    });
    setIsEditing(false);
  };

  // Format timestamp für bessere Lesbarkeit
  const formatTimestamp = (isoString: string) => {
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
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Titel & Ort */}
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 leading-tight">
              Tuttlinger Fruktanindex
            </h1>
            
            {/* Standort-Eingabe */}
            {!isEditing ? (
              <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{location.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-5 sm:h-6 px-2 text-xs"
                >
                  Ändern
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2 flex-wrap sm:flex-nowrap">
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="text"
                  value={tempLocation}
                  onChange={(e) => setTempLocation(e.target.value)}
                  placeholder="Ort oder Koordinaten"
                  className="h-7 sm:h-8 text-xs sm:text-sm flex-1 min-w-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLocationSubmit();
                    if (e.key === "Escape") {
                      setTempLocation(location.name);
                      setIsEditing(false);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleLocationSubmit}
                  className="h-7 sm:h-8 px-2 sm:px-3 gap-1 flex-shrink-0"
                >
                  <span className="hidden sm:inline">OK</span>
                  <span className="sm:hidden">✓</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTempLocation(location.name);
                    setIsEditing(false);
                  }}
                  className="h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
                >
                  <span className="text-xs sm:text-sm">Abbrechen</span>
                </Button>
              </div>
            )}

            {/* Metadata-Zeile: Quelle • Stand • Fruktan (jetzt, EMS) */}
            {metadata && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  <span>Quelle: {metadata.dataSource}</span>
                </div>
                <span className="hidden sm:inline text-muted-foreground/50">•</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Stand: {formatTimestamp(metadata.localTimestamp)}</span>
                </div>
                {fruktanNow && (
                  <>
                    <span className="hidden sm:inline text-muted-foreground/50">•</span>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>
                        Fruktan (jetzt, EMS): <strong className="font-semibold text-foreground">{fruktanNow.score}</strong>{" "}
                        <span className={`font-semibold ${getLevelColor(fruktanNow.level)}`}>
                          ({getLevelLabel(fruktanNow.level)})
                        </span>
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Info-Modal */}
          <div className="flex items-center">
            <InfoModal emsMode={true} />
          </div>
        </div>
      </div>
    </header>
  );
}

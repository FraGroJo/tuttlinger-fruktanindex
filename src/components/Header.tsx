/**
 * Header Komponente
 * Zeigt Titel, Ortsauswahl und EMS-Toggle an
 */

import { MapPin, AlertCircle, Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { InfoModal } from "./InfoModal";
import { type LocationData } from "@/types/fruktan";
import { useState } from "react";

interface HeaderProps {
  location: LocationData;
  onLocationChange: (location: LocationData) => void;
  fruktanNow?: {
    score: number;
    level: "safe" | "moderate" | "high";
  };
}

export function Header({ location, onLocationChange, fruktanNow }: HeaderProps) {
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

  return (
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Titel & Ort */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Fruktan-Matrix für Pferdeweiden
            </h1>
            
            {/* Standort-Eingabe */}
            {!isEditing ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-medium">{location.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="h-6 px-2 text-xs"
                >
                  Ändern
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={tempLocation}
                  onChange={(e) => setTempLocation(e.target.value)}
                  placeholder="Ort oder Koordinaten"
                  className="h-8 text-sm max-w-xs"
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
                  className="h-8 px-3 gap-1"
                >
                  <Search className="w-3 h-3" />
                  OK
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTempLocation(location.name);
                    setIsEditing(false);
                  }}
                  className="h-8 px-3"
                >
                  Abbrechen
                </Button>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Info-Modal */}
            <InfoModal emsMode={true} />
            
            {/* Fruktan Now Display */}
            {fruktanNow && (
              <div className="flex items-center gap-3 bg-muted/50 px-4 py-3 rounded-lg border">
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Fruktan (jetzt, EMS):</span>
                  <span className={`text-sm font-bold ${
                    fruktanNow.level === "safe" ? "text-risk-safe" :
                    fruktanNow.level === "moderate" ? "text-risk-moderate" :
                    "text-risk-high"
                  }`}>
                    {fruktanNow.score} ({
                      fruktanNow.level === "safe" ? "Sicher" :
                      fruktanNow.level === "moderate" ? "Erhöht" :
                      "Hoch"
                    })
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

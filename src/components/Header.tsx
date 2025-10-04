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
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Titel & Ort */}
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 leading-tight">
              Fruktan Matrix Reitverein Tuttlingen
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
                  <Search className="w-3 h-3" />
                  <span className="hidden sm:inline">OK</span>
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
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Info-Modal */}
            <InfoModal emsMode={true} />
          </div>
        </div>
      </div>
    </header>
  );
}

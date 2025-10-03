/**
 * Header Komponente
 * Zeigt Titel, Ortsauswahl und EMS-Toggle an
 */

import { MapPin, AlertCircle, Search } from "lucide-react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { InfoModal } from "./InfoModal";
import { type LocationData } from "@/types/fruktan";
import { useState } from "react";

interface HeaderProps {
  location: LocationData;
  emsMode: boolean;
  onEmsToggle: (enabled: boolean) => void;
  onLocationChange: (location: LocationData) => void;
}

export function Header({ location, emsMode, onEmsToggle, onLocationChange }: HeaderProps) {
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
            <InfoModal emsMode={emsMode} />
            
            {/* EMS-Toggle */}
            <div className="flex items-center gap-3 bg-muted/50 px-4 py-3 rounded-lg border">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-3">
                <Label htmlFor="ems-mode" className="text-sm font-medium cursor-pointer">
                  Strenger Modus (EMS)
                </Label>
                <Switch
                  id="ems-mode"
                  checked={emsMode}
                  onCheckedChange={onEmsToggle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info-Text */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg border-l-4 border-primary">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Diese Matrix berechnet das Fruktan-Risiko basierend auf aktuellen Wetterdaten.
            {emsMode && (
              <span className="ml-1 font-medium text-foreground">
                Strengere Schwellenwerte aktiv (0–29/30–59/60–100).
              </span>
            )}
          </p>
        </div>
      </div>
    </header>
  );
}

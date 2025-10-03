/**
 * Header Komponente
 * Zeigt Titel, Ortsauswahl und EMS-Toggle an
 */

import { MapPin, AlertCircle } from "lucide-react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";

interface HeaderProps {
  locationName: string;
  emsMode: boolean;
  onEmsToggle: (enabled: boolean) => void;
}

export function Header({ locationName, emsMode, onEmsToggle }: HeaderProps) {
  return (
    <header className="bg-card border-b shadow-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Titel & Ort */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Fruktan-Matrix für Pferdeweiden
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-sm font-medium">{locationName}</span>
            </div>
          </div>

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

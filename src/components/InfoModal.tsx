/**
 * InfoModal Komponente
 * Erklärt die Ampel-Logik und Bewertungskriterien der Fruktan-Matrix
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Info } from "lucide-react";

interface InfoModalProps {
  emsMode: boolean;
}

export function InfoModal({ emsMode }: InfoModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="w-4 h-4" />
          Info
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fruktan-Matrix Erklärung</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Ampel-Logik */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Ampel-Logik</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Die Fruktan-Matrix berechnet für jedes Zeitfenster einen Score von 0–100, der das Risiko für erhöhte Fruktan-Werte im Gras anzeigt.
            </p>
            
            {!emsMode ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-safe/10 border-l-4 border-safe rounded">
                  <div className="w-6 h-6 rounded-full bg-safe flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">0–39: Geringes Risiko (Grün)</p>
                    <p className="text-sm text-muted-foreground">
                      Günstige Bedingungen. Weiden können in der Regel ohne besondere Vorsicht genutzt werden.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-moderate/10 border-l-4 border-moderate rounded">
                  <div className="w-6 h-6 rounded-full bg-moderate flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">40–69: Erhöhtes Risiko (Gelb)</p>
                    <p className="text-sm text-muted-foreground">
                      Vorsicht geboten. Weidezeiten begrenzen, besonders für empfindliche Pferde (EMS, Hufrehe-Historie).
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-high/10 border-l-4 border-high rounded">
                  <div className="w-6 h-6 rounded-full bg-high flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">70–100: Hohes Risiko (Rot)</p>
                    <p className="text-sm text-muted-foreground">
                      Gefährliche Bedingungen. Weidegang vermeiden, besonders für stoffwechselempfindliche Pferde.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-primary/10 border border-primary rounded mb-4">
                  <p className="text-sm font-medium text-foreground">
                    ⚠️ Strenger Modus (EMS) aktiv – Schwellen enger gesetzt
                  </p>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-safe/10 border-l-4 border-safe rounded">
                  <div className="w-6 h-6 rounded-full bg-safe flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">0–29: Geringes Risiko (Grün)</p>
                    <p className="text-sm text-muted-foreground">
                      Akzeptable Bedingungen für EMS-Pferde, dennoch kontrollierte Weidezeiten empfohlen.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-moderate/10 border-l-4 border-moderate rounded">
                  <div className="w-6 h-6 rounded-full bg-moderate flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">30–59: Erhöhtes Risiko (Gelb)</p>
                    <p className="text-sm text-muted-foreground">
                      Weidegang stark begrenzen oder komplett vermeiden für EMS-gefährdete Pferde.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-high/10 border-l-4 border-high rounded">
                  <div className="w-6 h-6 rounded-full bg-high flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">60–100: Hohes Risiko (Rot)</p>
                    <p className="text-sm text-muted-foreground">
                      Kein Weidegang für EMS-Pferde. Auch gesunde Pferde sollten nur mit Vorsicht auf die Weide.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Bewertungskriterien */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Bewertungskriterien</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Der Score berücksichtigt verschiedene Wetterfaktoren, die die Fruktan-Produktion in Gräsern beeinflussen:
            </p>
            
            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded">
                <p className="font-medium text-sm mb-1">🌡️ Temperatur & Frost</p>
                <p className="text-xs text-muted-foreground">
                  Kalte Nächte (≤5 °C) und Frost (≤0 °C) erhöhen das Risiko deutlich, besonders in Kombination mit sonnigen Morgenstunden.
                </p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded">
                <p className="font-medium text-sm mb-1">☀️ Sonneneinstrahlung</p>
                <p className="text-xs text-muted-foreground">
                  Hohe Strahlung nach kalten Nächten führt zu starker Photosynthese ohne ausreichendes Graswachstum → Fruktan-Akkumulation.
                </p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded">
                <p className="font-medium text-sm mb-1">💧 Trockenstress (ET0)</p>
                <p className="text-xs text-muted-foreground">
                  Hohe Verdunstung (ET0) bei wenig Niederschlag und Wind verstärkt Stress und damit die Fruktan-Einlagerung.
                </p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded">
                <p className="font-medium text-sm mb-1">☁️ Bewölkung</p>
                <p className="text-xs text-muted-foreground">
                  Stark bewölkte Tage (≥85%) reduzieren das Risiko, da weniger Photosynthese stattfindet.
                </p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded">
                <p className="font-medium text-sm mb-1">🌡️ Tagesspanne</p>
                <p className="text-xs text-muted-foreground">
                  Große Temperaturunterschiede zwischen Tag und Nacht (≥10 °C) können das Risiko verstärken.
                </p>
              </div>
            </div>
          </section>

          {/* Zeitfenster */}
          <section>
            <h3 className="text-lg font-semibold mb-3 text-foreground">Zeitfenster</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Die Berechnung erfolgt für drei Tagesabschnitte mit unterschiedlicher Gewichtung:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium w-24">🌅 Morgens:</span>
                <span className="text-muted-foreground">05:00–11:00 Uhr (höchste Sensibilität)</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium w-24">☀️ Mittags:</span>
                <span className="text-muted-foreground">11:00–16:00 Uhr (moderate Gewichtung)</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-medium w-24">🌆 Abends:</span>
                <span className="text-muted-foreground">16:00–21:00 Uhr (reduzierte Gewichtung)</span>
              </div>
            </div>
          </section>

          {/* Hinweis */}
          <section className="p-4 bg-muted/50 rounded-lg border">
            <p className="text-xs text-muted-foreground">
              <strong>Hinweis:</strong> Diese Matrix dient als Orientierungshilfe. Individuelle Bedingungen (Grasart, Bodenfeuchtigkeit, 
              Gesundheitszustand des Pferdes) müssen zusätzlich berücksichtigt werden. Im Zweifelsfall immer einen Tierarzt konsultieren.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

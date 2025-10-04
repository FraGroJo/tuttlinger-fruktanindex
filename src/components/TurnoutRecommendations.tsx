import { Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TurnoutRecommendation } from "@/types/horse";
import type { HorseMinimal } from "@/types/horse";

interface TurnoutRecommendationsProps {
  recommendations: TurnoutRecommendation[];
  horses: HorseMinimal[];
  date: string;
}

const WINDOW_LABELS = {
  morning: "Morgen (5-11h)",
  noon: "Mittag (11-16h)",
  evening: "Abend (16-21h)",
};

export function TurnoutRecommendations({ recommendations, horses, date }: TurnoutRecommendationsProps) {
  const groupedByWindow = recommendations.reduce((acc, rec) => {
    if (!acc[rec.window]) acc[rec.window] = [];
    acc[rec.window].push(rec);
    return acc;
  }, {} as Record<string, TurnoutRecommendation[]>);

  const getHorseName = (horseId: string) => {
    return horses.find((h) => h.id === horseId)?.name || "Unbekannt";
  };

  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0 Min";
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes} Min`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Empfohlene Weidezeiten</h2>
        <p className="text-muted-foreground">Für {new Date(date).toLocaleDateString("de-DE")}</p>
      </div>

      {Object.keys(groupedByWindow).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">Keine aktiven Pferde vorhanden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {(["morning", "noon", "evening"] as const).map((window) => {
            const windowRecs = groupedByWindow[window] || [];
            
            return (
              <Card key={window}>
                <CardHeader>
                  <CardTitle>{WINDOW_LABELS[window]}</CardTitle>
                  <CardDescription>
                    {windowRecs.length} Pferd{windowRecs.length !== 1 ? "e" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {windowRecs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Keine Daten</p>
                  ) : (
                    windowRecs.map((rec) => (
                      <TooltipProvider key={rec.horse_id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between p-2 rounded-lg bg-muted hover:bg-muted/80 cursor-help">
                              <span className="font-medium">{getHorseName(rec.horse_id)}</span>
                              <Badge variant={rec.turnout_min === 0 ? "destructive" : "secondary"}>
                                {formatMinutes(rec.turnout_min)}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              <div className="font-semibold border-b pb-1">Berechnungsdetails</div>
                              <div className="flex justify-between">
                                <span>NSC-Budget:</span>
                                <span>{rec.explain.NSC_budget_g.toFixed(0)} g/Tag</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Grundlast (Ration):</span>
                                <span>{rec.explain.base_nsc_g.toFixed(0)} g</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Verfügbar (Weide):</span>
                                <span className="font-semibold">{rec.explain.nsc_allow_g.toFixed(0)} g</span>
                              </div>
                              <div className="border-t pt-1 mt-1">
                                <div className="flex justify-between">
                                  <span>Weide NSC:</span>
                                  <span>{rec.explain.pasture_nsc_pct.toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Aufnahmerate:</span>
                                  <span>{rec.explain.intake_rate_kg_dm_per_h.toFixed(1)} kg TM/h</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>NSC/Stunde:</span>
                                  <span>{rec.explain.nsc_per_hour_g.toFixed(0)} g/h</span>
                                </div>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="border-primary/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Hinweise</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• <strong>0 Min:</strong> Rotes Fenster oder NSC-Budget bereits durch Ration ausgeschöpft</p>
          <p>• <strong>Gelbes Fenster:</strong> Maximal 60 Minuten (konservativ)</p>
          <p>• <strong>Maulkorb:</strong> Halbiert die Aufnahmerate (0.5 statt 1.0 kg TM/h)</p>
          <p>• Empfehlungen basieren auf den aktuellen Fruktan-Scores der globalen Matrix</p>
        </CardContent>
      </Card>
    </div>
  );
}

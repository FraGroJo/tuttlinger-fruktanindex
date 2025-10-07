/**
 * TurnoutMatrix Komponente
 * Matrix-Ansicht mit farbigen Minuten-Balken
 */

import { motion } from "framer-motion";
import { type TurnoutRecommendation, type HorseMinimal } from "@/types/horse";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TurnoutMatrixProps {
  recommendations: TurnoutRecommendation[];
  horses: HorseMinimal[];
  date: string;
}

export function TurnoutMatrix({ recommendations, horses, date }: TurnoutMatrixProps) {
  // Gruppiere nach Pferd
  const byHorse = recommendations.reduce((acc, rec) => {
    if (!acc[rec.horse_id]) acc[rec.horse_id] = [];
    acc[rec.horse_id].push(rec);
    return acc;
  }, {} as Record<string, TurnoutRecommendation[]>);

  const windows = ["morning", "noon", "evening"] as const;
  const windowLabels = { morning: "Morgens", noon: "Mittags", evening: "Abends" };

  return (
    <div className="space-y-4">
      {Object.entries(byHorse).map(([horseId, recs]) => {
        const horse = horses.find((h) => h.id === horseId);
        if (!horse) return null;

        return (
          <motion.div
            key={horseId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm"
          >
            {/* Pferde-Header */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">{horse.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {horse.mass_kg} kg
                  {horse.easy_or_ems && " • EMS"}
                  {horse.muzzle === "on" && " • Maulkorb"}
                </p>
              </div>
            </div>

            {/* Matrix: 3 Segmente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {windows.map((window) => {
                const rec = recs.find((r) => r.window === window);
                if (!rec) return null;

                const color = getColorForLevel(rec.level);
                const maxMinutes = 180;
                const widthPercent = (rec.turnout_min / maxMinutes) * 100;

                return (
                  <TooltipProvider key={window}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-3 rounded-lg bg-muted/30 cursor-help">
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            {windowLabels[window]}
                          </div>
                          
                          {/* Balken */}
                          <div className="relative h-8 bg-muted rounded-full overflow-hidden mb-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${widthPercent}%` }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              className={`h-full ${color} flex items-center justify-center`}
                            >
                              <span className="text-xs font-bold text-white drop-shadow">
                                {rec.turnout_min} Min
                              </span>
                            </motion.div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Score: {rec.score} ({rec.level === "safe" ? "Sicher" : rec.level === "moderate" ? "Erhöht" : "Hoch"})
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">{horse.name} • {windowLabels[window]}</p>
                          <p>Empfohlen: {rec.turnout_min} Minuten</p>
                          {rec.explain && (
                            <>
                              <p className="mt-2 font-medium">Details:</p>
                              <p>NSC-Budget: {rec.explain.NSC_budget_g.toFixed(0)} g/Tag</p>
                              <p>Grundlast: {rec.explain.base_nsc_g.toFixed(0)} g/Tag</p>
                              <p>Verfügbar: {rec.explain.nsc_allow_g.toFixed(0)} g</p>
                              <p>Weide-NSC: {rec.explain.pasture_nsc_pct.toFixed(1)}%</p>
                              <p>Aufnahme: {rec.explain.intake_rate_kg_dm_per_h.toFixed(2)} kg TM/h</p>
                              <p>NSC/h: {rec.explain.nsc_per_hour_g.toFixed(0)} g/h</p>
                            </>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function getColorForLevel(level: "safe" | "moderate" | "high"): string {
  switch (level) {
    case "safe":
      return "bg-[hsl(var(--chart-2))]"; // Grün aus Design-System
    case "moderate":
      return "bg-[hsl(var(--chart-3))]"; // Gelb/Orange aus Design-System
    case "high":
      return "bg-[hsl(var(--chart-1))]"; // Rot aus Design-System
  }
}

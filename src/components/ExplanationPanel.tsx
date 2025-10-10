/**
 * Explanation Panel - Zeigt Score-Berechnung transparent
 * V25: Nachvollziehbarkeit - Input → Beitrag → Score
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Info, TrendingUp, TrendingDown } from "lucide-react";
import type { ExplanationData } from "@/lib/explain";

interface ExplanationPanelProps {
  explanation: ExplanationData;
  className?: string;
}

export function ExplanationPanel({ explanation, className = "" }: ExplanationPanelProps) {
  const { score, contributions, factors, formulaVersion, paramsVersion } = explanation;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              Warum dieser Score?
            </CardTitle>
            <CardDescription>
              Beiträge einzelner Faktoren zum Gesamt-Score
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-2xl font-bold px-3 py-1">
            {score}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Faktoren-Liste */}
        <div className="space-y-3">
          {factors.map((factor) => {
            const isPositive = factor.contribution > 0;
            const isNegative = factor.contribution < 0;
            const absContrib = Math.abs(factor.contribution);

            return (
              <div
                key={factor.key}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{factor.label}</span>
                    {isPositive && (
                      <TrendingUp className="w-4 h-4 text-red-500" />
                    )}
                    {isNegative && (
                      <TrendingDown className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Wert: {factor.value.toFixed(1)}
                    {factor.unit && ` ${factor.unit}`}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-semibold ${
                      isPositive
                        ? "text-red-600"
                        : isNegative
                        ? "text-green-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isPositive && "+"}
                    {factor.contribution.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {absContrib >= 15
                      ? "Stark"
                      : absContrib >= 8
                      ? "Moderat"
                      : "Gering"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Basis-Score Hinweis */}
        <div className="p-3 rounded-lg border border-dashed bg-background">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Basis-Score</span>
            <span className="font-medium">+20</span>
          </div>
        </div>

        {/* Versions-Info */}
        <div className="pt-3 border-t space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Formel-Version:</span>
            <code className="px-2 py-0.5 rounded bg-muted font-mono">
              {formulaVersion}
            </code>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Parameter-Version:</span>
            <code className="px-2 py-0.5 rounded bg-muted font-mono">
              {paramsVersion}
            </code>
          </div>
        </div>

        {/* Zusammenfassung */}
        <div className="pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            Der Score wird aus mehreren Wetterfaktoren berechnet. Positive Beiträge
            erhöhen das Fruktan-Risiko, negative Beiträge reduzieren es.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

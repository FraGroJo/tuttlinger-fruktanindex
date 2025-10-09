/**
 * Phase 3: System-Status Anzeige
 */

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Activity } from "lucide-react";
import { useSystemMonitoring } from "@/hooks/useSystemMonitoring";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export function SystemStatusCard() {
  const { status, report, isRunning, runManualCheck } = useSystemMonitoring();

  const getStatusIcon = () => {
    if (status.color === 'green') {
      return <CheckCircle className="h-5 w-5 text-success" />;
    } else if (status.color === 'yellow') {
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    } else {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getConfidenceBadge = () => {
    if (status.confidence === 'normal') {
      return <Badge variant="outline" className="bg-success/10 text-success">Hoch</Badge>;
    } else {
      return <Badge variant="outline" className="bg-warning/10 text-warning">Niedrig</Badge>;
    }
  };

  return (
    <Card className="border-l-4" style={{
      borderLeftColor: status.color === 'green' ? 'hsl(var(--success))' :
        status.color === 'yellow' ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'
    }}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>System-Status</span>
            {isRunning && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Activity className="h-4 w-4 text-muted-foreground animate-pulse" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Monitoring aktiv (alle 30 Min.)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={runManualCheck}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Jetzt prüfen
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Message */}
        <div className="text-sm">
          {status.message}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Letzte Validierung</div>
            <div className="font-medium">{status.lastValidation}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Aktives Modell</div>
            <div className="font-medium">{status.activeModel}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Konfidenz</div>
            <div>{getConfidenceBadge()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Systemstatus</div>
            <div className="font-medium">
              {status.healthy ? '✅ Gesund' : '⚠️ Beeinträchtigt'}
            </div>
          </div>
        </div>

        {/* Report Details */}
        {report && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-xs space-y-2">
            <div className="font-semibold">Letzte Metriken:</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-muted-foreground">Ø Temperatur</div>
                <div>{report.metrics.avgTemperature.toFixed(1)}°C</div>
              </div>
              <div>
                <div className="text-muted-foreground">Ø Feuchte</div>
                <div>{report.metrics.avgHumidity.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-muted-foreground">Ø Score</div>
                <div>{report.metrics.avgScore.toFixed(0)}</div>
              </div>
            </div>

            {report.metrics.tempDelta > 0 && (
              <div className="mt-2 text-xs">
                <div className="text-muted-foreground">Abweichungen zum letzten Check:</div>
                <div className="flex gap-4 mt-1">
                  {report.metrics.tempDelta > 0 && (
                    <span>ΔT: {report.metrics.tempDelta.toFixed(1)}°C</span>
                  )}
                  {report.metrics.humidityDelta > 0 && (
                    <span>ΔRH: {report.metrics.humidityDelta.toFixed(1)}%</span>
                  )}
                  {report.metrics.scoreDelta > 0 && (
                    <span>ΔScore: {report.metrics.scoreDelta.toFixed(0)}</span>
                  )}
                </div>
              </div>
            )}

            {report.autoHealingTriggered && (
              <div className="mt-2 p-2 bg-warning/10 rounded text-warning">
                🔧 Auto-Healing wurde ausgeführt
              </div>
            )}

            {report.validationResult.warnings.length > 0 && (
              <div className="mt-2">
                <div className="text-warning">Warnungen:</div>
                <ul className="list-disc list-inside text-muted-foreground">
                  {report.validationResult.warnings.slice(0, 3).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

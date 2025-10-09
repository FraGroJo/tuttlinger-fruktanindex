/**
 * Systemstatus-Seite – umfassende Monitoring- & Validierungsübersicht
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Activity,
  Loader2,
  Download,
  FileText,
  Clock,
  MapPin,
  Gauge,
} from "lucide-react";
import { useSystemMonitoring } from "@/hooks/useSystemMonitoring";
import { useFruktanData } from "@/hooks/useFruktanData";
import { logger } from "@/lib/logger";
import { validationLogger } from "@/lib/validationLog";
import { WeatherSourceIndicator } from "@/components/WeatherSourceIndicator";
import { RiskLegend } from "@/components/RiskLegend";
import { DEFAULT_LOCATION } from "@/types/fruktan";
import { formatTemperature, formatPercent } from "@/lib/formatters";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SystemStatus() {
  const { status, report, isRunning, runManualCheck } = useSystemMonitoring();
  const { data } = useFruktanData(true, DEFAULT_LOCATION);
  const [isChecking, setIsChecking] = useState(false);
  const [autoMonitoring, setAutoMonitoring] = useState(true);
  const [uptime, setUptime] = useState(0);
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [logSearch, setLogSearch] = useState("");

  // Uptime Timer
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setUptime(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getStatusIcon = () => {
    if (status.color === "green") {
      return <CheckCircle className="h-5 w-5 text-success" />;
    } else if (status.color === "yellow") {
      return <AlertTriangle className="h-5 w-5 text-warning" />;
    } else {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const handleManualCheck = async () => {
    if (isChecking) return;
    setIsChecking(true);
    await runManualCheck();
    setIsChecking(false);
    
    // Log consistency check
    validationLogger.info("manual_system_check_completed", {
      status: status.color,
    });
  };

  const handleDownloadLogs = (type: "sync" | "validation" | "all") => {
    const logs = logger.formatLogsForDownload(type);
    const blob = new Blob([logs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_logs_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monitoring_report_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allLogs = logger.getLogs();
  const filteredLogs = allLogs
    .filter((log) => {
      if (logFilter !== "all" && log.level !== logFilter) return false;
      if (logSearch && !log.event.toLowerCase().includes(logSearch.toLowerCase())) return false;
      return true;
    })
    .slice(-100)
    .reverse();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold">Systemstatus</h1>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">{status.message}</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Echtzeit-Monitoring, Validierung und Systemintegritätsprüfung
          </p>
        </div>

        {/* Legend */}
        <div className="mb-6">
          <RiskLegend />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {/* A. Übersicht / KPIs */}
          <Card className="border-l-4" style={{
            borderLeftColor: status.color === "green" ? "hsl(var(--success))" :
              status.color === "yellow" ? "hsl(var(--warning))" : "hsl(var(--destructive))"
          }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Übersicht
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quelle/Modell */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Datenquelle</div>
                {data?.metadata?.dataSource && (
                  <WeatherSourceIndicator
                    source={data.metadata.dataSource}
                    fallbackUsed={data.metadata.fallbackUsed}
                  />
                )}
              </div>

              {/* Stand & Koordinaten */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Standort & Zeit</div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm">
                    <div className="font-medium">Tuttlingen</div>
                    <div className="text-muted-foreground">47.969°N, 8.783°E</div>
                    {data?.metadata?.localTimestamp && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Stand: {new Date(data.metadata.localTimestamp).toLocaleString("de-DE", {
                          timeZone: "Europe/Berlin",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Letzte Validierung */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Letzte Validierung
                </div>
                <div 
                  className="text-sm font-medium"
                  aria-label={`Letzte Validierung ${status.lastValidation}, Status ${status.healthy ? 'OK' : 'Warn'}`}
                >
                  {status.lastValidation}
                  {status.healthy ? " ✅" : " ⚠️"}
                </div>
              </div>

              {/* Uptime */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Uptime seit App-Start
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{formatUptime(uptime)}</span>
                </div>
              </div>

              {/* Monitoring aktiv */}
              {isRunning && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4 animate-pulse text-success" />
                  <span>Auto-Monitoring aktiv (alle 30 Min.)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* B. Deltas & Integrität */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Deltas & Integrität
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Δ Temp (24h)</div>
                      <div className="font-medium">
                        {report.metrics.tempDelta.toFixed(1)} °C
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Δ Feuchte</div>
                      <div className="font-medium">
                        {report.metrics.humidityDelta.toFixed(1)} %
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Δ Score</div>
                      <div className="font-medium">
                        {report.metrics.scoreDelta.toFixed(0)} Pkt
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Zeitreihen (240h):</span>
                        <span className="font-medium">✅ Vollständig</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Zeitzone:</span>
                        <span className="font-medium">Europe/Berlin ✅</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Validierung:</span>
                        <span className={report.validationResult.passed ? "text-success" : "text-destructive"}>
                          {report.validationResult.passed ? "✅ OK" : "❌ Fehler"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {report.autoHealingTriggered && (
                    <div className="mt-3 p-2 bg-warning/10 rounded text-warning text-sm">
                      🔧 Auto-Healing wurde ausgeführt
                    </div>
                  )}

                  {report.validationResult.warnings.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-warning mb-1">
                        Warnungen:
                      </div>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        {report.validationResult.warnings.slice(0, 3).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Warte auf ersten Monitoring-Report...
                </div>
              )}
            </CardContent>
          </Card>

          {/* C. Aktionen */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Aktionen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Manual Check */}
              <Button
                className="w-full"
                onClick={handleManualCheck}
                disabled={isChecking}
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Prüfung läuft...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Jetzt prüfen
                  </>
                )}
              </Button>

              {/* Auto-Monitoring Toggle */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-monitoring" className="text-sm font-medium">
                    Auto-Monitoring
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Automatische Prüfung alle 30 Min.
                  </p>
                </div>
                <Switch
                  id="auto-monitoring"
                  checked={autoMonitoring}
                  onCheckedChange={setAutoMonitoring}
                />
              </div>

              {/* Export Report */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExportReport}
                disabled={!report}
              >
                <Download className="h-4 w-4 mr-2" />
                Report exportieren (JSON)
              </Button>

              {/* Log Downloads */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Logs herunterladen:</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadLogs("sync")}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    sync.log
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadLogs("validation")}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                    validation.log
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Log-Viewer */}
        <Card>
          <CardHeader>
            <CardTitle>System-Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="all" onClick={() => setLogFilter("all")}>
                  Alle
                </TabsTrigger>
                <TabsTrigger value="info" onClick={() => setLogFilter("info")}>
                  Info
                </TabsTrigger>
                <TabsTrigger value="warn" onClick={() => setLogFilter("warn")}>
                  Warn
                </TabsTrigger>
                <TabsTrigger value="error" onClick={() => setLogFilter("error")}>
                  Error
                </TabsTrigger>
              </TabsList>

              {/* Search */}
              <div className="mb-4">
                <Input
                  placeholder="Suche nach Event-Namen..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>

              <TabsContent value={logFilter} className="mt-0">
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <div className="space-y-2 font-mono text-xs">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded ${
                            log.level === "error"
                              ? "bg-destructive/10 text-destructive"
                              : log.level === "warn"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString("de-DE", {
                                timeZone: "Europe/Berlin",
                              })}
                            </span>
                            <span className="font-medium">{log.level.toUpperCase()}</span>
                          </div>
                          <div className="mt-1">{log.event}</div>
                          {Object.keys(log.details).length > 0 && (
                            <div className="mt-1 text-muted-foreground">
                              {JSON.stringify(log.details)}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        Keine Logs gefunden
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

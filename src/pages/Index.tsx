/**
 * Haupt-Seite der Fruktan-Matrix-Anwendung
 */

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { MatrixGrid } from "@/components/MatrixGrid";
import { TrendChart } from "@/components/TrendChart";
import { HeatmapView } from "@/components/HeatmapView";
import { MetadataBar } from "@/components/MetadataBar";
import { CurrentConditions } from "@/components/CurrentConditions";
import { PastureDataForm } from "@/components/PastureDataForm";
import { HorseList } from "@/components/HorseList";
import { TurnoutMatrix } from "@/components/TurnoutMatrix";
import { DataQualityBanner } from "@/components/DataQualityBanner";
import { RiskLegend } from "@/components/RiskLegend";
import { ScoreDebugger } from "@/components/ScoreDebugger";
import { SystemValidationPanel } from "@/components/SystemValidationPanel";

import { useFruktanData } from "@/hooks/useFruktanData";
import { useHorses } from "@/hooks/useHorses";
import { useSystemMonitoring } from "@/hooks/useSystemMonitoring";
import { Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_LOCATION, type LocationData } from "@/types/fruktan";
import { DEFAULT_PASTURE_DATA, type PastureData } from "@/types/pasture";
import { DEFAULT_PASTURE_CONFIG } from "@/types/horse";
import { exportToCSV, exportToPDF } from "@/lib/export";
import { exportQuestionnaireToPDF } from "@/lib/questionnaireExport";
import { exportTurnoutsToCSV } from "@/lib/horseExport";
import { calculateAllTurnouts } from "@/lib/horseCalculations";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [pastureData, setPastureData] = useState<PastureData>(DEFAULT_PASTURE_DATA);
  const [activeTab, setActiveTab] = useState<string>("matrix");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const { 
    data, 
    trendData, 
    loading, 
    error, 
    dataIntegrity = 'ok',
    apiSyncError = false,
    serviceUnavailable = false,
    dataSource
  } = useFruktanData(true, location);
  
  // Hole Monitoring-Report für Confidence-Werte
  const { report } = useSystemMonitoring();
  
  // API-Client für Validierung
  const [rawApiData, setRawApiData] = useState<any>(null);
  
  useEffect(() => {
    if (data) {
      // Hole Raw-Daten für Validierung
      import('@/lib/apiClient').then(({ apiClient }) => {
        apiClient.fetchWeatherData(location).then(response => {
          setRawApiData(response.data);
        }).catch(console.error);
      });
    }
  }, [data, location]);
  const { horses, activeHorses } = useHorses();
  const { toast } = useToast();

  // Load pasture data from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pastureData");
    if (stored) {
      try {
        setPastureData(JSON.parse(stored));
      } catch (e) {
        console.warn("Failed to load pasture data", e);
      }
    }
  }, []);

  const handleSavePastureData = () => {
    // Add timestamp to data
    const dataWithTimestamp: PastureData = {
      ...pastureData,
      savedAt: new Date().toISOString(),
    };
    
    localStorage.setItem("pastureData", JSON.stringify(dataWithTimestamp));
    setPastureData(dataWithTimestamp);
    
    toast({
      title: "Weidestand gespeichert",
      description: "Die Daten wurden gespeichert und sind 7 Tage gültig. Die Berechnung wird aktualisiert.",
    });
    
    // Reload page to recalculate with new pasture data
    setTimeout(() => window.location.reload(), 500);
  };

  const handleExportCSV = () => {
    if (!data) return;
    try {
      exportToCSV(
        [data.today, data.tomorrow, data.dayAfterTomorrow, data.dayThree, data.dayFour, data.dayFive, data.daySix],
        location.name
      );
      toast({
        title: "CSV exportiert",
        description: "Die Datei wurde erfolgreich heruntergeladen.",
      });
    } catch (err) {
      toast({
        title: "Fehler",
        description: "CSV-Export fehlgeschlagen.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    if (!data) return;
    try {
      exportToPDF(
        [data.today, data.tomorrow, data.dayAfterTomorrow, data.dayThree, data.dayFour, data.dayFive, data.daySix],
        location.name,
        true
      );
      toast({
        title: "PDF generiert",
        description: "Der Druckdialog wird geöffnet.",
      });
    } catch (err) {
      toast({
        title: "Fehler",
        description: "PDF-Export fehlgeschlagen.",
        variant: "destructive",
      });
    }
  };

  const handleExportQuestionnaire = () => {
    try {
      exportQuestionnaireToPDF();
      toast({
        title: "Fragenkatalog exportiert",
        description: "PDF wurde erfolgreich heruntergeladen.",
      });
    } catch (err) {
      toast({
        title: "Fehler",
        description: "PDF-Export fehlgeschlagen.",
        variant: "destructive",
      });
    }
  };

  const handleExportTurnouts = () => {
    if (!data) return;
    
    const dayData = getDayDataByDate(selectedDate);
    if (!dayData) return;

    const recommendations = activeHorses.flatMap((horse) =>
      calculateAllTurnouts(
        horse,
        {
          morning: { score: dayData.morning.score, level: dayData.morning.level },
          noon: { score: dayData.noon.score, level: dayData.noon.level },
          evening: { score: dayData.evening.score, level: dayData.evening.level },
        },
        DEFAULT_PASTURE_CONFIG
      )
    );

    try {
      exportTurnoutsToCSV(recommendations, horses, selectedDate);
      toast({
        title: "Weidezeiten exportiert",
        description: "CSV wurde erfolgreich heruntergeladen.",
      });
    } catch (err) {
      toast({
        title: "Fehler",
        description: "CSV-Export fehlgeschlagen.",
        variant: "destructive",
      });
    }
  };

  const getDayDataByDate = (date: string) => {
    if (!data) return null;
    const days = [data.today, data.tomorrow, data.dayAfterTomorrow, data.dayThree, data.dayFour, data.dayFive, data.daySix];
    return days.find((d) => d.date === date);
  };

  const getTurnoutRecommendations = () => {
    if (!data) {
      console.log("getTurnoutRecommendations: No data available");
      return [];
    }
    
    const dayData = getDayDataByDate(selectedDate);
    if (!dayData) {
      console.log("getTurnoutRecommendations: No dayData for", selectedDate);
      return [];
    }

    console.log("Active horses:", activeHorses);
    console.log("Day data:", dayData);

    const recommendations = activeHorses.flatMap((horse) =>
      calculateAllTurnouts(
        horse,
        {
          morning: { score: dayData.morning.score, level: dayData.morning.level },
          noon: { score: dayData.noon.score, level: dayData.noon.level },
          evening: { score: dayData.evening.score, level: dayData.evening.level },
        },
        DEFAULT_PASTURE_CONFIG
      )
    );
    
    console.log("Turnout recommendations:", recommendations);
    return recommendations;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Lade Wetterdaten...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <p className="text-lg text-destructive mb-4">{error || "Fehler beim Laden"}</p>
          <Button onClick={() => window.location.reload()}>Erneut versuchen</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Header
        location={location}
        onLocationChange={setLocation}
        metadata={{
          dataSource: data?.metadata.dataSource,
          localTimestamp: data?.metadata.localTimestamp,
          modelRunTime: data?.metadata.modelRunTime,
          fallbackUsed: data?.metadata.fallbackUsed,
        }}
        fruktanNow={data?.fruktanNow}
      />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="matrix">Fruktan-Matrix</TabsTrigger>
            <TabsTrigger value="pasture">Weidestand</TabsTrigger>
            <TabsTrigger value="horses">Offenstall Pferde</TabsTrigger>
            <TabsTrigger value="systemstatus">Systemstatus</TabsTrigger>
            <TabsTrigger value="validation">System-Validierung</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-4 sm:space-y-6 md:space-y-8">
            {/* Data Quality Banner */}
            <DataQualityBanner
              confidence={data.confidence || 'normal'}
              source={data.metadata?.dataSource || dataSource || 'Open-Meteo'}
              fallbackUsed={data.metadata?.fallbackUsed}
              validationStatus="ok"
            />
            
            {/* Risk Legend */}
            <RiskLegend />

            {/* Current Conditions */}
            {data.current && (
              <section className="animate-fade-in">
                <CurrentConditions 
                  current={data.current} 
                  source={data.source} 
                  flags={data.flags}
                  fruktanNow={data.fruktanNow}
                />
              </section>
            )}

            {/* Metadaten & Stale-Banner */}
            <div>
              <MetadataBar
                metadata={data.metadata}
                flags={data.flags}
                onRefresh={() => window.location.reload()}
              />
            </div>

            {/* Export-Buttons */}
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportQuestionnaire}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Fragenkatalog PDF</span>
                <span className="sm:hidden">Fragebogen</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">CSV exportieren</span>
                <span className="sm:hidden">CSV</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9"
              >
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">PDF-Bericht</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>

            {/* Heatmap-View (7 Tage × 3 Fenster) */}
            <section>
              <HeatmapView 
                days={[
                  data.today,
                  data.tomorrow,
                  data.dayAfterTomorrow,
                  data.dayThree,
                  data.dayFour,
                  data.dayFive,
                  data.daySix,
                ]}
                dataSource={dataSource || 'ICON-D2'}
              />
            </section>

            {/* Matrix-Karten mit Glassmorphism */}
            <section>
              <MatrixGrid
                today={data.today}
                tomorrow={data.tomorrow}
                dayAfterTomorrow={data.dayAfterTomorrow}
                dayThree={data.dayThree}
                dayFour={data.dayFour}
                dayFive={data.dayFive}
                daySix={data.daySix}
              />
            </section>

            {/* Trend-Chart */}
            <section>
              <TrendChart 
                data={trendData} 
                confidence={data.confidence}
                nowTs={data.source.data_timestamp_local}
              />
            </section>
          </TabsContent>

          <TabsContent value="pasture" className="space-y-4">
            <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
              <h2 className="text-lg font-semibold mb-2">Weidestand-Parameter</h2>
              <p className="text-sm text-muted-foreground">
                Geben Sie die aktuellen Bedingungen Ihrer Weide ein, um die Fruktan-Berechnung zu präzisieren. 
                Die Anpassungen werden sofort nach dem Speichern übernommen und können die Risikoeinschätzung um ±50% beeinflussen.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Empfehlung:</strong> Aktualisieren Sie die Daten 1-2x pro Woche. Die Daten bleiben 7 Tage gültig und 
                werden danach automatisch deaktiviert, bis neue Eingaben erfolgen.
              </p>
            </div>
            
            <PastureDataForm
              data={pastureData}
              onChange={setPastureData}
              onSave={handleSavePastureData}
            />
          </TabsContent>

          <TabsContent value="horses" className="space-y-6">
            <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
              <h2 className="text-lg font-semibold mb-2">Offenstall Pferde</h2>
              <p className="text-sm text-muted-foreground">
                Erfassen Sie Ihre Pferde mit minimalen Angaben und erhalten Sie pferdeindividuelle Weidezeit-Empfehlungen 
                basierend auf NSC-Budget, Ration und den aktuellen Fruktan-Scores.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Berechnung:</strong> NSC-Budget (8g/kg bei EMS, 12g/kg normal) minus NSC aus Heu/Kraftfutter = verfügbares Budget für Weide.
              </p>
            </div>

            <HorseList />

            {(() => {
              console.log("Checking display condition - activeHorses:", activeHorses.length, "data:", !!data);
              return null;
            })()}

            {activeHorses.length > 0 && data && (
              <>
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">Weidezeit-Empfehlungen</h3>
                      <p className="text-sm text-muted-foreground">
                        Minuten pro Zeitfenster für aktive Pferde
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value={data.today.date}>
                          Heute ({new Date(data.today.date).toLocaleDateString("de-DE")})
                        </option>
                        <option value={data.tomorrow.date}>
                          Morgen ({new Date(data.tomorrow.date).toLocaleDateString("de-DE")})
                        </option>
                        <option value={data.dayAfterTomorrow.date}>
                          Tag 2 ({new Date(data.dayAfterTomorrow.date).toLocaleDateString("de-DE")})
                        </option>
                        <option value={data.dayThree.date}>
                          Tag 3 ({new Date(data.dayThree.date).toLocaleDateString("de-DE")})
                        </option>
                        <option value={data.dayFour.date}>
                          Tag 4 ({new Date(data.dayFour.date).toLocaleDateString("de-DE")})
                        </option>
                        <option value={data.dayFive.date}>
                          Tag 5 ({new Date(data.dayFive.date).toLocaleDateString("de-DE")})
                        </option>
                        <option value={data.daySix.date}>
                          Tag 6 ({new Date(data.daySix.date).toLocaleDateString("de-DE")})
                        </option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExportTurnouts}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        CSV exportieren
                      </Button>
                    </div>
                  </div>

                  <TurnoutMatrix
                    recommendations={getTurnoutRecommendations()}
                    horses={horses}
                    date={selectedDate}
                  />
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="systemstatus" className="space-y-6">
            {/* Systemstatus wird in eigener Route /systemstatus angezeigt */}
            <div className="text-center py-12 space-y-4">
              <p className="text-lg font-medium">Systemstatus</p>
              <p className="text-muted-foreground">
                Die Systemstatus-Seite wurde in einen eigenen Bereich verschoben.
              </p>
              <Button onClick={() => window.location.href = '/systemstatus'}>
                Zum Systemstatus
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="validation" className="space-y-6">
            <SystemValidationPanel data={rawApiData} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Debug-Komponente (nur während Entwicklung sichtbar) */}
      <ScoreDebugger />
    </div>
  );
};

export default Index;


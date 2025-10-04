/**
 * Haupt-Seite der Fruktan-Matrix-Anwendung
 */

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { MatrixGrid } from "@/components/MatrixGrid";
import { TrendChart } from "@/components/TrendChart";
import { MetadataBar } from "@/components/MetadataBar";
import { CurrentConditions } from "@/components/CurrentConditions";
import { PastureDataForm } from "@/components/PastureDataForm";
import { useFruktanData } from "@/hooks/useFruktanData";
import { Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_LOCATION, type LocationData } from "@/types/fruktan";
import { DEFAULT_PASTURE_DATA, type PastureData } from "@/types/pasture";
import { exportToCSV, exportToPDF } from "@/lib/export";
import { exportQuestionnaireToPDF } from "@/lib/questionnaireExport";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const [pastureData, setPastureData] = useState<PastureData>(DEFAULT_PASTURE_DATA);
  const [activeTab, setActiveTab] = useState<string>("matrix");
  const { data, trendData, loading, error } = useFruktanData(true, location);
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
    localStorage.setItem("pastureData", JSON.stringify(pastureData));
    toast({
      title: "Weidestand gespeichert",
      description: "Die Daten wurden gespeichert und die Berechnung wird aktualisiert.",
    });
    // Reload page to recalculate with new pasture data
    setTimeout(() => window.location.reload(), 500);
  };

  const handleExportCSV = () => {
    if (!data) return;
    try {
      exportToCSV(
        [data.today, data.tomorrow, data.dayAfterTomorrow, data.dayThree],
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
        [data.today, data.tomorrow, data.dayAfterTomorrow, data.dayThree],
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
        fruktanNow={data?.fruktanNow}
      />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="matrix">Fruktan-Matrix</TabsTrigger>
            <TabsTrigger value="pasture">Weidestand-Eingabe</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="space-y-4 sm:space-y-6 md:space-y-8">
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

            {/* Matrix-Karten mit Glassmorphism */}
            <section>
              <MatrixGrid
                today={data.today}
                tomorrow={data.tomorrow}
                dayAfterTomorrow={data.dayAfterTomorrow}
                dayThree={data.dayThree}
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
            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Weidestand-Parameter</h2>
              <p className="text-sm text-muted-foreground">
                Geben Sie die aktuellen Bedingungen Ihrer Weide ein, um die Fruktan-Berechnung zu präzisieren. 
                Die Anpassungen werden sofort nach dem Speichern übernommen und können die Risikoeinschätzung um ±50% beeinflussen.
              </p>
            </div>
            <PastureDataForm
              data={pastureData}
              onChange={setPastureData}
              onSave={handleSavePastureData}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;

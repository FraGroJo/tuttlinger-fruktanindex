/**
 * Haupt-Seite der Fruktan-Matrix-Anwendung
 */

import { useState } from "react";
import { Header } from "@/components/Header";
import { MatrixGrid } from "@/components/MatrixGrid";
import { TrendChart } from "@/components/TrendChart";
import { MetadataBar } from "@/components/MetadataBar";
import { CurrentConditions } from "@/components/CurrentConditions";
import { useFruktanData } from "@/hooks/useFruktanData";
import { Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCATION, type LocationData } from "@/types/fruktan";
import { exportToCSV, exportToPDF } from "@/lib/export";
import { exportQuestionnaireToPDF } from "@/lib/questionnaireExport";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const { data, trendData, loading, error } = useFruktanData(true, location);
  const { toast } = useToast();

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
        {/* Current Conditions */}
        {data.current && (
          <section className="mb-4 sm:mb-6 md:mb-8 animate-fade-in">
            <CurrentConditions 
              current={data.current} 
              source={data.source} 
              flags={data.flags}
              fruktanNow={data.fruktanNow}
            />
          </section>
        )}

        {/* Metadaten & Stale-Banner */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <MetadataBar
            metadata={data.metadata}
            flags={data.flags}
            onRefresh={() => window.location.reload()}
          />
        </div>

        {/* Export-Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-end mb-3 sm:mb-4 md:mb-6">
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
        <section className="mb-4 sm:mb-6 md:mb-8">
          <MatrixGrid
            today={data.today}
            tomorrow={data.tomorrow}
            dayAfterTomorrow={data.dayAfterTomorrow}
            dayThree={data.dayThree}
          />
        </section>

        {/* Trend-Chart */}
        <section className="mb-4 sm:mb-6 md:mb-8">
          <TrendChart 
            data={trendData} 
            confidence={data.confidence}
            nowTs={data.source.data_timestamp_local}
          />
        </section>
      </main>
    </div>
  );
};

export default Index;

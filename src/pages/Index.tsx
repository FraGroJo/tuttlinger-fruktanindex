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
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const { data, trendData, loading, error } = useFruktanData(true, location);
  const { toast } = useToast();

  const handleExportCSV = () => {
    if (!data) return;
    try {
      exportToCSV(
        [data.today, data.tomorrow, data.dayAfterTomorrow],
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
        [data.today, data.tomorrow, data.dayAfterTomorrow],
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

      <main className="container mx-auto px-4 py-8">
        {/* Hero-Section */}
        <div className="text-center py-6 px-4 mb-6">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Fruktan-Radar Tuttlingen
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Weiderisiko heute – schnell verstehen & sicher entscheiden
          </p>
        </div>

        {/* Current Conditions */}
        {data.current && (
          <section className="mb-6 animate-fade-in">
            <CurrentConditions current={data.current} source={data.source} flags={data.flags} />
          </section>
        )}

        {/* Metadaten & Stale-Banner */}
        <div className="mb-6">
          <MetadataBar
            metadata={data.metadata}
            flags={data.flags}
            onRefresh={() => window.location.reload()}
          />
        </div>

        {/* Export-Buttons */}
        <div className="flex flex-wrap gap-3 justify-end mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            CSV exportieren
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="gap-2"
          >
            <FileText className="w-4 h-4" />
            PDF-Bericht
          </Button>
        </div>

        {/* Matrix-Karten mit Glassmorphism */}
        <section className="mb-8">
          <MatrixGrid
            today={data.today}
            tomorrow={data.tomorrow}
            dayAfterTomorrow={data.dayAfterTomorrow}
          />
        </section>

        {/* Trend-Chart */}
        <section className="mb-8">
          <TrendChart data={trendData} confidence={data.confidence} />
        </section>
      </main>
    </div>
  );
};

export default Index;

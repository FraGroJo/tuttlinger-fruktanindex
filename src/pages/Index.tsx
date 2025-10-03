/**
 * Haupt-Seite der Fruktan-Matrix-Anwendung
 */

import { useState } from "react";
import { Header } from "@/components/Header";
import { MatrixGrid } from "@/components/MatrixGrid";
import { TrendChart } from "@/components/TrendChart";
import { useFruktanData } from "@/hooks/useFruktanData";
import { Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCATION, type LocationData } from "@/types/fruktan";
import { exportToCSV, exportToPDF } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [emsMode, setEmsMode] = useState(false);
  const [location, setLocation] = useState<LocationData>(DEFAULT_LOCATION);
  const { data, trendData, loading, error } = useFruktanData(emsMode, location);
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
        emsMode
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
    <div className="min-h-screen bg-background">
      <Header
        location={location}
        emsMode={emsMode}
        onEmsToggle={setEmsMode}
        onLocationChange={setLocation}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Matrix-Karten */}
        <section className="mb-8">
          <MatrixGrid
            today={data.today}
            tomorrow={data.tomorrow}
            dayAfterTomorrow={data.dayAfterTomorrow}
          />
        </section>

        {/* Trend-Chart */}
        <section className="mb-8">
          <TrendChart data={trendData} />
        </section>

        {/* Export-Bereich */}
        <section className="bg-card rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Export & Berichte</h2>
          <div className="flex flex-wrap gap-4">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleExportCSV}
              disabled={!data}
            >
              <Download className="w-4 h-4" />
              CSV exportieren
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleExportPDF}
              disabled={!data}
            >
              <FileText className="w-4 h-4" />
              PDF-Bericht
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Exportiere die Fruktan-Matrix als CSV-Datei oder druckfertigen PDF-Bericht.
          </p>
        </section>

        {/* Info-Footer */}
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Datenquelle: Open-Meteo API • Aktualisiert: {new Date(data.generatedAt).toLocaleString("de-DE")}
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;

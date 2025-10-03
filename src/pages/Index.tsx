/**
 * Haupt-Seite der Fruktan-Matrix-Anwendung
 */

import { useState } from "react";
import { Header } from "@/components/Header";
import { MatrixGrid } from "@/components/MatrixGrid";
import { useFruktanData } from "@/hooks/useFruktanData";
import { Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LOCATION } from "@/types/fruktan";

const Index = () => {
  const [emsMode, setEmsMode] = useState(false);
  const { data, loading, error } = useFruktanData(emsMode);

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
        locationName={DEFAULT_LOCATION.name}
        emsMode={emsMode}
        onEmsToggle={setEmsMode}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Matrix-Karten */}
        <section className="mb-12">
          <MatrixGrid
            today={data.today}
            tomorrow={data.tomorrow}
            dayAfterTomorrow={data.dayAfterTomorrow}
          />
        </section>

        {/* Export-Bereich */}
        <section className="bg-card rounded-lg border p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Export & Berichte</h2>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              CSV exportieren
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              PDF-Bericht
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Export-Funktionen werden in der finalen Version mit Backend-Integration verfügbar sein.
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

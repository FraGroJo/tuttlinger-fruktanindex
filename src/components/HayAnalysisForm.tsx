import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle, FileText, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { HayAnalysis } from "@/types/hay";
import { isHayAnalysisValid } from "@/types/hay";

export function HayAnalysisForm() {
  const [hayData, setHayData] = useState<HayAnalysis | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Lade gespeicherte Heuanalyse
  useEffect(() => {
    const stored = localStorage.getItem("hayAnalysis");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as HayAnalysis;
        setHayData(parsed);
      } catch (e) {
        console.warn("Failed to parse hay analysis", e);
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const sampleDate = formData.get("sampleDate") as string;
    const sampleDateObj = new Date(sampleDate);
    const validUntil = new Date(sampleDateObj.getTime() + 180 * 24 * 60 * 60 * 1000); // +6 Monate

    const analysis: HayAnalysis = {
      sampleDate,
      sampleName: formData.get("sampleName") as string,
      reportNumber: formData.get("reportNumber") as string,
      fruktan: parseFloat(formData.get("fruktan") as string),
      gesamtzucker: parseFloat(formData.get("gesamtzucker") as string),
      nfc: parseFloat(formData.get("nfc") as string),
      rohfaser: parseFloat(formData.get("rohfaser") as string),
      adfom: parseFloat(formData.get("adfom") as string),
      andfom: parseFloat(formData.get("andfom") as string),
      rohprotein: parseFloat(formData.get("rohprotein") as string),
      rohfett: parseFloat(formData.get("rohfett") as string),
      rohasche: parseFloat(formData.get("rohasche") as string),
      mePferd: parseFloat(formData.get("mePferd") as string),
      calcium: parseFloat(formData.get("calcium") as string),
      selen: parseFloat(formData.get("selen") as string),
      uploadDate: new Date().toISOString(),
      validUntil: validUntil.toISOString(),
    };

    localStorage.setItem("hayAnalysis", JSON.stringify(analysis));
    setHayData(analysis);
    setIsEditing(false);
    toast.success("Heuanalyse gespeichert");
  };

  const handleDelete = () => {
    localStorage.removeItem("hayAnalysis");
    setHayData(null);
    setIsEditing(false);
    toast.info("Heuanalyse gelöscht");
  };

  const isValid = hayData ? isHayAnalysisValid(hayData) : false;

  if (!hayData || isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Heuanalyse
          </CardTitle>
          <CardDescription>
            Laden Sie Ihre LUFA-Heuanalyse hoch, um die Fruktan-Berechnungen zu präzisieren
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reportNumber">Prüfbericht-Nr.</Label>
                <Input
                  id="reportNumber"
                  name="reportNumber"
                  placeholder="z.B. 25FG008305"
                  defaultValue={hayData?.reportNumber}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sampleName">Bezeichnung</Label>
                <Input
                  id="sampleName"
                  name="sampleName"
                  placeholder="z.B. 1. Schnitt 2025"
                  defaultValue={hayData?.sampleName}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sampleDate">Probenahme-Datum</Label>
                <Input
                  id="sampleDate"
                  name="sampleDate"
                  type="date"
                  defaultValue={hayData?.sampleDate}
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Kritische Werte (% in Trockensubstanz)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fruktan">Fruktan (%)</Label>
                  <Input
                    id="fruktan"
                    name="fruktan"
                    type="number"
                    step="0.1"
                    placeholder="z.B. 5.9"
                    defaultValue={hayData?.fruktan}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Zielwert: &lt; 5.0%</p>
                </div>
                <div>
                  <Label htmlFor="gesamtzucker">Gesamtzucker (%)</Label>
                  <Input
                    id="gesamtzucker"
                    name="gesamtzucker"
                    type="number"
                    step="0.1"
                    placeholder="z.B. 12.4"
                    defaultValue={hayData?.gesamtzucker}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Zielwert: &lt; 10.0%</p>
                </div>
                <div>
                  <Label htmlFor="nfc">NFC (%)</Label>
                  <Input
                    id="nfc"
                    name="nfc"
                    type="number"
                    step="0.1"
                    placeholder="z.B. 26.8"
                    defaultValue={hayData?.nfc}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Strukturwerte</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rohfaser">Rohfaser (%)</Label>
                  <Input
                    id="rohfaser"
                    name="rohfaser"
                    type="number"
                    step="0.1"
                    defaultValue={hayData?.rohfaser}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="adfom">ADFom (%)</Label>
                  <Input
                    id="adfom"
                    name="adfom"
                    type="number"
                    step="0.1"
                    defaultValue={hayData?.adfom}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="andfom">aNDFom (%)</Label>
                  <Input
                    id="andfom"
                    name="andfom"
                    type="number"
                    step="0.1"
                    defaultValue={hayData?.andfom}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Nährstoffe & Energie</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rohprotein">Rohprotein (%)</Label>
                  <Input
                    id="rohprotein"
                    name="rohprotein"
                    type="number"
                    step="0.1"
                    defaultValue={hayData?.rohprotein}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rohfett">Rohfett (%)</Label>
                  <Input
                    id="rohfett"
                    name="rohfett"
                    type="number"
                    step="0.1"
                    defaultValue={hayData?.rohfett}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rohasche">Rohasche (%)</Label>
                  <Input
                    id="rohasche"
                    name="rohasche"
                    type="number"
                    step="0.1"
                    defaultValue={hayData?.rohasche}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="mePferd">ME-Pferd (MJ/kg)</Label>
                  <Input
                    id="mePferd"
                    name="mePferd"
                    type="number"
                    step="0.1"
                    defaultValue={hayData?.mePferd}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="calcium">Calcium (%)</Label>
                  <Input
                    id="calcium"
                    name="calcium"
                    type="number"
                    step="0.01"
                    defaultValue={hayData?.calcium}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="selen">Selen (mg/kg)</Label>
                  <Input
                    id="selen"
                    name="selen"
                    type="number"
                    step="0.01"
                    defaultValue={hayData?.selen}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                <Upload className="h-4 w-4 mr-2" />
                Speichern
              </Button>
              {hayData && (
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Abbrechen
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Heuanalyse aktiv
        </CardTitle>
        <CardDescription>
          {hayData.sampleName} • Bericht {hayData.reportNumber}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analyse abgelaufen</AlertTitle>
            <AlertDescription>
              Diese Heuanalyse ist älter als 6 Monate. Bitte aktualisieren Sie die Daten.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Fruktan</p>
            <p className={`text-2xl font-bold ${hayData.fruktan > 5.0 ? 'text-destructive' : 'text-primary'}`}>
              {hayData.fruktan.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Ziel: &lt; 5.0%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Zucker</p>
            <p className={`text-2xl font-bold ${hayData.gesamtzucker > 10.0 ? 'text-destructive' : 'text-primary'}`}>
              {hayData.gesamtzucker.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Ziel: &lt; 10.0%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">NFC</p>
            <p className="text-2xl font-bold">{hayData.nfc.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rohfaser</p>
            <p className="text-2xl font-bold">{hayData.rohfaser.toFixed(1)}%</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            Bearbeiten
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Löschen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

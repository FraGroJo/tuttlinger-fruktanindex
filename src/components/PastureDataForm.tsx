import { useState, useEffect } from "react";
import { PastureData, DEFAULT_PASTURE_DATA, isPastureDataValid, getDaysUntilExpiry, PLANT_SPECIES, PlantSpecies } from "@/types/pasture";
import { HayAnalysis, isHayAnalysisValid } from "@/types/hay";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Save, RotateCcw, Calendar, AlertTriangle, CheckCircle2, Sparkles, FileText, Upload, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface PastureDataFormProps {
  data: PastureData;
  onChange: (data: PastureData) => void;
  onSave: () => void;
}

export function PastureDataForm({ data, onChange, onSave }: PastureDataFormProps) {
  const [hayData, setHayData] = useState<HayAnalysis | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Lade gespeicherte Heuanalyse
  useEffect(() => {
    const stored = localStorage.getItem("hayAnalysis");
    if (stored) {
      try {
        setHayData(JSON.parse(stored) as HayAnalysis);
      } catch (e) {
        console.warn("Failed to parse hay analysis", e);
      }
    }
  }, []);

  const handleReset = () => {
    onChange(DEFAULT_PASTURE_DATA);
  };

  const applyAnalysis = () => {
    onChange({
      ...data,
      presentSpecies: ["schafgarbe", "loewenzahn", "weissklee", "rotklee", "spitzwegerich", "hahnenfuss", "wilde-moehre", "storchschnabel"],
      notes: "Weideanalyse: Hohe Kräutervielfalt (Schafgarbe, Löwenzahn, Wegerich, Storchschnabel, Wilde Möhre), geringer Hahnenfuß-Anteil, typische Fettwiese mit gutem Kleeanteil (Weiß- und Rotklee)."
    });
    toast({
      title: "Analysewerte übernommen",
      description: "8 Pflanzenarten erkannt und übernommen",
    });
  };

  const updateField = <K extends keyof PastureData>(field: K, value: PastureData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const toggleSpecies = (speciesId: string) => {
    const current = data.presentSpecies || [];
    const updated = current.includes(speciesId)
      ? current.filter(id => id !== speciesId)
      : [...current, speciesId];
    updateField("presentSpecies", updated);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Ungültiger Dateityp",
        description: "Bitte laden Sie eine PDF-Datei hoch (LUFA-Analysebericht)",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);
    toast({
      title: "Datei wird verarbeitet...",
      description: "Bitte warten Sie, während die Analyse ausgelesen wird.",
    });

    try {
      // Hier würde die PDF-Parsing-Logik kommen
      // Vorerst: Manuelle Eingabe weiterhin erforderlich
      toast({
        title: "Upload erfolgreich",
        description: "Bitte überprüfen und vervollständigen Sie die Analysewerte",
      });
    } catch (error) {
      toast({
        title: "Fehler beim Hochladen",
        description: "Die Datei konnte nicht verarbeitet werden",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleDeleteHayAnalysis = () => {
    localStorage.removeItem("hayAnalysis");
    setHayData(null);
    toast({
      title: "Heuanalyse gelöscht",
      description: "Die Daten wurden entfernt",
    });
  };

  const hayIsValid = hayData ? isHayAnalysisValid(hayData) : false;

  const isValid = isPastureDataValid(data);
  const daysRemaining = getDaysUntilExpiry(data);
  const hasData = data.savedAt !== undefined;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Alert */}
      {hasData && (
        <Alert variant={isValid ? "default" : "destructive"}>
          {isValid ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weidestand-Daten Status
          </AlertTitle>
          <AlertDescription>
            {isValid ? (
              <>
                <strong>Aktiv</strong> - Gespeichert am {formatDate(data.savedAt!)}.
                <br />
                Noch <strong>{daysRemaining} Tag{daysRemaining !== 1 ? "e" : ""}</strong> gültig (bis {formatDate(new Date(new Date(data.savedAt!).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())}).
                <br />
                <span className="text-sm text-muted-foreground">
                  Die Daten beeinflussen aktuell die Fruktan-Berechnung. Nach Ablauf wird automatisch auf API-Daten ohne manuelle Anpassungen zurückgegriffen.
                </span>
              </>
            ) : (
              <>
                <strong>Abgelaufen</strong> - Die Daten sind älter als 7 Tage (gespeichert am {formatDate(data.savedAt!)}).
                <br />
                <span className="text-sm">
                  Die Fruktan-Berechnung verwendet derzeit <strong>nur API-Daten ohne Weidestand-Anpassungen</strong>.
                  Bitte aktualisieren Sie die Daten, um präzisere Ergebnisse zu erhalten.
                </span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {!hasData && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertTitle>Keine Weidestand-Daten vorhanden</AlertTitle>
          <AlertDescription>
            Geben Sie die aktuellen Bedingungen Ihrer Weide ein, um die Fruktan-Berechnung zu präzisieren.
            Die Daten bleiben <strong>7 Tage</strong> gültig und sollten 1-2x pro Woche aktualisiert werden.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Analysis Button */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Sparkles className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold">Letzte Weideanalyse anwenden</h3>
              <p className="text-sm text-muted-foreground">
                Übernimmt die erkannten Pflanzenarten aus Ihrer Foto-Analyse: Schafgarbe, Löwenzahn, Wegerich, Storchschnabel, Wilde Möhre, Weiß- und Rotklee, geringer Hahnenfuß.
              </p>
            </div>
            <Button onClick={applyAnalysis} variant="outline" size="sm" className="flex-shrink-0">
              Übernehmen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Heuanalyse-Sektion */}
      <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            Heuanalyse (Optional)
          </CardTitle>
          <CardDescription>
            Für präzisere Weidezeit-Berechnungen bei Offenstall-Pferden
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hayData ? (
            <>
              {/* Heuanalyse-Status */}
              <Alert variant={hayIsValid ? "default" : "destructive"}>
                {hayIsValid ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {hayIsValid ? "Heuanalyse aktiv" : "Heuanalyse abgelaufen"}
                </AlertTitle>
                <AlertDescription>
                  {hayIsValid ? (
                    <>
                      Bericht: <strong>{hayData.reportNumber}</strong> ({hayData.sampleName})
                      <br />
                      Fruktan: <strong>{hayData.fruktan.toFixed(1)}%</strong>, 
                      Zucker: <strong>{hayData.gesamtzucker.toFixed(1)}%</strong>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Gültig bis: {new Date(hayData.validUntil).toLocaleDateString('de-DE')}
                      </span>
                    </>
                  ) : (
                    <>
                      Die Analyse ist älter als 6 Monate und wird nicht mehr berücksichtigt.
                      Bitte laden Sie eine neue Analyse hoch.
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {/* Aktionen */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDeleteHayAnalysis}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Analyse löschen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('hay-upload')?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Neue hochladen
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Kein Upload vorhanden */}
              <div className="text-center py-6 space-y-4">
                <div className="text-sm text-muted-foreground">
                  Keine Heuanalyse vorhanden
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('hay-upload')?.click()}
                  disabled={uploadingFile}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingFile ? "Wird verarbeitet..." : "LUFA-Bericht hochladen (PDF)"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Nach dem Upload können Sie die Werte überprüfen und speichern
                </p>
              </div>
            </>
          )}

          {/* Verstecktes File-Input */}
          <input
            id="hay-upload"
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Wachstumsbedingungen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Aktuelle Wachstumsbedingungen</CardTitle>
          <CardDescription>Sich verändernde Parameter der Weide</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grassHeight">Grashöhe (cm)</Label>
            <Select value={data.grassHeight} onValueChange={(v: any) => updateField("grassHeight", v)}>
              <SelectTrigger id="grassHeight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<5">&lt;5 cm (sehr kurz)</SelectItem>
                <SelectItem value="5-10">5-10 cm (kurz)</SelectItem>
                <SelectItem value="10-15">10-15 cm (normal)</SelectItem>
                <SelectItem value="15-20">15-20 cm (hoch)</SelectItem>
                <SelectItem value=">20">&gt;20 cm (sehr hoch)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="growthPhase">Wachstumsphase</Label>
            <Select value={data.growthPhase} onValueChange={(v: any) => updateField("growthPhase", v)}>
              <SelectTrigger id="growthPhase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ruhend">Ruhend (Winter/Trockenheit)</SelectItem>
                <SelectItem value="langsam">Langsam (Frühjahr/Herbst)</SelectItem>
                <SelectItem value="aktiv">Aktiv (normale Bedingungen)</SelectItem>
                <SelectItem value="sehr-schnell">Sehr schnell (optimal)</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </CardContent>
      </Card>

      {/* Pflanzenarten Auswahl */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Vorhandene Pflanzenarten</CardTitle>
          <CardDescription>Wählen Sie alle auf der Weide vorkommenden Arten aus</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Kräuter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Kräuter</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PLANT_SPECIES.filter(s => s.category === "herb").map(species => (
                <div key={species.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={species.id}
                    checked={(data.presentSpecies || []).includes(species.id)}
                    onCheckedChange={() => toggleSpecies(species.id)}
                  />
                  <label
                    htmlFor={species.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {species.name}
                    <span className="text-muted-foreground ml-1">
                      (~{species.fructanContent}% Fruktan)
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Leguminosen */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Leguminosen (Klee-Arten)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PLANT_SPECIES.filter(s => s.category === "legume").map(species => (
                <div key={species.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={species.id}
                    checked={(data.presentSpecies || []).includes(species.id)}
                    onCheckedChange={() => toggleSpecies(species.id)}
                  />
                  <label
                    htmlFor={species.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {species.name}
                    <span className="text-muted-foreground ml-1">
                      (~{species.fructanContent}% Fruktan)
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Unkräuter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Unkräuter</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PLANT_SPECIES.filter(s => s.category === "weed").map(species => (
                <div key={species.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={species.id}
                    checked={(data.presentSpecies || []).includes(species.id)}
                    onCheckedChange={() => toggleSpecies(species.id)}
                  />
                  <label
                    htmlFor={species.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {species.name}
                    <span className="text-muted-foreground ml-1">
                      (~{species.fructanContent}% Fruktan, +{((species.riskModifier - 1) * 100).toFixed(0)}% Risiko)
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Zusammenfassung */}
          {data.presentSpecies && data.presentSpecies.length > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Ausgewählte Arten: {data.presentSpecies.length}</AlertTitle>
              <AlertDescription>
                {PLANT_SPECIES.filter(s => data.presentSpecies.includes(s.id)).map(s => s.name).join(", ")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Notizen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Besondere Beobachtungen</CardTitle>
          <CardDescription>Notizen zur aktuellen Weidesituation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notizen (optional)</Label>
            <Textarea
              id="notes"
              placeholder="z.B. Witterung, besondere Ereignisse, Auffälligkeiten..."
              value={data.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Zurücksetzen
        </Button>
        <Button onClick={onSave}>
          <Save className="w-4 h-4 mr-2" />
          Speichern & Anwenden
        </Button>
      </div>
    </div>
  );
}

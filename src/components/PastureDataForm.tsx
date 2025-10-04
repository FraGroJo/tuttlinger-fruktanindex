import { useState } from "react";
import { PastureData, DEFAULT_PASTURE_DATA, isPastureDataValid, getDaysUntilExpiry } from "@/types/pasture";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Save, RotateCcw, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";

interface PastureDataFormProps {
  data: PastureData;
  onChange: (data: PastureData) => void;
  onSave: () => void;
}

export function PastureDataForm({ data, onChange, onSave }: PastureDataFormProps) {
  const handleReset = () => {
    onChange(DEFAULT_PASTURE_DATA);
  };

  const updateField = <K extends keyof PastureData>(field: K, value: PastureData[K]) => {
    onChange({ ...data, [field]: value });
  };

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

      {/* Grasbestand */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Grasbestand (20% Einfluss)</CardTitle>
          <CardDescription>Grundlegende Eigenschaften der Weide</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="grassType">Dominante Grasart</Label>
            <Select value={data.grassType} onValueChange={(v: any) => updateField("grassType", v)}>
              <SelectTrigger id="grassType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weidelgras">Deutsches Weidelgras</SelectItem>
                <SelectItem value="wiesenrispe">Wiesenrispe</SelectItem>
                <SelectItem value="wiesenschwingel">Wiesenschwingel</SelectItem>
                <SelectItem value="rotschwingel">Rotschwingel</SelectItem>
                <SelectItem value="mix">Mix</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cloverPercentage">Anteil Weißklee/Leguminosen</Label>
            <Select value={data.cloverPercentage} onValueChange={(v: any) => updateField("cloverPercentage", v)}>
              <SelectTrigger id="cloverPercentage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-10">0-10%</SelectItem>
                <SelectItem value="10-30">10-30%</SelectItem>
                <SelectItem value=">30">&gt;30%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pastureAge">Bestandsalter (Jahre)</Label>
            <Select value={data.pastureAge} onValueChange={(v: any) => updateField("pastureAge", v)}>
              <SelectTrigger id="pastureAge">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<1">&lt;1 Jahr</SelectItem>
                <SelectItem value="1-3">1-3 Jahre</SelectItem>
                <SelectItem value="3-10">3-10 Jahre</SelectItem>
                <SelectItem value=">10">&gt;10 Jahre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Wachstumsstadium */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Wachstumsstadium (25% Einfluss)</CardTitle>
          <CardDescription>Aktueller Zustand der Gräser</CardDescription>
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

          <div className="space-y-2">
            <Label htmlFor="floweringVisible">Blütenstände sichtbar?</Label>
            <Select value={data.floweringVisible} onValueChange={(v: any) => updateField("floweringVisible", v)}>
              <SelectTrigger id="floweringVisible">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ja">Ja</SelectItem>
                <SelectItem value="nein">Nein</SelectItem>
                <SelectItem value="teilweise">Teilweise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Beweidungs-/Schnitthistorie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">3. Beweidungs-/Schnitthistorie (30% Einfluss)</CardTitle>
          <CardDescription>Nutzungsgeschichte der Weide - kritischster Faktor!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="daysSinceLastUse" className="font-semibold">Tage seit letzter Nutzung ⭐</Label>
            <Select value={data.daysSinceLastUse} onValueChange={(v: any) => updateField("daysSinceLastUse", v)}>
              <SelectTrigger id="daysSinceLastUse">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-3">0-3 Tage (sehr frisch)</SelectItem>
                <SelectItem value="4-7">4-7 Tage (frisch)</SelectItem>
                <SelectItem value="8-14">8-14 Tage (normal)</SelectItem>
                <SelectItem value="15-21">15-21 Tage (älter)</SelectItem>
                <SelectItem value="22-28">22-28 Tage (alt)</SelectItem>
                <SelectItem value=">28">&gt;28 Tage (sehr alt)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stubbleHeight">Restaufwuchs nach letzter Nutzung (cm)</Label>
            <Select value={data.stubbleHeight} onValueChange={(v: any) => updateField("stubbleHeight", v)}>
              <SelectTrigger id="stubbleHeight">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<3">&lt;3 cm (sehr kurz)</SelectItem>
                <SelectItem value="3-5">3-5 cm (kurz)</SelectItem>
                <SelectItem value="5-8">5-8 cm (normal)</SelectItem>
                <SelectItem value=">8">&gt;8 cm (hoch)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grazingIntensity">Beweidungsintensität</Label>
            <Select value={data.grazingIntensity} onValueChange={(v: any) => updateField("grazingIntensity", v)}>
              <SelectTrigger id="grazingIntensity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stark">Stark abgeweidet</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="leicht">Leicht</SelectItem>
                <SelectItem value="ungenutzt">Ungenutzt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grazingType">Weidesystem</Label>
            <Select value={data.grazingType} onValueChange={(v: any) => updateField("grazingType", v)}>
              <SelectTrigger id="grazingType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rotation">Rotationsweide</SelectItem>
                <SelectItem value="stand">Standweide</SelectItem>
                <SelectItem value="portion">Portionsweide</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Düngung */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">4. Düngung & Nährstoffe (15% Einfluss)</CardTitle>
          <CardDescription>Nährstoffversorgung der Weide</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lastNFertilization">Letzte N-Düngung</Label>
            <Select value={data.lastNFertilization} onValueChange={(v: any) => updateField("lastNFertilization", v)}>
              <SelectTrigger id="lastNFertilization">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="<2w">&lt;2 Wochen</SelectItem>
                <SelectItem value="2-4w">2-4 Wochen</SelectItem>
                <SelectItem value="4-8w">4-8 Wochen</SelectItem>
                <SelectItem value=">8w">&gt;8 Wochen</SelectItem>
                <SelectItem value="keine">Keine</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nAmount">N-Menge (kg/ha)</Label>
            <Select value={data.nAmount} onValueChange={(v: any) => updateField("nAmount", v)}>
              <SelectTrigger id="nAmount">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 (keine Düngung)</SelectItem>
                <SelectItem value="1-40">1-40 kg/ha</SelectItem>
                <SelectItem value="40-80">40-80 kg/ha</SelectItem>
                <SelectItem value="80-120">80-120 kg/ha</SelectItem>
                <SelectItem value=">120">&gt;120 kg/ha</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="organicFertilization"
              checked={data.organicFertilization}
              onCheckedChange={(v) => updateField("organicFertilization", v)}
            />
            <Label htmlFor="organicFertilization">Organische Düngung (Mist/Gülle)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Bodenbedingungen */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">5. Bodenbedingungen (5% Einfluss)</CardTitle>
          <CardDescription>Bodeneigenschaften und Feuchtigkeit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="soilType">Bodentyp</Label>
            <Select value={data.soilType} onValueChange={(v: any) => updateField("soilType", v)}>
              <SelectTrigger id="soilType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandig">Sandig</SelectItem>
                <SelectItem value="lehmig">Lehmig</SelectItem>
                <SelectItem value="tonig">Tonig</SelectItem>
                <SelectItem value="torf">Torf</SelectItem>
                <SelectItem value="mix">Mix</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="soilMoisture">Aktuelle Bodenfeuchte (visuell)</Label>
            <Select value={data.soilMoisture} onValueChange={(v: any) => updateField("soilMoisture", v)}>
              <SelectTrigger id="soilMoisture">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trocken">Trocken/rissig</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="feucht">Feucht</SelectItem>
                <SelectItem value="nass">Nass</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="drainage">Drainage</Label>
            <Select value={data.drainage} onValueChange={(v: any) => updateField("drainage", v)}>
              <SelectTrigger id="drainage">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gut">Gut</SelectItem>
                <SelectItem value="mittel">Mittel</SelectItem>
                <SelectItem value="schlecht">Schlecht</SelectItem>
                <SelectItem value="staunaesse">Staunässe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stress-Indikatoren */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">6. Stress-Indikatoren (5% Einfluss)</CardTitle>
          <CardDescription>Sichtbare Stresssymptome und Besonderheiten</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="visibleStress">Sichtbare Stresssymptome?</Label>
            <Select value={data.visibleStress} onValueChange={(v: any) => updateField("visibleStress", v)}>
              <SelectTrigger id="visibleStress">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verfaerbung">Verfärbung</SelectItem>
                <SelectItem value="welke">Welke</SelectItem>
                <SelectItem value="flecken">Flecken</SelectItem>
                <SelectItem value="keine">Keine</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="laminitisSensitive"
              checked={data.laminitisSensitive}
              onCheckedChange={(v) => updateField("laminitisSensitive", v)}
            />
            <Label htmlFor="laminitisSensitive">Pferde bereits hufrehe-empfindlich</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Besondere Beobachtungen</Label>
            <Textarea
              id="notes"
              placeholder="Notizen zur aktuellen Weidesituation..."
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

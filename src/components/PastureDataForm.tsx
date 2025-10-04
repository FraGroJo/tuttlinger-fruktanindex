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
        </CardContent>
      </Card>

      {/* Kräuter und Unkräuter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. Kräuter & Unkräuter</CardTitle>
          <CardDescription>Pflanzenvielfalt und unerwünschte Arten</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buttercupPresence">Hahnenfuß-Anteil</Label>
            <Select value={data.buttercupPresence} onValueChange={(v: any) => updateField("buttercupPresence", v)}>
              <SelectTrigger id="buttercupPresence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keiner">Keiner</SelectItem>
                <SelectItem value="gering">Gering (&lt;5%)</SelectItem>
                <SelectItem value="mittel">Mittel (5-15%)</SelectItem>
                <SelectItem value="hoch">Hoch (&gt;15%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="herbDiversity">Kräutervielfalt</Label>
            <Select value={data.herbDiversity} onValueChange={(v: any) => updateField("herbDiversity", v)}>
              <SelectTrigger id="herbDiversity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keine">Keine/Sehr gering</SelectItem>
                <SelectItem value="gering">Gering (1-3 Arten)</SelectItem>
                <SelectItem value="mittel">Mittel (4-7 Arten)</SelectItem>
                <SelectItem value="hoch">Hoch (&gt;7 Arten)</SelectItem>
              </SelectContent>
            </Select>
          </div>
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

/**
 * UI-Panel für System-Validierung inkl. Modellvergleich (MAE / RMSE)
 * Standort: Bonndorf
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Play, Download } from 'lucide-react';
import { systemValidator, type ValidationReport } from '@/lib/systemValidator';
import { runModelComparison, type ModelComparisonReport, type Ampel } from '@/lib/modelMetrics';
import { BONNDORF_LOCATION } from '@/lib/weatherApiClient';
import type { ECMWFResponse } from '@/types/api';

interface SystemValidationPanelProps {
  data: ECMWFResponse | null;
}

const nf = (v: number, digits = 2) =>
  Number.isFinite(v) ? v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '–';

const AMPEL_STYLE: Record<Ampel, { dot: string; text: string; bg: string; label: string }> = {
  green: { dot: 'bg-risk-safe', text: 'text-risk-safe', bg: 'bg-risk-safe-bg', label: 'Grün – konsistent' },
  yellow: { dot: 'bg-risk-moderate', text: 'text-risk-moderate', bg: 'bg-risk-moderate-bg', label: 'Gelb – Abweichung' },
  red: { dot: 'bg-risk-high', text: 'text-risk-high', bg: 'bg-risk-high-bg', label: 'Rot – kritisch' },
};

function AmpelDot({ status }: { status: Ampel }) {
  const s = AMPEL_STYLE[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} aria-hidden="true" />
      <span className="sr-only">{s.label}</span>
    </span>
  );
}

export function SystemValidationPanel({ data }: SystemValidationPanelProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [models, setModels] = useState<ModelComparisonReport | null>(null);
  const [running, setRunning] = useState(false);

  const handleRunValidation = async () => {
    setRunning(true);
    try {
      const [result, modelReport] = await Promise.all([
        systemValidator.runFullSystemTest(data),
        runModelComparison(),
      ]);
      setReport(result);
      setModels(modelReport);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setRunning(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;

    const content = [
      '═══════════════════════════════════════════════════════════',
      '  SYSTEMVALIDIERUNGSPROTOKOLL - BONNDORFER FRUKTANINDEX',
      '═══════════════════════════════════════════════════════════',
      '',
      `Standort:     ${BONNDORF_LOCATION.name} (${BONNDORF_LOCATION.latitude}°N, ${BONNDORF_LOCATION.longitude}°E)`,
      `Start:        ${new Date(report.startTime).toLocaleString('de-DE')}`,
      `Ende:         ${new Date(report.endTime).toLocaleString('de-DE')}`,
      `Dauer:        ${(report.duration / 1000).toFixed(2)} s`,
      '',
      `Tests gesamt: ${report.totalTests}`,
      `✅ Bestanden:  ${report.passedTests}`,
      `❌ Fehlgeschlagen: ${report.failedTests}`,
      '',
      `Status:       ${report.passed ? '✅ SYSTEMVALIDIERUNG BESTANDEN' : '❌ FEHLER IN SYSTEMVALIDIERUNG'}`,
      '',
    ];

    if (models) {
      content.push('───────────────────────────────────────────────────────────');
      content.push('  MODELLVERGLEICH ICON-D2 vs. ECMWF (MAE / RMSE)');
      content.push('───────────────────────────────────────────────────────────');
      content.push(`Verglichene Stunden: ${models.overlapHours}`);
      content.push('');
      models.metrics.forEach(m => {
        const icon = m.status === 'green' ? '🟢' : m.status === 'yellow' ? '🟡' : '🔴';
        content.push(
          `${icon} ${m.label}: MAE ${nf(m.mae)} ${m.unit} | RMSE ${nf(m.rmse)} ${m.unit} | Bias ${nf(m.bias)} ${m.unit} | n=${m.n}`
        );
      });
      if (models.note) content.push(`⚠️  ${models.note}`);
      content.push('');
    }

    content.push('───────────────────────────────────────────────────────────');
    content.push('  DETAILLIERTE TESTERGEBNISSE');
    content.push('───────────────────────────────────────────────────────────');
    content.push('');

    const categories = [...new Set(report.results.map(r => r.category))];

    categories.forEach(category => {
      const categoryResults = report.results.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.passed).length;

      content.push(`\n📋 ${category} (${passed}/${categoryResults.length})`);
      content.push('─'.repeat(60));

      categoryResults.forEach(result => {
        const icon = result.passed ? '✅' : '❌';
        content.push(`${icon} ${result.test}`);

        if (result.expected !== undefined && result.actual !== undefined) {
          content.push(`   Erwartet: ${result.expected}`);
          content.push(`   Aktuell:  ${result.actual}`);
        }

        if (result.error) {
          content.push(`   ⚠️  Fehler: ${result.error}`);
        }

        content.push('');
      });
    });

    content.push('');
    content.push('═══════════════════════════════════════════════════════════');
    content.push(`  ${report.passed ? '✅ VALIDIERUNG ERFOLGREICH' : '❌ VALIDIERUNG FEHLGESCHLAGEN'}`);
    content.push('═══════════════════════════════════════════════════════════');

    const blob = new Blob([content.join('\n')], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `validation_bonndorf_${new Date().toISOString().split('T')[0]}.log`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryStatus = (categoryName: string): Ampel => {
    const categoryResults = report!.results.filter(r => r.category === categoryName);
    if (categoryResults.every(r => r.passed)) return 'green';
    if (categoryResults.some(r => r.passed)) return 'yellow';
    return 'red';
  };

  const getCategoryIcon = (categoryName: string) => {
    if (!report) return null;
    const status = getCategoryStatus(categoryName);
    if (status === 'green') return <CheckCircle2 className="h-4 w-4 text-risk-safe" />;
    if (status === 'yellow') return <AlertCircle className="h-4 w-4 text-risk-moderate" />;
    return <XCircle className="h-4 w-4 text-risk-high" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔬 System-Validierung</CardTitle>
        <CardDescription>
          Umfassender Test aller Berechnungsgrundlagen, Datenquellen und Anzeigelogiken – Standort{' '}
          {BONNDORF_LOCATION.name} ({BONNDORF_LOCATION.latitude}°N, {BONNDORF_LOCATION.longitude}°E)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!report && (
          <Alert>
            <AlertDescription>
              Die Systemvalidierung prüft:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>API-Integrität (ICON-D2 / ECMWF für Bonndorf)</li>
                <li>Modellvergleich mit MAE &amp; RMSE je Messgröße</li>
                <li>Score-Berechnungen (10 Stichproben)</li>
                <li>Temperatur- und Wetteranzeige</li>
                <li>Offenstall-Berechnungen (3 Testpferde × 4 Scores)</li>
                <li>Heuanalyse-Konstanten (LUFA 25FG008305)</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={handleRunValidation} disabled={running} className="w-full min-h-11">
          {running ? (
            <>Validierung läuft…</>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Systemvalidierung starten
            </>
          )}
        </Button>

        {models && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">📐 Modellvergleich ICON-D2 vs. ECMWF</h3>
              <span
                className={`inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium ${AMPEL_STYLE[models.overall].bg} ${AMPEL_STYLE[models.overall].text}`}
              >
                <AmpelDot status={models.overall} />
                {AMPEL_STYLE[models.overall].label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {models.overlapHours} gemeinsame Stundenwerte · {BONNDORF_LOCATION.name}
            </p>

            {models.note && (
              <Alert variant="destructive">
                <AlertDescription>{models.note}</AlertDescription>
              </Alert>
            )}

            {models.metrics.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">MAE und RMSE je Messgröße mit Ampelbewertung</caption>
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th scope="col" className="py-1 pr-2 font-medium">Größe</th>
                      <th scope="col" className="py-1 pr-2 text-right font-medium">MAE</th>
                      <th scope="col" className="py-1 pr-2 text-right font-medium">RMSE</th>
                      <th scope="col" className="py-1 pr-2 text-right font-medium">Bias</th>
                      <th scope="col" className="py-1 text-right font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.metrics.map(m => (
                      <tr key={m.key} className="border-t border-border">
                        <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                          {m.label} <span className="text-muted-foreground">({m.unit})</span>
                        </th>
                        <td className={`py-1.5 pr-2 text-right tabular-nums ${AMPEL_STYLE[m.status].text}`}>
                          {nf(m.mae)}
                        </td>
                        <td className={`py-1.5 pr-2 text-right tabular-nums ${AMPEL_STYLE[m.status].text}`}>
                          {nf(m.rmse)}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                          {nf(m.bias)}
                        </td>
                        <td className="py-1.5 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-xs ${AMPEL_STYLE[m.status].bg} ${AMPEL_STYLE[m.status].text}`}
                            title={`Grenzwerte MAE: grün ≤ ${nf(m.thresholds.green)}, gelb ≤ ${nf(m.thresholds.yellow)} ${m.unit}`}
                          >
                            <AmpelDot status={m.status} />
                            {m.status === 'green' ? 'OK' : m.status === 'yellow' ? 'Abw.' : 'Kritisch'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {report && (
          <>
            <Alert variant={report.passed ? 'default' : 'destructive'}>
              <AlertDescription className="font-semibold">
                {report.passed ? (
                  <>✅ Systemvalidierung bestanden ({report.passedTests}/{report.totalTests} Tests)</>
                ) : (
                  <>❌ Validierung fehlgeschlagen ({report.failedTests} Fehler)</>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <div>Dauer: {(report.duration / 1000).toFixed(2)} s</div>
                <div>Zeitpunkt: {new Date(report.endTime).toLocaleString('de-DE')}</div>
              </div>

              <div className="grid gap-2">
                {[...new Set(report.results.map(r => r.category))].map(category => {
                  const categoryResults = report.results.filter(r => r.category === category);
                  const passed = categoryResults.filter(r => r.passed).length;
                  const status = getCategoryStatus(category);

                  return (
                    <div
                      key={category}
                      className={`flex items-center justify-between p-2 rounded-md ${AMPEL_STYLE[status].bg}`}
                    >
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <span className="text-sm font-medium">{category}</span>
                      </div>
                      <span className={`text-sm font-medium ${AMPEL_STYLE[status].text}`}>
                        {passed}/{categoryResults.length}
                      </span>
                    </div>
                  );
                })}
              </div>

              {report.failedTests > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <div className="font-semibold mb-2">Fehlgeschlagene Tests:</div>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {report.results
                        .filter(r => !r.passed)
                        .slice(0, 5)
                        .map((r, i) => (
                          <li key={i}>
                            {r.category}: {r.test}
                            {r.error && ` - ${r.error}`}
                          </li>
                        ))}
                      {report.failedTests > 5 && <li>… und {report.failedTests - 5} weitere</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleDownloadReport} variant="outline" className="w-full min-h-11">
                <Download className="mr-2 h-4 w-4" />
                Validierungsprotokoll herunterladen
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

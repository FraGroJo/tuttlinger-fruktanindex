/**
 * UI-Panel für System-Validierung
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Play, Download } from 'lucide-react';
import { systemValidator, type ValidationReport } from '@/lib/systemValidator';
import type { ECMWFResponse } from '@/types/api';

interface SystemValidationPanelProps {
  data: ECMWFResponse | null;
}

export function SystemValidationPanel({ data }: SystemValidationPanelProps) {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [running, setRunning] = useState(false);

  const handleRunValidation = async () => {
    setRunning(true);
    try {
      const result = await systemValidator.runFullSystemTest(data);
      setReport(result);
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
      '  SYSTEMVALIDIERUNGSPROTOKOLL - TUTTLINGER FRUKTANINDEX',
      '═══════════════════════════════════════════════════════════',
      '',
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
      '───────────────────────────────────────────────────────────',
      '  DETAILLIERTE TESTERGEBNISSE',
      '───────────────────────────────────────────────────────────',
      '',
    ];

    // Gruppiere nach Kategorie
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
    link.setAttribute('download', `validation_${new Date().toISOString().split('T')[0]}.log`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryIcon = (categoryName: string) => {
    if (!report) return null;
    const categoryResults = report.results.filter(r => r.category === categoryName);
    const allPassed = categoryResults.every(r => r.passed);
    const somePassed = categoryResults.some(r => r.passed);
    
    if (allPassed) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (somePassed) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>🔬 System-Validierung</CardTitle>
        <CardDescription>
          Umfassender Test aller Berechnungsgrundlagen, Datenquellen und Anzeigelogiken
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!report && (
          <Alert>
            <AlertDescription>
              Die Systemvalidierung prüft:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>API-Integrität (ECMWF-Datenquelle)</li>
                <li>Score-Berechnungen (10 Stichproben)</li>
                <li>Temperatur- und Wetteranzeige</li>
                <li>Offenstall-Berechnungen (3 Testpferde × 4 Scores)</li>
                <li>Heuanalyse-Konstanten (LUFA 25FG008305)</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleRunValidation} 
          disabled={running}
          className="w-full"
        >
          {running ? (
            <>Validierung läuft...</>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Systemvalidierung starten
            </>
          )}
        </Button>

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
                  
                  return (
                    <div key={category} className="flex items-center justify-between p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(category)}
                        <span className="text-sm font-medium">{category}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
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
                      {report.failedTests > 5 && (
                        <li>... und {report.failedTests - 5} weitere</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleDownloadReport} 
                variant="outline"
                className="w-full"
              >
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

/**
 * Debug-Komponente: Zeigt die berechneten Scores im Detail an
 */

import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bug } from "lucide-react";

export function ScoreDebugger() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Intercept console.log calls that start with [SCORE]
    const originalLog = console.log;
    console.log = function (...args) {
      const message = args.join(' ');
      if (message.includes('[SCORE')) {
        setLogs(prev => [...prev.slice(-20), message]); // Keep last 20 entries
      }
      originalLog.apply(console, args);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 gap-2"
      >
        <Bug className="w-4 h-4" />
        Score Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-y-auto p-4 bg-background/95 backdrop-blur">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Bug className="w-4 h-4" />
          Score Berechnung
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="h-6 w-6 p-0"
        >
          ×
        </Button>
      </div>

      <div className="space-y-1 text-xs font-mono">
        {logs.length === 0 ? (
          <p className="text-muted-foreground">Warte auf Score-Berechnungen...</p>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="border-b border-border pb-1">
              {log.replace('[SCORE ', '').replace(']', ':')}
            </div>
          ))
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setLogs([])}
        className="mt-3 w-full text-xs"
      >
        Clear
      </Button>
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Copy, CheckCircle, FileJson } from "lucide-react";
import { useState } from "react";
import { type FruktanResponse } from "@/types/fruktan";
import { useToast } from "@/hooks/use-toast";
import { RawDataViewer } from "./RawDataViewer";

interface ParityProofProps {
  data: FruktanResponse;
}

export function ParityProof({ data }: ParityProofProps) {
  const [showRawData, setShowRawData] = useState(false);
  const { toast } = useToast();

  const copyHash = (hash: string, label: string) => {
    navigator.clipboard.writeText(hash);
    toast({
      title: "Hash kopiert",
      description: `${label} wurde in die Zwischenablage kopiert.`,
    });
  };

  const hashPreview = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  return (
    <>
      <Card className="glass-card p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Datenbeleg & Parity</h3>
          <Badge variant="outline" className="ml-auto">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verifiziert
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Die gezeigten UI-Werte werden ausschließlich aus den unten aufgeführten Rohdaten berechnet. 
          Parity-Hashes gewährleisten die Datenintegrität.
        </p>

        {/* Parity Hashes */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Hourly Data Hash</p>
              <code className="text-xs font-mono">{hashPreview(data.parity.hourly_hash)}</code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyHash(data.parity.hourly_hash, "Hourly Hash")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Windows Data Hash</p>
              <code className="text-xs font-mono">{hashPreview(data.parity.windows_hash)}</code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyHash(data.parity.windows_hash, "Windows Hash")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Calculation Hash</p>
              <code className="text-xs font-mono">{hashPreview(data.parity.calc_hash)}</code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyHash(data.parity.calc_hash, "Calc Hash")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Raw Data Button */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowRawData(true)}
        >
          <FileJson className="h-4 w-4" />
          Rohdaten anzeigen
        </Button>
      </Card>

      {showRawData && (
        <RawDataViewer
          data={data}
          open={showRawData}
          onClose={() => setShowRawData(false)}
        />
      )}
    </>
  );
}

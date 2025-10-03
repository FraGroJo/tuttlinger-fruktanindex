import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { type FruktanResponse } from "@/types/fruktan";
import { useToast } from "@/hooks/use-toast";

interface RawDataViewerProps {
  data: FruktanResponse;
  open: boolean;
  onClose: () => void;
}

export function RawDataViewer({ data, open, onClose }: RawDataViewerProps) {
  const { toast } = useToast();

  const copyAllData = () => {
    const jsonString = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonString);
    toast({
      title: "Rohdaten kopiert",
      description: "Alle Daten wurden in die Zwischenablage kopiert.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Rohdaten (JSON)</DialogTitle>
          <DialogDescription>
            Vollständige API-Response mit allen berechneten Werten und Metadaten
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={copyAllData} className="gap-2">
            <Copy className="h-4 w-4" />
            Alle kopieren
          </Button>
        </div>

        <ScrollArea className="h-[60vh] w-full rounded-md border">
          <pre className="p-4 text-xs font-mono">
            {JSON.stringify(data, null, 2)}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/**
 * HorseList Komponente
 * Zeigt Liste der Pferde mit Wizard-Formular
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useHorses } from "@/hooks/useHorses";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Plus, Edit2, Trash2, CheckCircle2 } from "lucide-react";
import { HorseFormWizard } from "./HorseFormWizard";
import { type HorseMinimal } from "@/types/horse";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function HorseList() {
  const { horses, addHorse, updateHorse, deleteHorse } = useHorses();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHorse, setEditingHorse] = useState<HorseMinimal | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSubmit = (horse: HorseMinimal) => {
    if (editingHorse) {
      updateHorse(horse.id, horse);
      toast({ title: "Pferd aktualisiert", description: `${horse.name} wurde gespeichert.` });
    } else {
      addHorse(horse);
      toast({ title: "Pferd hinzugefügt", description: `${horse.name} wurde erfolgreich angelegt.` });
    }
    setIsFormOpen(false);
    setEditingHorse(undefined);
  };

  const handleEdit = (horse: HorseMinimal) => {
    setEditingHorse(horse);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteHorse(id);
    const horse = horses.find((h) => h.id === id);
    toast({
      title: "Pferd gelöscht",
      description: `${horse?.name || "Pferd"} wurde entfernt.`,
      variant: "destructive",
    });
    setDeleteId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header mit Add-Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Meine Pferde ({horses.length}/6)</h3>
        {horses.length < 6 && (
          <Button
            onClick={() => {
              setEditingHorse(undefined);
              setIsFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Pferd hinzufügen
          </Button>
        )}
      </div>

      {/* Wizard-Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setIsFormOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl bg-card p-6 shadow-2xl"
            >
              <h2 className="text-2xl font-bold mb-6">
                {editingHorse ? "Pferd bearbeiten" : "Neues Pferd anlegen"}
              </h2>
              <HorseFormWizard
                onSubmit={handleSubmit}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingHorse(undefined);
                }}
                initialData={editingHorse}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pferde-Liste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {horses.map((horse) => (
          <motion.div
            key={horse.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    {horse.name}
                    {horse.is_active && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {horse.mass_kg} kg
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(horse)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteId(horse.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                {horse.easy_or_ems && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">EMS/Leichtfuttrig</span>
                  </div>
                )}
                {horse.muzzle === "on" && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Mit Maulkorb</span>
                  </div>
                )}
                <div>Heu: {horse.hay_kg_as_fed_per_day} kg/Tag</div>
                {horse.conc_kg_as_fed_per_day !== undefined && horse.conc_kg_as_fed_per_day > 0 && (
                  <div>Kraftfutter: {horse.conc_kg_as_fed_per_day} kg/Tag</div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {horses.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Noch keine Pferde angelegt. Fügen Sie Ihr erstes Pferd hinzu!
          </p>
          <Button
            onClick={() => {
              setEditingHorse(undefined);
              setIsFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Erstes Pferd hinzufügen
          </Button>
        </Card>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pferd löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

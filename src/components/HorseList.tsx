import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HorseForm } from "./HorseForm";
import { useHorses } from "@/hooks/useHorses";
import type { HorseMinimal } from "@/types/horse";
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingHorse, setEditingHorse] = useState<HorseMinimal | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [horseToDelete, setHorseToDelete] = useState<string | null>(null);

  const handleEdit = (horse: HorseMinimal) => {
    setEditingHorse(horse);
    setFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setHorseToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (horseToDelete) {
      deleteHorse(horseToDelete);
      setHorseToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleFormSubmit = (data: Omit<HorseMinimal, "id">) => {
    if (editingHorse) {
      updateHorse(editingHorse.id, data);
    } else {
      addHorse(data);
    }
    setEditingHorse(undefined);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingHorse(undefined);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Pferde-Übersicht</h2>
          <p className="text-muted-foreground">Maximal 6 Pferde</p>
        </div>
        <Button 
          onClick={() => setFormOpen(true)} 
          disabled={horses.length >= 6}
        >
          <Plus className="h-4 w-4 mr-2" />
          Neues Pferd
        </Button>
      </div>

      {horses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Noch keine Pferde angelegt</p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Erstes Pferd anlegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {horses.map((horse) => (
            <Card key={horse.id} className={!horse.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{horse.name}</CardTitle>
                    <CardDescription>{horse.mass_kg} kg</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(horse)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(horse.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {horse.easy_or_ems && (
                    <Badge variant="secondary">EMS/Leichtfuttrig</Badge>
                  )}
                  {horse.muzzle === "on" && (
                    <Badge variant="outline">Maulkorb</Badge>
                  )}
                  {!horse.is_active && (
                    <Badge variant="destructive">Inaktiv</Badge>
                  )}
                </div>

                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heu:</span>
                    <span>{horse.hay_kg_as_fed_per_day} kg/Tag</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heu NSC:</span>
                    <span>
                      {horse.hay_analysis_ref_id 
                        ? "Analyse" 
                        : `${horse.hay_nsc_pct}%`
                      }
                    </span>
                  </div>
                  {horse.conc_kg_as_fed_per_day && horse.conc_kg_as_fed_per_day > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kraftfutter:</span>
                      <span>{horse.conc_kg_as_fed_per_day} kg/Tag</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HorseForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        initialData={editingHorse}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pferd löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

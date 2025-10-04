import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { HorseMinimal } from "@/types/horse";
import { DEFAULT_HORSE } from "@/types/horse";

const horseSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  mass_kg: z.coerce.number().min(200, "Mindestens 200 kg").max(800, "Maximal 800 kg"),
  easy_or_ems: z.boolean(),
  muzzle: z.enum(["none", "on"]),
  hay_kg_as_fed_per_day: z.coerce.number().min(0).max(25, "Maximal 25 kg"),
  hay_nsc_source: z.enum(["manual", "analysis"]),
  hay_nsc_pct: z.coerce.number().min(4).max(20).optional(),
  hay_analysis_ref_id: z.string().optional(),
  conc_kg_as_fed_per_day: z.coerce.number().min(0).max(10).optional(),
  conc_nsc_pct: z.coerce.number().min(5).max(45).optional(),
  is_active: z.boolean(),
}).refine((data) => {
  if (data.hay_nsc_source === "manual") {
    return data.hay_nsc_pct !== undefined;
  }
  return true;
}, {
  message: "NSC % ist erforderlich",
  path: ["hay_nsc_pct"],
});

type HorseFormValues = z.infer<typeof horseSchema>;

interface HorseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<HorseMinimal, "id">) => void;
  initialData?: HorseMinimal;
}

export function HorseForm({ open, onOpenChange, onSubmit, initialData }: HorseFormProps) {
  const [hayNscSource, setHayNscSource] = useState<"manual" | "analysis">("manual");

  const form = useForm<HorseFormValues>({
    resolver: zodResolver(horseSchema),
    defaultValues: initialData ? {
      ...initialData,
      hay_nsc_source: initialData.hay_analysis_ref_id ? "analysis" : "manual",
    } : {
      ...DEFAULT_HORSE,
      hay_nsc_source: "manual",
    },
  });

  const handleSubmit = (values: HorseFormValues) => {
    const horseData: Omit<HorseMinimal, "id"> = {
      name: values.name,
      mass_kg: values.mass_kg,
      easy_or_ems: values.easy_or_ems,
      muzzle: values.muzzle,
      hay_kg_as_fed_per_day: values.hay_kg_as_fed_per_day,
      hay_nsc_pct: values.hay_nsc_source === "manual" ? values.hay_nsc_pct : undefined,
      hay_analysis_ref_id: values.hay_nsc_source === "analysis" ? values.hay_analysis_ref_id : undefined,
      conc_kg_as_fed_per_day: values.conc_kg_as_fed_per_day || 0,
      conc_nsc_pct: values.conc_nsc_pct || 25,
      is_active: values.is_active,
    };
    onSubmit(horseData);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Pferd bearbeiten" : "Neues Pferd anlegen"}</DialogTitle>
          <DialogDescription>
            Minimalprofil für pferdeindividuelle Weidezeit-Berechnung
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="z.B. Luna" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mass_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Körpergewicht (kg) *</FormLabel>
                  <FormControl>
                    <Input type="number" min={200} max={800} {...field} />
                  </FormControl>
                  <FormDescription>200-800 kg</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="easy_or_ems"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Leichtfuttrig / EMS / PPID-Risiko *</FormLabel>
                    <FormDescription>
                      Reduziert NSC-Budget auf 8 g/kg (statt 12 g/kg)
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="muzzle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maulkorb / Fressbremse *</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="muzzle-none" />
                        <Label htmlFor="muzzle-none">Kein Maulkorb (1.0 kg TM/h)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="on" id="muzzle-on" />
                        <Label htmlFor="muzzle-on">Mit Maulkorb (0.5 kg TM/h)</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Heu-Ration</h3>

              <FormField
                control={form.control}
                name="hay_kg_as_fed_per_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heu (kg Frischmasse/Tag) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={25} step={0.5} {...field} />
                    </FormControl>
                    <FormDescription>0-25 kg</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hay_nsc_source"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Heu-NSC Quelle *</FormLabel>
                    <FormControl>
                      <RadioGroup 
                        value={field.value} 
                        onValueChange={(val) => {
                          field.onChange(val);
                          setHayNscSource(val as "manual" | "analysis");
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="manual" id="nsc-manual" />
                          <Label htmlFor="nsc-manual">NSC % manuell eingeben</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="analysis" id="nsc-analysis" />
                          <Label htmlFor="nsc-analysis">Analysedatensatz wählen (noch nicht verfügbar)</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {hayNscSource === "manual" && (
                <FormField
                  control={form.control}
                  name="hay_nsc_pct"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Heu NSC % *</FormLabel>
                      <FormControl>
                        <Input type="number" min={4} max={20} step={0.1} {...field} />
                      </FormControl>
                      <FormDescription>4-20 % (Durchschnitt: ~10 %)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-4">Kraftfutter (optional)</h3>

              <FormField
                control={form.control}
                name="conc_kg_as_fed_per_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Menge (kg/Tag)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={10} step={0.1} {...field} />
                    </FormControl>
                    <FormDescription>0-10 kg, Standard: 0</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="conc_nsc_pct"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>NSC %</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} max={45} step={0.1} {...field} />
                    </FormControl>
                    <FormDescription>5-45 %, Standard: 25 %</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Aktiv</FormLabel>
                    <FormDescription>
                      Inaktive Pferde werden nicht in Berechnungen einbezogen
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button type="submit">
                {initialData ? "Speichern" : "Anlegen"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

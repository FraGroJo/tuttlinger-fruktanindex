/**
 * HorseFormWizard Komponente
 * 3-Schritt-Wizard für Pferde-Eingabe
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { type HorseMinimal, DEFAULT_HORSE } from "@/types/horse";

interface HorseFormWizardProps {
  onSubmit: (horse: HorseMinimal) => void;
  onCancel: () => void;
  initialData?: HorseMinimal;
}

const step1Schema = z.object({
  name: z.string().min(1, "Name erforderlich"),
  mass_kg: z.number().min(200).max(800),
  easy_or_ems: z.boolean(),
  muzzle: z.enum(["none", "on"]),
});

const step2Schema = z.object({
  hay_kg_as_fed_per_day: z.number().min(0).max(25),
  hay_nsc_pct: z.number().min(4).max(20).optional(),
  hay_analysis_ref_id: z.string().optional(),
});

const step3Schema = z.object({
  conc_kg_as_fed_per_day: z.number().min(0).max(10).optional(),
  conc_nsc_pct: z.number().min(5).max(45).optional(),
});

export function HorseFormWizard({ onSubmit, onCancel, initialData }: HorseFormWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<HorseMinimal>>(initialData || DEFAULT_HORSE);

  const handleStep1Submit = (data: z.infer<typeof step1Schema>) => {
    setFormData({ ...formData, ...data });
    setStep(2);
  };

  const handleStep2Submit = (data: z.infer<typeof step2Schema>) => {
    setFormData({ ...formData, ...data });
    setStep(3);
  };

  const handleStep3Submit = (data: z.infer<typeof step3Schema>) => {
    const finalData = {
      ...formData,
      ...data,
      id: initialData?.id || crypto.randomUUID(),
      is_active: true,
    } as HorseMinimal;
    onSubmit(finalData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
              step >= s
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/30 text-muted-foreground"
            }`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div className={`flex-1 h-1 mx-2 rounded ${
                step > s ? "bg-primary" : "bg-muted-foreground/30"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <Step1Form
            key="step1"
            onNext={handleStep1Submit}
            onCancel={onCancel}
            initialData={formData}
          />
        )}
        {step === 2 && (
          <Step2Form
            key="step2"
            onNext={handleStep2Submit}
            onBack={() => setStep(1)}
            initialData={formData}
          />
        )}
        {step === 3 && (
          <Step3Form
            key="step3"
            onSubmit={handleStep3Submit}
            onBack={() => setStep(2)}
            initialData={formData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Step 1: Basis-Daten
function Step1Form({ onNext, onCancel, initialData }: any) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: initialData,
  });

  const muzzleValue = watch("muzzle", initialData?.muzzle || "none");

  return (
    <motion.form
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      onSubmit={handleSubmit(onNext)}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" {...register("name")} placeholder="z.B. Luna" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message as string}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mass_kg">Gewicht (kg) *</Label>
        <Input
          id="mass_kg"
          type="number"
          {...register("mass_kg", { valueAsNumber: true })}
          placeholder="200 - 800"
        />
        {errors.mass_kg && <p className="text-sm text-destructive">{errors.mass_kg.message as string}</p>}
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <Label htmlFor="easy_or_ems" className="cursor-pointer">
          Leichtfuttrig / EMS / PPID-Risiko
        </Label>
        <Switch id="easy_or_ems" {...register("easy_or_ems")} />
      </div>

      <div className="space-y-2">
        <Label>Maulkorb *</Label>
        <Select value={muzzleValue} onValueChange={(v) => setValue("muzzle", v as "none" | "on")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ohne Maulkorb</SelectItem>
            <SelectItem value="on">Mit Maulkorb</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Abbrechen
        </Button>
        <Button type="submit" className="flex-1">
          Weiter <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </motion.form>
  );
}

// Step 2: Heu
function Step2Form({ onNext, onBack, initialData }: any) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: initialData,
  });

  return (
    <motion.form
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      onSubmit={handleSubmit(onNext)}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Label htmlFor="hay_kg">Heu (kg Frischmasse/Tag) *</Label>
        <Input
          id="hay_kg"
          type="number"
          step="0.1"
          {...register("hay_kg_as_fed_per_day", { valueAsNumber: true })}
          placeholder="0 - 25"
        />
        {errors.hay_kg_as_fed_per_day && (
          <p className="text-sm text-destructive">{errors.hay_kg_as_fed_per_day.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="hay_nsc">Heu-NSC (%) *</Label>
        <Input
          id="hay_nsc"
          type="number"
          step="0.1"
          {...register("hay_nsc_pct", { valueAsNumber: true })}
          placeholder="4 - 20 (typisch: 8-12)"
        />
        <p className="text-xs text-muted-foreground">
          Alternativ: Heuanalyse-Referenz (noch nicht implementiert)
        </p>
        {errors.hay_nsc_pct && (
          <p className="text-sm text-destructive">{errors.hay_nsc_pct.message as string}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="mr-2 w-4 h-4" /> Zurück
        </Button>
        <Button type="submit" className="flex-1">
          Weiter <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </motion.form>
  );
}

// Step 3: Kraftfutter (optional)
function Step3Form({ onSubmit, onBack, initialData }: any) {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: initialData,
  });

  return (
    <motion.form
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
    >
      <div className="p-4 bg-muted/50 rounded-lg mb-4">
        <p className="text-sm text-muted-foreground">
          <strong>Optional:</strong> Kraftfutter-Angaben nur bei Bedarf ausfüllen.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="conc_kg">Kraftfutter (kg Frischmasse/Tag)</Label>
        <Input
          id="conc_kg"
          type="number"
          step="0.1"
          {...register("conc_kg_as_fed_per_day", { valueAsNumber: true })}
          placeholder="0 - 10 (optional)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="conc_nsc">Kraftfutter-NSC (%)</Label>
        <Input
          id="conc_nsc"
          type="number"
          step="0.1"
          {...register("conc_nsc_pct", { valueAsNumber: true })}
          placeholder="5 - 45 (Standard: 25)"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="mr-2 w-4 h-4" /> Zurück
        </Button>
        <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
          <Check className="mr-2 w-4 h-4" /> Fertig
        </Button>
      </div>
    </motion.form>
  );
}

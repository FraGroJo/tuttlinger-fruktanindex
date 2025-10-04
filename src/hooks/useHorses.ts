/**
 * State-Management für Pferde-Daten (LocalStorage-basiert)
 */

import { useState, useEffect } from "react";
import type { HorseMinimal } from "@/types/horse";
import { DEFAULT_HORSE } from "@/types/horse";

const STORAGE_KEY = "fruktan-horses";

export function useHorses() {
  const [horses, setHorses] = useState<HorseMinimal[]>([]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setHorses(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse horses from localStorage", error);
      }
    }
  }, []);

  // Save to localStorage whenever horses change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(horses));
  }, [horses]);

  const addHorse = (horse: Omit<HorseMinimal, "id">) => {
    const newHorse: HorseMinimal = {
      ...horse,
      id: crypto.randomUUID(),
    };
    setHorses((prev) => [...prev, newHorse]);
    return newHorse;
  };

  const updateHorse = (id: string, updates: Partial<HorseMinimal>) => {
    setHorses((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...updates } : h))
    );
  };

  const deleteHorse = (id: string) => {
    setHorses((prev) => prev.filter((h) => h.id !== id));
  };

  const getActiveHorses = () => horses.filter((h) => h.is_active);

  return {
    horses,
    activeHorses: getActiveHorses(),
    addHorse,
    updateHorse,
    deleteHorse,
  };
}

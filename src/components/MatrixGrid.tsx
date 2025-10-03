/**
 * MatrixGrid Komponente
 * Layout-Container für die drei Tageskarten
 */

import { type DayMatrix } from "@/types/fruktan";
import { DayCard } from "./DayCard";

interface MatrixGridProps {
  today: DayMatrix;
  tomorrow: DayMatrix;
  dayAfterTomorrow: DayMatrix;
}

export function MatrixGrid({ today, tomorrow, dayAfterTomorrow }: MatrixGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <DayCard matrix={today} />
      <DayCard matrix={tomorrow} />
      <DayCard matrix={dayAfterTomorrow} />
    </div>
  );
}

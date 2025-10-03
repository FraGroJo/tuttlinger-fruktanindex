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
  dayThree: DayMatrix;
}

export function MatrixGrid({ today, tomorrow, dayAfterTomorrow, dayThree }: MatrixGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <DayCard matrix={today} />
      <DayCard matrix={tomorrow} />
      <DayCard matrix={dayAfterTomorrow} />
      <DayCard matrix={dayThree} />
    </div>
  );
}

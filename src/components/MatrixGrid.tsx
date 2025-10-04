/**
 * MatrixGrid Komponente
 * Responsive Grid mit Swipe-Carousel für mobile (7 Tage)
 */

import { motion } from "framer-motion";
import { type DayMatrix } from "@/types/fruktan";
import { DayCard } from "./DayCard";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface MatrixGridProps {
  today: DayMatrix;
  tomorrow: DayMatrix;
  dayAfterTomorrow: DayMatrix;
  dayThree: DayMatrix;
  dayFour: DayMatrix;
  dayFive: DayMatrix;
  daySix: DayMatrix;
}

export function MatrixGrid({ 
  today, 
  tomorrow, 
  dayAfterTomorrow, 
  dayThree,
  dayFour,
  dayFive,
  daySix
}: MatrixGridProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const days = [today, tomorrow, dayAfterTomorrow, dayThree, dayFour, dayFive, daySix];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : days.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < days.length - 1 ? prev + 1 : 0));
  };

  return (
    <>
      {/* Desktop: Grid (max 3 pro Zeile) */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6">
        {days.map((day, idx) => (
          <DayCard key={day.date} matrix={day} />
        ))}
      </div>

      {/* Mobile/Tablet: Carousel */}
      <div className="lg:hidden">
        <div className="relative">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-2">
              {days.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-8 bg-primary"
                      : "w-2 bg-muted-foreground/30"
                  }`}
                  aria-label={`Gehe zu Tag ${idx + 1}`}
                />
              ))}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Cards */}
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <DayCard matrix={days[currentIndex]} />
          </motion.div>
        </div>

        {/* Swipe hint */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          Wischen oder Pfeile nutzen zum Navigieren
        </p>
      </div>
    </>
  );
}

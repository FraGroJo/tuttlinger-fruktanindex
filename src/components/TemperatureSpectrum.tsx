import { Card } from "@/components/ui/card";
import { Thermometer } from "lucide-react";
import { formatTemperature } from "@/lib/formatters";
import { useEffect, useRef, useState } from "react";

interface TemperatureSpectrumProps {
  min: number;
  median: number;
  max: number;
}

interface PinPosition {
  value: number;
  percent: number;
  pixel: number;
  label: string;
  type: 'min' | 'median' | 'max';
}

export function TemperatureSpectrum({ min, median, max }: TemperatureSpectrumProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(0);
  const [pins, setPins] = useState<PinPosition[]>([]);
  const [hasOverlap, setHasOverlap] = useState(false);
  const [isTripleOverlap, setIsTripleOverlap] = useState(false);

  const range = max - min;

  // Calculate position percentage (-20 to 40°C range)
  const calcPercent = (value: number) => {
    return Math.max(0, Math.min(1, (value + 20) / 60));
  };

  // Update bar width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (barRef.current) {
        setBarWidth(barRef.current.offsetWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (barRef.current) {
      observer.observe(barRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Calculate pin positions and detect overlaps
  useEffect(() => {
    if (barWidth === 0) return;

    const positions: PinPosition[] = [
      { value: min, percent: calcPercent(min), pixel: 0, label: 'Minimum', type: 'min' },
      { value: median, percent: calcPercent(median), pixel: 0, label: 'Median', type: 'median' },
      { value: max, percent: calcPercent(max), pixel: 0, label: 'Maximum', type: 'max' },
    ];

    // Calculate pixel positions
    positions.forEach(pos => {
      pos.pixel = pos.percent * barWidth;
    });

    setPins(positions);

    // Check for overlaps (threshold: 16px)
    const minMedianDist = Math.abs(positions[1].pixel - positions[0].pixel);
    const medianMaxDist = Math.abs(positions[2].pixel - positions[1].pixel);
    const minMaxDist = Math.abs(positions[2].pixel - positions[0].pixel);

    const hasAnyOverlap = minMedianDist < 16 || medianMaxDist < 16;
    const hasAllOverlap = minMaxDist < 32; // If all three within 32px

    setHasOverlap(hasAnyOverlap);
    setIsTripleOverlap(hasAllOverlap && hasAnyOverlap);
  }, [min, median, max, barWidth]);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Thermometer className="h-4 w-4" />
        Temperatur-Spektrum
      </div>

      <div className="space-y-4">
        {/* Gradient Bar with Pins */}
        <div className="relative">
          <div
            ref={barRef}
            className="h-8 rounded-2xl relative"
            style={{
              background: 'linear-gradient(90deg, hsl(200, 80%, 50%) 0%, hsl(60, 90%, 60%) 50%, hsl(0, 80%, 50%) 100%)',
            }}
            aria-hidden="true"
          >
            {/* Pin Markers */}
            {pins.map((pin, idx) => (
              <div
                key={idx}
                className="absolute top-0 bottom-0"
                style={{ left: `${pin.percent * 100}%` }}
              >
                <div
                  className={`h-full ${pin.type === 'median' ? 'w-[3px] bg-foreground' : 'w-[2px] bg-foreground'}`}
                  style={{
                    transform: 'translateX(-50%)',
                  }}
                >
                  {/* T-Cap */}
                  <div className="absolute top-0 left-1/2 w-[6px] h-[2px] bg-foreground" style={{ transform: 'translateX(-50%)' }} />
                  <div className="absolute bottom-0 left-1/2 w-[6px] h-[2px] bg-foreground" style={{ transform: 'translateX(-50%)' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Axis Labels */}
          <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
            <span>−20 °C</span>
            <span>0 °C</span>
            <span>40 °C</span>
          </div>
        </div>

        {/* Value Capsules with Leader Lines */}
        {isTripleOverlap ? (
          // Variant B: Merged capsule for all three values
          <div className="relative">
            <svg className="absolute w-full h-8 pointer-events-none" style={{ top: '-32px' }}>
              {pins.map((pin, idx) => (
                <line
                  key={idx}
                  x1={`${pin.percent * 100}%`}
                  y1="0"
                  x2="50%"
                  y2="32"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-border"
                  opacity="0.5"
                />
              ))}
            </svg>
            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 border">
              <div className="text-sm font-semibold">
                {formatTemperature(min)} / {formatTemperature(median)} / {formatTemperature(max)}
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Min</span>
                <span>Med</span>
                <span>Max</span>
              </div>
            </div>
          </div>
        ) : (
          // Variant A: Standard three capsules
          <div className="relative">
            <svg className="absolute w-full h-8 pointer-events-none" style={{ top: '-32px' }}>
              {pins.map((pin, idx) => {
                const colIdx = idx; // 0, 1, 2
                const targetX = (colIdx / 2) * 100; // 0%, 50%, 100%
                const offsetY = hasOverlap && idx === 1 ? 12 : 0; // Offset median if overlap
                return (
                  <line
                    key={idx}
                    x1={`${pin.percent * 100}%`}
                    y1="0"
                    x2={`${targetX}%`}
                    y2={32 + offsetY}
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-border"
                    opacity="0.5"
                  />
                );
              })}
            </svg>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {[
                { value: min, label: 'Minimum', ariaLabel: `Minimum ${formatTemperature(min)}` },
                { value: median, label: 'Median', ariaLabel: `Median ${formatTemperature(median)}` },
                { value: max, label: 'Maximum', ariaLabel: `Maximum ${formatTemperature(max)}` },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30 border ${hasOverlap && idx === 1 ? 'mt-3' : ''}`}
                  aria-label={item.ariaLabel}
                >
                  <div className="text-base md:text-lg font-bold">{formatTemperature(item.value)}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Range Info */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t">
          Spanne: {formatTemperature(range)}
        </div>
      </div>
    </Card>
  );
}

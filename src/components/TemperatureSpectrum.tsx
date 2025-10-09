/**
 * Temperatur-Spektrum mit Smart-Scale und Modus-Schalter
 * Features: Adaptive Domain, 0°C-Notch, Anti-Overlap, Tooltips, Leader-Lines
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer } from "lucide-react";
import { formatTemperature } from "@/lib/formatters";
import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TemperatureSpectrumProps {
  min: number;
  median: number;
  max: number;
}

type ScaleMode = 'smart' | 'fix';

interface PinPosition {
  value: number;
  percent: number;
  pixel: number;
  label: string;
  type: 'min' | 'median' | 'max';
}

interface Domain {
  min: number;
  max: number;
}

export function TemperatureSpectrum({ min, median, max }: TemperatureSpectrumProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [barWidth, setBarWidth] = useState(0);
  const [mode, setMode] = useState<ScaleMode>('smart');
  const [pins, setPins] = useState<PinPosition[]>([]);
  const [hasOverlap, setHasOverlap] = useState(false);
  const [isTripleOverlap, setIsTripleOverlap] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const range = max - min;

  // Berechne Domain basierend auf Modus
  const getDomain = (): Domain => {
    if (mode === 'fix') {
      return { min: -20, max: 40 };
    }
    // Smart Mode: adaptive Domain mit Padding
    const pad = Math.max(1, Math.min(5, (max - min) * 0.2));
    const smartMin = Math.max(-20, min - pad);
    const smartMax = Math.min(40, max + pad);
    return { min: smartMin, max: smartMax };
  };

  const domain = getDomain();

  // Calculate position percentage within domain
  const calcPercent = (value: number) => {
    const normalized = (value - domain.min) / (domain.max - domain.min);
    return Math.max(0, Math.min(1, normalized));
  };

  // Berechne 0°C Notch Position
  const zeroPercent = calcPercent(0);
  const zeroInDomain = 0 >= domain.min && 0 <= domain.max;

  // Generate ticks (every 5°C)
  const generateTicks = (): number[] => {
    const ticks: number[] = [];
    const start = Math.ceil(domain.min / 5) * 5;
    const end = Math.floor(domain.max / 5) * 5;
    
    for (let t = start; t <= end; t += 5) {
      if (t !== 0) { // 0°C wird als Notch separat gerendert
        ticks.push(t);
      }
    }
    
    // Limit ticks in Smart mode
    if (mode === 'smart' && ticks.length > 5) {
      const step = Math.ceil(ticks.length / 5);
      return ticks.filter((_, idx) => idx % step === 0);
    }
    
    return ticks;
  };

  const ticks = generateTicks();

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
  }, [min, median, max, barWidth, domain.min, domain.max]);

  // Mouse move handler for hover effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const value = domain.min + percent * (domain.max - domain.min);
    setHoverValue(value);
    setHoverX(x);
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  // Get gradient color
  const getGradient = () => {
    return 'linear-gradient(90deg, hsl(200, 80%, 50%) 0%, hsl(160, 70%, 45%) 20%, hsl(60, 90%, 60%) 50%, hsl(35, 90%, 60%) 70%, hsl(0, 80%, 50%) 100%)';
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Thermometer className="h-4 w-4" />
          Temperatur-Spektrum
        </div>
        
        {/* Mode Switcher */}
        <div className="flex gap-1 bg-muted rounded-full p-0.5">
          <button
            onClick={() => setMode('smart')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              mode === 'smart' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Smart-Skala aktivieren"
          >
            Smart
          </button>
          <button
            onClick={() => setMode('fix')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              mode === 'fix' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label="Fix-Skala aktivieren"
          >
            Fix
          </button>
        </div>
      </div>

      <div className="space-y-4" aria-description="Temperatur-Verteilung mit Smart-Skala und Markierungen für Minimum, Median und Maximum">
        {/* Gradient Bar with Pins and Ticks */}
        <div className="relative">
          <div
            ref={barRef}
            className="h-8 rounded-2xl relative cursor-crosshair"
            style={{ background: getGradient() }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Frost Band (if 0°C in domain) */}
            {zeroInDomain && zeroPercent > 0 && (
              <div
                className="absolute top-0 bottom-0 left-0 bg-blue-500/8 pointer-events-none"
                style={{ width: `${zeroPercent * 100}%` }}
              />
            )}
            
            {/* Heat Band (if 30°C in domain) */}
            {domain.max > 30 && (
              <div
                className="absolute top-0 bottom-0 bg-red-500/8 pointer-events-none"
                style={{ 
                  left: `${calcPercent(30) * 100}%`,
                  right: 0
                }}
              />
            )}

            {/* 0°C Notch */}
            {zeroInDomain ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-foreground/40"
                      style={{ left: `${zeroPercent * 100}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap">
                        0 °C
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Gefrierpunkt
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              // Out-of-range indicator
              <div
                className="absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50"
                style={{ [0 < domain.min ? 'left' : 'right']: '4px' }}
              >
                {0 < domain.min ? '←0°C' : '0°C→'}
              </div>
            )}

            {/* Ticks */}
            {ticks.map((tick, idx) => {
              const tickPercent = calcPercent(tick);
              return (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 w-[1px] bg-foreground/20"
                  style={{ left: `${tickPercent * 100}%` }}
                >
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
                    {tick}
                  </div>
                </div>
              );
            })}

            {/* Pin Markers */}
            {pins.map((pin, idx) => (
              <TooltipProvider key={idx}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 bottom-0"
                      style={{ left: `${pin.percent * 100}%` }}
                      aria-hidden="true"
                    >
                      <div
                        className={`h-full ${
                          pin.type === 'median' ? 'w-[3px] bg-foreground' : 'w-[2px] bg-foreground'
                        }`}
                        style={{ transform: 'translateX(-50%)' }}
                      >
                        {/* T-Cap */}
                        <div className="absolute top-0 left-1/2 w-[6px] h-[2px] bg-foreground" style={{ transform: 'translateX(-50%)' }} />
                        <div className="absolute bottom-0 left-1/2 w-[6px] h-[2px] bg-foreground" style={{ transform: 'translateX(-50%)' }} />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {pin.label} {formatTemperature(pin.value, 1)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}

            {/* Hover Ghost Marker */}
            {hoverValue !== null && (
              <div
                className="absolute top-0 bottom-0 w-[1px] bg-foreground/30 pointer-events-none"
                style={{ left: `${hoverX}px` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-background/90 px-2 py-0.5 rounded border shadow-sm whitespace-nowrap">
                  ≈ {formatTemperature(hoverValue, 1)}
                </div>
              </div>
            )}
          </div>

          {/* Axis Labels */}
          <div className="flex justify-between text-xs text-muted-foreground mt-8 px-1">
            <span>{formatTemperature(domain.min, 0)}</span>
            <span>{formatTemperature((domain.min + domain.max) / 2, 0)}</span>
            <span>{formatTemperature(domain.max, 0)}</span>
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
                {formatTemperature(min, 1)} / {formatTemperature(median, 1)} / {formatTemperature(max, 1)}
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
                const offsetY = hasOverlap && idx === 1 ? 10 : 0; // Offset median if overlap
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
                { value: min, label: 'Minimum', ariaLabel: `Minimum ${formatTemperature(min, 1)}` },
                { value: median, label: 'Median', ariaLabel: `Median ${formatTemperature(median, 1)}` },
                { value: max, label: 'Maximum', ariaLabel: `Maximum ${formatTemperature(max, 1)}` },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30 border ${
                    hasOverlap && idx === 1 ? 'mt-2.5' : ''
                  }`}
                  aria-label={item.ariaLabel}
                >
                  <div className="text-base md:text-lg font-bold">{formatTemperature(item.value, 1)}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Range Info */}
        <div className="text-center text-xs text-muted-foreground pt-2 border-t">
          Spanne: {formatTemperature(range, 1)}
        </div>
        
        {/* Mode Info */}
        {mode === 'smart' && (
          <div className="text-center text-[10px] text-muted-foreground">
            Smart-Skala: {formatTemperature(domain.min, 0)} bis {formatTemperature(domain.max, 0)}
          </div>
        )}
      </div>
    </Card>
  );
}

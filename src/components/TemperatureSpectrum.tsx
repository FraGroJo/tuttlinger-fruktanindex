/**
 * Temperatur-Spektrum mit Fix-Skala + adaptivem Zoom-Streifen
 * V23: Dual-Layer-Ansatz für bessere Sichtbarkeit bei kleinen Spannweiten
 */

import { Card } from "@/components/ui/card";
import { Thermometer, ZoomIn } from "lucide-react";
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

interface PinPosition {
  value: number;
  percent: number;
  pixel: number;
  label: string;
  type: 'min' | 'median' | 'max';
}

// Fix Domain: -10 bis 30°C (überall identisch)
const DOMAIN_MIN = -10;
const DOMAIN_MAX = 30;
const DOMAIN_RANGE = DOMAIN_MAX - DOMAIN_MIN;

export function TemperatureSpectrum({ min, median, max }: TemperatureSpectrumProps) {
  const fixBarRef = useRef<HTMLDivElement>(null);
  const zoomBarRef = useRef<HTMLDivElement>(null);
  const [fixBarWidth, setFixBarWidth] = useState(0);
  const [zoomBarWidth, setZoomBarWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [fixPins, setFixPins] = useState<PinPosition[]>([]);
  const [zoomPins, setZoomPins] = useState<PinPosition[]>([]);
  const [hasOverlap, setHasOverlap] = useState(false);
  const [isTripleOverlap, setIsTripleOverlap] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const range = max - min;

  // Adaptive Zoom Berechnung
  const span = max - min;
  const pad = Math.max(0.6, Math.min(3.0, span * 0.35));
  let zoomMin = Math.floor((min - pad) * 10) / 10;
  let zoomMax = Math.ceil((max + pad) * 10) / 10;
  
  const MIN_ZOOM_WIDTH = 2.0;
  if (zoomMax - zoomMin < MIN_ZOOM_WIDTH) {
    const mid = (min + max) / 2;
    zoomMin = mid - MIN_ZOOM_WIDTH / 2;
    zoomMax = mid + MIN_ZOOM_WIDTH / 2;
  }

  // Clamp to domain bounds
  const outLeft = zoomMin < DOMAIN_MIN;
  const outRight = zoomMax > DOMAIN_MAX;
  zoomMin = Math.max(zoomMin, DOMAIN_MIN);
  zoomMax = Math.min(zoomMax, DOMAIN_MAX);
  const zoomRange = zoomMax - zoomMin;

  // Calculate position percentage within fixed domain
  const calcFixPercent = (value: number) => {
    const normalized = (value - DOMAIN_MIN) / DOMAIN_RANGE;
    return Math.max(0, Math.min(1, normalized));
  };

  // Calculate position percentage within zoom domain
  const calcZoomPercent = (value: number) => {
    if (zoomRange === 0) return 0.5;
    const normalized = (value - zoomMin) / zoomRange;
    return Math.max(0, Math.min(1, normalized));
  };

  // 0°C Notch Position (immer sichtbar)
  const zeroFixPercent = calcFixPercent(0);
  const zeroInZoomRange = 0 >= zoomMin && 0 <= zoomMax;
  const zeroZoomPercent = zeroInZoomRange ? calcZoomPercent(0) : null;

  // Generate ticks
  const generateFixTicks = (): number[] => {
    if (isMobile) {
      return [-10, 10, 30]; // 0°C ist Notch
    }
    return [-10, 10, 20, 30]; // Desktop, 0°C ist Notch
  };

  const generateZoomTicks = (): number[] => {
    // Min, Mid, Max des Zoom-Bereichs
    const mid = (zoomMin + zoomMax) / 2;
    return [zoomMin, mid, zoomMax].map(v => Math.round(v * 10) / 10);
  };

  const fixTicks = generateFixTicks();
  const zoomTicks = generateZoomTicks();

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Update bar widths on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (fixBarRef.current) {
        setFixBarWidth(fixBarRef.current.offsetWidth);
      }
      if (zoomBarRef.current) {
        setZoomBarWidth(zoomBarRef.current.offsetWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (fixBarRef.current) observer.observe(fixBarRef.current);
    if (zoomBarRef.current) observer.observe(zoomBarRef.current);

    return () => observer.disconnect();
  }, []);

  // Calculate pin positions and detect overlaps
  useEffect(() => {
    if (fixBarWidth === 0 || zoomBarWidth === 0) return;

    // Fix Pins
    const fixPositions: PinPosition[] = [
      { value: min, percent: calcFixPercent(min), pixel: 0, label: 'Minimum', type: 'min' },
      { value: median, percent: calcFixPercent(median), pixel: 0, label: 'Median', type: 'median' },
      { value: max, percent: calcFixPercent(max), pixel: 0, label: 'Maximum', type: 'max' },
    ];
    fixPositions.forEach(pos => {
      pos.pixel = pos.percent * fixBarWidth;
    });
    setFixPins(fixPositions);

    // Zoom Pins
    const zoomPositions: PinPosition[] = [
      { value: min, percent: calcZoomPercent(min), pixel: 0, label: 'Minimum', type: 'min' },
      { value: median, percent: calcZoomPercent(median), pixel: 0, label: 'Median', type: 'median' },
      { value: max, percent: calcZoomPercent(max), pixel: 0, label: 'Maximum', type: 'max' },
    ];
    zoomPositions.forEach(pos => {
      pos.pixel = pos.percent * zoomBarWidth;
    });
    setZoomPins(zoomPositions);

    // Check for overlaps (threshold: 16px) in zoom view
    const minMedianDist = Math.abs(zoomPositions[1].pixel - zoomPositions[0].pixel);
    const medianMaxDist = Math.abs(zoomPositions[2].pixel - zoomPositions[1].pixel);
    const minMaxDist = Math.abs(zoomPositions[2].pixel - zoomPositions[0].pixel);

    const hasAnyOverlap = minMedianDist < 16 || medianMaxDist < 16;
    const hasAllOverlap = minMaxDist < 32;

    setHasOverlap(hasAnyOverlap);
    setIsTripleOverlap(hasAllOverlap && hasAnyOverlap);
  }, [min, median, max, fixBarWidth, zoomBarWidth, zoomMin, zoomMax, zoomRange]);

  // Mouse move handler for hover effect on zoom bar
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomBarRef.current) return;
    const rect = zoomBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const value = zoomMin + percent * zoomRange;
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

  const showSmallSpanBadge = span < 1.0;

  return (
    <Card className="px-4 py-4 sm:px-6 sm:py-5 space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Thermometer className="h-4 w-4" />
        Temperatur-Spektrum
        {showSmallSpanBadge && (
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
            <ZoomIn className="h-3 w-3" />
            Zoom aktiv
          </span>
        )}
      </div>

      <div className="space-y-6" aria-description="Temperatur-Verteilung mit Referenz-Skala und adaptivem Zoom für bessere Detail-Sichtbarkeit">
        
        {/* FIX-SKALA (oben): -10 bis 30°C */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">Referenz-Skala</div>
          <div className="relative">
            <div
              ref={fixBarRef}
              className="h-6 sm:h-7 rounded-2xl relative"
              style={{ background: getGradient() }}
            >
              {/* Frost Band (≤0°C) */}
              {zeroFixPercent > 0 && (
                <div
                  className="absolute top-0 bottom-0 left-0 bg-blue-500/8 pointer-events-none rounded-l-2xl"
                  style={{ width: `${zeroFixPercent * 100}%` }}
                />
              )}
              
              {/* Heat Band (≥30°C) */}
              {calcFixPercent(30) < 1 && (
                <div
                  className="absolute top-0 bottom-0 bg-red-500/8 pointer-events-none rounded-r-2xl"
                  style={{ 
                    left: `${calcFixPercent(30) * 100}%`,
                    right: 0
                  }}
                />
              )}

              {/* 0°C Notch */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute top-0 bottom-0 w-[2px] bg-foreground/40 z-10"
                      style={{ left: `${zeroFixPercent * 100}%`, transform: 'translateX(-50%)' }}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">Gefrierpunkt</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Ticks */}
              {fixTicks.map((tick, idx) => {
                const tickPercent = calcFixPercent(tick);
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 w-[1px] bg-foreground/15"
                    style={{ left: `${tickPercent * 100}%` }}
                  />
                );
              })}

              {/* Pin Markers (klein) */}
              {fixPins.map((pin, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0"
                  style={{ left: `${pin.percent * 100}%` }}
                  aria-hidden="true"
                >
                  <div
                    className={`h-full ${
                      pin.type === 'median' ? 'w-[2px] bg-foreground/60' : 'w-[1.5px] bg-foreground/50'
                    }`}
                    style={{ transform: 'translateX(-50%)' }}
                  />
                </div>
              ))}
            </div>

            {/* Axis Labels */}
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1 px-1">
              <span>−10 °C</span>
              <span className="opacity-60">0 °C</span>
              <span>30 °C</span>
            </div>
          </div>
        </div>

        {/* ZOOM-STREIFEN (unten): adaptiver Bereich */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
            Detail-Ansicht
            {(outLeft || outRight) && (
              <span className="text-[10px] opacity-70">
                {outLeft && '←'} begrenzt {outRight && '→'}
              </span>
            )}
          </div>
          <div className="relative">
            <div
              ref={zoomBarRef}
              className="h-6 sm:h-7 rounded-xl relative cursor-crosshair"
              style={{ background: getGradient() }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* 0°C Notch (falls im Zoom-Bereich) */}
              {zeroZoomPercent !== null && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className="absolute top-0 bottom-0 w-[1.5px] bg-foreground/40 z-10"
                        style={{ left: `${zeroZoomPercent * 100}%`, transform: 'translateX(-50%)' }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">0 °C</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Ticks */}
              {zoomTicks.map((tick, idx) => {
                const tickPercent = calcZoomPercent(tick);
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 w-[1px] bg-foreground/20"
                    style={{ left: `${tickPercent * 100}%` }}
                  />
                );
              })}

              {/* Pin Markers (größer für bessere Sichtbarkeit) */}
              {zoomPins.map((pin, idx) => (
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
                            pin.type === 'median' ? 'w-[4px] bg-foreground' : 'w-[3px] bg-foreground'
                          }`}
                          style={{ transform: 'translateX(-50%)' }}
                        >
                          {/* T-Caps */}
                          <div className="absolute top-0 left-1/2 w-[8px] h-[2px] bg-foreground" style={{ transform: 'translateX(-50%)' }} />
                          <div className="absolute bottom-0 left-1/2 w-[8px] h-[2px] bg-foreground" style={{ transform: 'translateX(-50%)' }} />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {pin.label}: {formatTemperature(pin.value, 1)}
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
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1 px-1">
              <span>{formatTemperature(zoomMin, 1)}</span>
              <span>{formatTemperature((zoomMin + zoomMax) / 2, 1)}</span>
              <span>{formatTemperature(zoomMax, 1)}</span>
            </div>
          </div>
        </div>

        {/* Value Capsules with Leader Lines to Zoom Bar */}
        {isTripleOverlap ? (
          // Variant B: Merged capsule for all three values
          <div className="relative pt-8">
            <svg className="absolute w-full h-8 pointer-events-none" style={{ top: '0' }}>
              {zoomPins.map((pin, idx) => (
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
          <div className="relative pt-8">
            <svg className="absolute w-full h-8 pointer-events-none" style={{ top: '0' }}>
              {zoomPins.map((pin, idx) => {
                const colIdx = idx;
                const targetX = (colIdx / 2) * 100;
                const offsetY = hasOverlap && idx === 1 ? 10 : 0;
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
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-3">
              {[
                { value: min, label: 'Min', ariaLabel: `Minimum ${formatTemperature(min, 1)}` },
                { value: median, label: 'Med', ariaLabel: `Median ${formatTemperature(median, 1)}` },
                { value: max, label: 'Max', ariaLabel: `Maximum ${formatTemperature(max, 1)}` },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center gap-1 p-3 sm:p-2 rounded-lg bg-muted/30 border min-h-[44px] justify-center ${
                    hasOverlap && idx === 1 ? 'sm:mt-2.5' : ''
                  }`}
                  aria-label={item.ariaLabel}
                >
                  <div className="text-xl sm:text-lg font-semibold">{formatTemperature(item.value, 1)}</div>
                  <div className="text-sm sm:text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer: Range + Zoom Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground pt-2 border-t">
          <span>Spanne: {formatTemperature(range, 1)}</span>
          <span>Zoom: {formatTemperature(zoomMin, 1)} – {formatTemperature(zoomMax, 1)}</span>
        </div>
      </div>
    </Card>
  );
}

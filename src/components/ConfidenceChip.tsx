/**
 * Confidence-Chip mit dynamischem Score und Tooltip-Breakdown
 */

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getConfidenceColor, formatConfidenceTooltip, type ConfidenceBreakdown } from "@/lib/quality";
import { Info } from "lucide-react";

interface ConfidenceChipProps {
  score: number;
  breakdown?: ConfidenceBreakdown;
  className?: string;
  showLabel?: boolean;
}

export function ConfidenceChip({ score, breakdown, className = "", showLabel = true }: ConfidenceChipProps) {
  const color = getConfidenceColor(score);
  
  const getBgColor = () => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'red': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };
  
  const chip = (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${getBgColor()} ${className}`}>
      {showLabel && <span className="text-xs text-muted-foreground">Confidence</span>}
      <span className="font-medium">{score}</span>
      {breakdown && <Info className="w-3 h-3 opacity-60" />}
    </div>
  );
  
  if (breakdown) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {chip}
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-xs whitespace-pre-line text-xs"
            aria-label={`Confidence-Breakdown: ${formatConfidenceTooltip(breakdown)}`}
          >
            {formatConfidenceTooltip(breakdown)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return chip;
}

/**
 * Confidence-Balken (für größere Darstellungen)
 */
interface ConfidenceBarProps {
  score: number;
  breakdown?: ConfidenceBreakdown;
  className?: string;
}

export function ConfidenceBar({ score, breakdown, className = "" }: ConfidenceBarProps) {
  const color = getConfidenceColor(score);
  
  const getBarColor = () => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
    }
  };
  
  const bar = (
    <div className={`space-y-1 ${className}`}>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Confidence</span>
        <span className="font-medium">{score}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${score}%` }}
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
  
  if (breakdown) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {bar}
          </TooltipTrigger>
          <TooltipContent 
            className="max-w-xs whitespace-pre-line text-xs"
            aria-label={`Confidence-Breakdown: ${formatConfidenceTooltip(breakdown)}`}
          >
            {formatConfidenceTooltip(breakdown)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return bar;
}

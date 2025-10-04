/**
 * TrendChart Komponente (Area-Chart mit farbiger Fläche)
 * Zeigt EMS-Trend mit Schwellenwerten, Frost-Markern und Jetzt-Linie
 */

import * as React from "react";
import { motion } from "framer-motion";
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine } from "recharts";
import { type TrendDataPoint } from "@/types/fruktan";

interface TrendChartProps {
  data: TrendDataPoint[];
  confidence?: "normal" | "low";
  className?: string;
  nowTs?: string;
  timeZone?: string;
}

const EMS = { GREEN_MAX: 29, YELLOW_MAX: 59, RED_MAX: 100 };

function riskColor(score: number): string {
  if (score <= EMS.GREEN_MAX) return "hsl(142, 76%, 36%)";
  if (score <= EMS.YELLOW_MAX) return "hsl(38, 92%, 50%)";
  return "hsl(0, 72%, 51%)";
}

const fmtTime = (ts: string, tz = "Europe/Berlin") =>
  new Intl.DateTimeFormat("de-DE", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));

const fmtAxisTime = (ts: string, tz = "Europe/Berlin") =>
  new Intl.DateTimeFormat("de-DE", {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
  }).format(new Date(ts));

const fmtNowLabel = (iso?: string, tz = "Europe/Berlin") =>
  iso
    ? new Intl.DateTimeFormat("de-DE", {
        timeZone: tz,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
        .format(new Date(iso))
        .replace(",", "")
    : "";

const fmtNumber = (n: number) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n);

// Nächstliegenden Datenpunkt finden
function nearestTs(data: TrendDataPoint[], targetIso?: string): string | undefined {
  if (!targetIso || !data?.length) return;
  const t = new Date(targetIso).getTime();
  let best = data[0].timestamp;
  let dBest = Math.abs(new Date(best).getTime() - t);
  for (const p of data) {
    const d = Math.abs(new Date(p.timestamp).getTime() - t);
    if (d < dBest) { 
      best = p.timestamp; 
      dBest = d; 
    }
  }
  return best;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  const col = riskColor(p.score);
  const labelText = p?.timestamp ? fmtTime(p.timestamp) : label;
  const level =
    p.score <= EMS.GREEN_MAX ? "Sicher" :
    p.score <= EMS.YELLOW_MAX ? "Erhöht" : "Hoch";
  return (
    <div className="rounded-xl border border-border bg-card/95 p-3 shadow-sm">
      <div className="text-xs text-muted-foreground">{labelText}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: col }} />
        <span className="font-medium text-card-foreground">Score: {fmtNumber(p.score)}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {level} • {p.temperature.toFixed(1)}°C{p.isFrost ? " • Frost" : ""}
      </div>
    </div>
  );
};

// Custom Dot mit Badge für "Jetzt"
const RiskDotWithBadge = React.memo(({ cx, cy, payload, nowX }: any) => {
  const fill = riskColor(payload.score);
  const isNow = nowX && payload.timestamp === nowX;
  
  return (
    <>
      {payload.isFrost && (
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize="12" fill="hsl(220, 10%, 45%)">✽</text>
      )}
      <circle cx={cx} cy={cy} r={3} fill={fill} stroke="hsl(220, 25%, 20%)" strokeWidth={0.5} />
      {isNow && (
        <>
          <circle cx={cx} cy={cy} r={6} fill="none" stroke="#ffffff" strokeWidth={2.5} />
          <circle cx={cx} cy={cy} r={7.5} fill="none" stroke="#334155" strokeWidth={1.5} strokeDasharray="3 3" />
        </>
      )}
    </>
  );
});

export function TrendChart({ data, confidence = "normal", className = "", nowTs, timeZone = "Europe/Berlin" }: TrendChartProps) {
  const yDomain: [number, number] = [0, 100];
  
  const minTs = data?.[0]?.timestamp;
  const maxTs = data?.[data.length - 1]?.timestamp;
  const nowX = React.useMemo(() => nearestTs(data, nowTs), [data, nowTs]);
  const nowInRange = nowTs && minTs && maxTs &&
    new Date(minTs) <= new Date(nowTs) && new Date(nowTs) <= new Date(maxTs);
  
  const nowLabel = React.useMemo(
    () => (nowTs ? `Jetzt (${fmtNowLabel(nowTs, timeZone)})` : "Jetzt"),
    [nowTs, timeZone]
  );
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`rounded-2xl border border-border bg-card/90 p-4 sm:p-6 shadow-lg backdrop-blur-sm ${className}`}
    >
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-lg font-semibold text-card-foreground">Trend-Verlauf (EMS)</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-sm text-muted-foreground">Fruktan-Risiko • stündlich</div>
          {confidence === "low" && (
            <span className="text-xs px-2 py-1 rounded bg-warning/10 text-warning border border-warning/30">
              Geringe Konfidenz
            </span>
          )}
        </div>
      </div>

      <div role="img" aria-label="Trend des Fruktan-Scores über Zeit" className="w-full overflow-x-auto">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 8, left: -10 }}>
            <defs>
              {/* Gradient für Area-Füllung nach Score */}
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.8} />
                <stop offset="40%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.6} />
                <stop offset="70%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            
            {/* Hintergrundbänder für EMS-Schwellen */}
            <ReferenceArea y1={0} y2={EMS.GREEN_MAX} fill="hsl(142, 76%, 36%)" fillOpacity={0.08} />
            <ReferenceArea y1={EMS.GREEN_MAX} y2={EMS.YELLOW_MAX} fill="hsl(38, 92%, 50%)" fillOpacity={0.08} />
            <ReferenceArea y1={EMS.YELLOW_MAX} y2={EMS.RED_MAX} fill="hsl(0, 72%, 51%)" fillOpacity={0.06} />

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.5} />
            
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => fmtAxisTime(ts, timeZone)}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tick={{ fill: '#64748b' }}
              minTickGap={20}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            
            <YAxis
              domain={yDomain}
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              tickFormatter={fmtNumber}
              tick={{ fill: '#64748b' }}
              width={35}
              label={{ 
                value: 'Score', 
                angle: -90, 
                position: 'insideLeft', 
                style: { fontSize: 11, fill: '#475569', fontWeight: 500 }
              }}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }} />
            
            {/* Schwellenlinien */}
            <ReferenceLine y={EMS.GREEN_MAX} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1.5} opacity={0.6} />
            <ReferenceLine y={EMS.YELLOW_MAX} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} opacity={0.6} />
            
            {/* Zukunfts-Overlay */}
            {nowInRange && nowX && (
              <ReferenceArea
                x1={nowX}
                x2={maxTs}
                fill="#334155"
                fillOpacity={0.04}
                ifOverflow="hidden"
              />
            )}
            
            {/* "Jetzt"-Linie */}
            {nowInRange && nowX && (
              <ReferenceLine
                x={nowX}
                stroke="#334155"
                strokeDasharray="6 6"
                strokeWidth={1.5}
                label={{
                  value: nowLabel,
                  position: "top",
                  fill: "#334155",
                  fontSize: 10
                }}
              />
            )}
            
            {/* Area-Chart mit Farbgradient */}
            <Area
              type="monotone"
              dataKey="score"
              stroke="none"
              fill="url(#colorScore)"
              fillOpacity={1}
              isAnimationActive={false}
            />
            
            {/* Linie darüber */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#0f172a"
              strokeWidth={2}
              dot={(props: any) => <RiskDotWithBadge {...props} nowX={nowX} />}
              activeDot={{ r: 5, stroke: '#0f172a', strokeWidth: 2, fill: '#fff' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legende */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#16a34a]" />
          <span>Sicher (0–29)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#f59e0b]" />
          <span>Erhöht (30–59)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#ef4444]" />
          <span>Hoch (60–100)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">✽</span>
          <span>Frost (≤0°C)</span>
        </div>
      </div>
    </motion.div>
  );
}

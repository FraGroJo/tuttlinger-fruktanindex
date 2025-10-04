/**
 * TrendChart Komponente
 * Zeigt farbcodierten EMS-Trend mit Schwellenwerten und Frost-Markern
 */

import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, ReferenceLine } from "recharts";
import { type TrendDataPoint } from "@/types/fruktan";

interface TrendChartProps {
  data: TrendDataPoint[];
  confidence?: "normal" | "low";
  className?: string;
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

const fmtNumber = (n: number) =>
  new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(n);

const RiskDot: React.FC<any> = (props) => {
  const { cx, cy, payload } = props;
  const fill = riskColor(payload.score);
  return (
    <>
      {payload.isFrost ? (
        <g>
          <text x={cx} y={cy - 10} textAnchor="middle" fontSize="12" fill="hsl(220, 10%, 45%)">✽</text>
        </g>
      ) : null}
      <circle cx={cx} cy={cy} r={3.5} fill={fill} stroke="hsl(220, 25%, 20%)" strokeWidth={0.5} />
    </>
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  const col = riskColor(p.score);
  const labelText = p?.timestamp ? fmtTime(p.timestamp) : label;
  const level =
    p.score <= EMS.GREEN_MAX ? "Sicher (Grün)" :
    p.score <= EMS.YELLOW_MAX ? "Erhöht (Gelb)" : "Hoch (Rot)";
  return (
    <div className="rounded-xl border border-border bg-card/95 p-3 shadow-sm">
      <div className="text-xs text-muted-foreground">{labelText}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: col }} />
        <span className="font-medium text-card-foreground">Score: {fmtNumber(p.score)}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{level}{p.isFrost ? " • Frost" : ""}</div>
    </div>
  );
};

export function TrendChart({ data, confidence = "normal", className = "" }: TrendChartProps) {
  const yDomain: [number, number] = [0, 100];
  const timeZone = "Europe/Berlin";
  const now = new Date().toISOString();

  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-lg ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground">Trend-Verlauf (EMS)</h3>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Fruktan-Risiko (EMS) • stündlich</div>
          {confidence === "low" && (
            <span className="text-xs px-2 py-1 rounded bg-warning/10 text-warning border border-warning/30">
              Geringe Konfidenz
            </span>
          )}
        </div>
      </div>

      <div role="img" aria-label="Trend des Fruktan-Scores über Zeit (EMS farbcodiert)">
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
            <defs>
              <linearGradient id="nowLineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            
            {/* Farbbänder für EMS-Schwellen */}
            <ReferenceArea y1={0} y2={EMS.GREEN_MAX} fill="hsl(142, 76%, 36%)" fillOpacity={0.10} />
            <ReferenceArea y1={EMS.GREEN_MAX} y2={EMS.YELLOW_MAX} fill="hsl(38, 92%, 50%)" fillOpacity={0.10} />
            <ReferenceArea y1={EMS.YELLOW_MAX} y2={EMS.RED_MAX} fill="hsl(0, 72%, 51%)" fillOpacity={0.08} />

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.5} />
            
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => fmtAxisTime(ts, timeZone)}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              tick={{ fill: '#64748b' }}
            />
            
            <YAxis
              domain={yDomain}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              tickFormatter={fmtNumber}
              tick={{ fill: '#64748b' }}
              label={{ value: 'Fruktan-Score', angle: -90, position: 'insideLeft', style: { fontSize: 13, fill: '#475569', fontWeight: 500 } }}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }} />
            
            {/* Schwellenlinien */}
            <ReferenceLine y={EMS.GREEN_MAX} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1.5} opacity={0.6} />
            <ReferenceLine y={EMS.YELLOW_MAX} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} opacity={0.6} />
            
            {/* Aktuelle Zeit - vertikale gestrichelte Linie von oben bis unten */}
            <ReferenceLine 
              x={now} 
              stroke="#3b82f6" 
              strokeWidth={3} 
              strokeDasharray="6 4"
              label={{ 
                value: '▼ JETZT', 
                position: 'top', 
                fill: '#3b82f6', 
                fontSize: 12, 
                fontWeight: 700
              }} 
            />
            
            <Line
              type="monotone"
              dataKey="score"
              stroke="#0f172a"
              strokeWidth={2.5}
              dot={<RiskDot />}
              activeDot={{ r: 6, stroke: '#0f172a', strokeWidth: 2, fill: '#fff' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legende */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#16a34a] shadow-sm" />
          <span className="font-medium">Sicher (0–29)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#f59e0b] shadow-sm" />
          <span className="font-medium">Erhöht (30–59)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-[#ef4444] shadow-sm" />
          <span className="font-medium">Hoch (60–100)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-base">✽</span>
          <span className="font-medium">Frost (≤0°C)</span>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className={`rounded-2xl border border-border bg-card p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-card-foreground">Trend-Verlauf (EMS)</h3>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">Fruktan-Risiko (EMS) • stündlich</div>
          {confidence === "low" && (
            <span className="text-xs px-2 py-1 rounded bg-warning/10 text-warning border border-warning/30">
              Geringe Konfidenz
            </span>
          )}
        </div>
      </div>

      <div role="img" aria-label="Trend des Fruktan-Scores über Zeit (EMS farbcodiert)">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
            {/* Farbbänder für EMS-Schwellen */}
            <ReferenceArea y1={0} y2={EMS.GREEN_MAX} fill="hsl(142, 76%, 36%)" fillOpacity={0.10} />
            <ReferenceArea y1={EMS.GREEN_MAX} y2={EMS.YELLOW_MAX} fill="hsl(38, 92%, 50%)" fillOpacity={0.10} />
            <ReferenceArea y1={EMS.YELLOW_MAX} y2={EMS.RED_MAX} fill="hsl(0, 72%, 51%)" fillOpacity={0.08} />

            {/* Schwellenlinien */}
            <ReferenceLine y={EMS.GREEN_MAX} stroke="hsl(142, 76%, 36%)" strokeDasharray="4 4" strokeWidth={1.5}>
              <text x="95%" y={EMS.GREEN_MAX - 5} textAnchor="end" fontSize="11" fill="hsl(142, 76%, 36%)">
                Grenze Grün
              </text>
            </ReferenceLine>
            <ReferenceLine y={EMS.YELLOW_MAX} stroke="hsl(38, 92%, 50%)" strokeDasharray="4 4" strokeWidth={1.5}>
              <text x="95%" y={EMS.YELLOW_MAX - 5} textAnchor="end" fontSize="11" fill="hsl(38, 92%, 50%)">
                Grenze Gelb
              </text>
            </ReferenceLine>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 88%)" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => fmtAxisTime(ts, timeZone)}
              tick={{ fontSize: 11, fill: "hsl(220, 10%, 45%)" }}
              stroke="hsl(220, 13%, 88%)"
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 11, fill: "hsl(220, 10%, 45%)" }}
              stroke="hsl(220, 13%, 88%)"
              label={{ value: "Score (EMS)", angle: -90, position: "insideLeft", style: { fontSize: 12, fill: "hsl(220, 10%, 45%)" } }}
            />
            <Tooltip content={<CustomTooltip />} />

            <Line
              type="monotone"
              dataKey="score"
              stroke="hsl(220, 25%, 20%)"
              strokeWidth={2}
              dot={<RiskDot />}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legende */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: riskColor(15) }} />
          <span>0–29: Sicher (Grün)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: riskColor(45) }} />
          <span>30–59: Erhöht (Gelb)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: riskColor(75) }} />
          <span>60–100: Hoch (Rot)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base">✽</span>
          <span>Frostnacht</span>
        </div>
      </div>
    </div>
  );
}

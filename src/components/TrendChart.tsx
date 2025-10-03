/**
 * TrendChart Komponente
 * Zeigt historische und zukünftige Fruktan-Risiko-Trends als Liniendiagramm
 * Zeitraum: -72h bis +48h mit Frost-Markierungen und Ampelfarben
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Area } from "recharts";
import { type TrendDataPoint } from "@/types/fruktan";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Snowflake, AlertTriangle } from "lucide-react";

interface TrendChartProps {
  data: TrendDataPoint[];
  confidence?: "normal" | "low";
  className?: string;
}

export function TrendChart({ data, confidence = "normal", className = "" }: TrendChartProps) {
  // Formatiere Datum für X-Achse
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
    });
  };

  // Custom Tooltip mit Frost-Hinweis
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload as TrendDataPoint;
    const date = new Date(data.timestamp);
    const formattedDate = date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Ampelfarbe basierend auf Level
    let levelColor = "text-safe";
    let levelText = "Gering";
    if (data.level === "moderate") {
      levelColor = "text-moderate";
      levelText = "Mäßig";
    } else if (data.level === "high") {
      levelColor = "text-high";
      levelText = "Hoch";
    }

    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{formattedDate}</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-muted-foreground">Score:</span>{" "}
            <span className={`font-semibold ${levelColor}`}>{data.score}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Risiko:</span>{" "}
            <span className={`font-medium ${levelColor}`}>{levelText}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Temperatur:</span>{" "}
            <span>{data.temperature.toFixed(1)} °C</span>
          </p>
          {data.isFrost && (
            <div className="flex items-center gap-1 text-sm text-high mt-1">
              <Snowflake className="w-3 h-3" />
              <span className="font-medium">Frostgefahr</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Finde "Jetzt"-Zeitpunkt
  const now = new Date().toISOString();

  // Konfidenzband-Daten (±5 bei low confidence)
  const dataWithConfidence = confidence === "low" 
    ? data.map(point => ({
        ...point,
        confidenceLower: Math.max(0, point.score - 5),
        confidenceUpper: Math.min(100, point.score + 5),
      }))
    : data;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Trend-Verlauf</h3>
          <p className="text-sm text-muted-foreground">
            Fruktan-Risiko von vor 72 Stunden bis +48 Stunden (stündlich)
          </p>
        </div>
        {confidence === "low" && (
          <Badge variant="outline" className="text-warning border-warning gap-1">
            <AlertTriangle className="h-3 w-3" />
            Erhöhte Unsicherheit
          </Badge>
        )}
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={dataWithConfidence} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatDate}
            className="text-xs text-muted-foreground"
            minTickGap={30}
          />
          <YAxis
            domain={[0, 100]}
            className="text-xs text-muted-foreground"
            label={{ value: "Score", angle: -90, position: "insideLeft" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => {
              if (value === "score") return "Fruktan-Score";
              return value;
            }}
          />
          
          {/* Konfidenzband (nur bei low confidence) */}
          {confidence === "low" && (
            <Area
              type="monotone"
              dataKey="confidenceUpper"
              stroke="none"
              fill="hsl(var(--warning))"
              fillOpacity={0.1}
            />
          )}
          {confidence === "low" && (
            <Area
              type="monotone"
              dataKey="confidenceLower"
              stroke="none"
              fill="hsl(var(--warning))"
              fillOpacity={0.1}
            />
          )}
          
          {/* Schwellenwerte als Referenzlinien */}
          <ReferenceLine y={40} stroke="hsl(var(--safe))" strokeDasharray="5 5" label="Grenze Grün" />
          <ReferenceLine y={70} stroke="hsl(var(--moderate))" strokeDasharray="5 5" label="Grenze Gelb" />
          
          {/* Jetzt-Linie */}
          <ReferenceLine x={now} stroke="hsl(var(--primary))" strokeWidth={2} label="Jetzt" />
          
          {/* Hauptlinie mit Ampelfarbe basierend auf Score */}
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={(props: any) => {
              const { cx, cy, payload } = props;
              let fillColor = "hsl(var(--safe))";
              if (payload.level === "moderate") fillColor = "hsl(var(--moderate))";
              if (payload.level === "high") fillColor = "hsl(var(--high))";
              
              // Frost-Marker größer und mit Schneeflocke-Symbol
              if (payload.isFrost) {
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={6} fill={fillColor} stroke="white" strokeWidth={2} />
                    <circle cx={cx} cy={cy} r={2} fill="white" />
                  </g>
                );
              }
              
              return <circle cx={cx} cy={cy} r={3} fill={fillColor} />;
            }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legende */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
        <h4 className="text-sm font-semibold mb-3">Legende</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-safe" />
            <span className="text-sm">Grün = Geringes Risiko (0–39)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-moderate" />
            <span className="text-sm">Gelb = Erhöhtes Risiko (40–69)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-high" />
            <span className="text-sm">Rot = Hohes Risiko (70–100)</span>
          </div>
          <div className="flex items-center gap-2">
            <Snowflake className="w-4 h-4 text-high" />
            <span className="text-sm">Frost-Marker (≤ 0 °C)</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

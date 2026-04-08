/*
 * Charts — Pure SVG chart components (no Recharts dependency)
 * Avoids React 19 / react-smooth ref compatibility issues
 * Design: Structured Report / Institutional Analytics
 */

import { useState } from "react";
import { RISK_COLORS, RISK_LABELS } from "@/lib/copsoq";

// ─── Horizontal Bar Chart ────────────────────────────────────────────────────

interface BarItem {
  name: string;
  fullName?: string;
  score: number;
  ref?: number;
  riskLevel: "green" | "amber" | "red";
}

export function HorizontalBarChart({
  data,
  height = 500,
}: {
  data: BarItem[];
  height?: number;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    item: BarItem;
  } | null>(null);

  const paddingLeft = 190;
  const paddingRight = 60;
  const paddingTop = 10;
  const paddingBottom = 20;
  const barHeight = 14;
  const barGap = 10;
  const rowHeight = barHeight + barGap;
  const chartWidth = 700;
  const chartHeight = data.length * rowHeight + paddingTop + paddingBottom;
  const minVal = 1;
  const maxVal = 5;
  const range = maxVal - minVal;
  const plotWidth = chartWidth - paddingLeft - paddingRight;

  const xScale = (val: number) =>
    paddingLeft + ((val - minVal) / range) * plotWidth;

  // Threshold lines at 2.33 and 3.66
  const thresholds = [2.33, 3.66];

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        style={{ minHeight: height }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {[1, 2, 3, 4, 5].map((v) => (
          <line
            key={v}
            x1={xScale(v)}
            y1={paddingTop}
            x2={xScale(v)}
            y2={chartHeight - paddingBottom}
            stroke="#f1f5f9"
            strokeWidth={1}
          />
        ))}

        {/* Threshold lines */}
        {thresholds.map((t) => (
          <line
            key={t}
            x1={xScale(t)}
            y1={paddingTop}
            x2={xScale(t)}
            y2={chartHeight - paddingBottom}
            stroke="#94a3b8"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        ))}

        {/* X axis labels */}
        {[1, 2, 3, 4, 5].map((v) => (
          <text
            key={v}
            x={xScale(v)}
            y={chartHeight - 4}
            textAnchor="middle"
            fontSize={9}
            fill="#94a3b8"
          >
            {v}
          </text>
        ))}

        {/* Bars */}
        {data.map((item, i) => {
          const y = paddingTop + i * rowHeight + barGap / 2;
          const barWidth = Math.max(2, ((item.score - minVal) / range) * plotWidth);
          const color = RISK_COLORS[item.riskLevel];

          return (
            <g
              key={i}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as SVGGElement)
                  .closest("svg")!
                  .getBoundingClientRect();
                setTooltip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  item,
                });
              }}
              style={{ cursor: "default" }}
            >
              {/* Row background */}
              <rect
                x={0}
                y={y - 2}
                width={chartWidth}
                height={barHeight + 4}
                fill={i % 2 === 0 ? "#fafafa" : "transparent"}
                rx={2}
              />

              {/* Label */}
              <text
                x={paddingLeft - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                fontSize={10}
                fill="#374151"
              >
                {item.name}
              </text>

              {/* Bar */}
              <rect
                x={paddingLeft}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                fillOpacity={0.85}
                rx={3}
              />

              {/* Reference dot */}
              {item.ref !== undefined && (
                <circle
                  cx={xScale(item.ref)}
                  cy={y + barHeight / 2}
                  r={3}
                  fill="#94a3b8"
                  stroke="white"
                  strokeWidth={1}
                />
              )}

              {/* Score label */}
              <text
                x={paddingLeft + barWidth + 6}
                y={y + barHeight / 2 + 4}
                fontSize={10}
                fill={color}
                fontWeight="600"
              >
                {item.score.toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-white border border-border rounded-lg shadow-lg p-3 text-xs z-10 max-w-[200px]"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 40,
          }}
        >
          <p className="font-semibold text-foreground mb-1">
            {tooltip.item.fullName || tooltip.item.name}
          </p>
          <p className="text-muted-foreground">
            Média:{" "}
            <span
              className="font-bold"
              style={{ color: RISK_COLORS[tooltip.item.riskLevel] }}
            >
              {tooltip.item.score.toFixed(2)}
            </span>
          </p>
          {tooltip.item.ref !== undefined && (
            <p className="text-muted-foreground">
              Ref. Nacional:{" "}
              <span className="font-medium">{tooltip.item.ref.toFixed(2)}</span>
            </p>
          )}
          <p
            className="mt-1 font-medium"
            style={{ color: RISK_COLORS[tooltip.item.riskLevel] }}
          >
            {RISK_LABELS[tooltip.item.riskLevel]}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 mt-2 justify-center flex-wrap">
        {(["green", "amber", "red"] as const).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: RISK_COLORS[level] }}
            />
            <span className="text-xs text-muted-foreground">
              {RISK_LABELS[level]}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <svg width="16" height="8">
            <line
              x1="0"
              y1="4"
              x2="16"
              y2="4"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
            <circle cx="8" cy="4" r="2.5" fill="#94a3b8" />
          </svg>
          <span className="text-xs text-muted-foreground">Ref. nacional</span>
        </div>
      </div>
    </div>
  );
}

// ─── Radar Chart (Spider) ─────────────────────────────────────────────────────

interface RadarItem {
  dimension: string;
  score: number;
  ref: number;
}

export function RadarChart({
  data,
  size = 280,
}: {
  data: RadarItem[];
  size?: number;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    item: RadarItem;
  } | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;
  const n = data.length;
  const minVal = 1;
  const maxVal = 5;
  const range = maxVal - minVal;

  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;

  const polar = (val: number, i: number) => {
    const r = ((val - minVal) / range) * radius;
    const angle = startAngle + i * angleStep;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const labelPos = (i: number, offset = 1.18) => {
    const angle = startAngle + i * angleStep;
    return {
      x: cx + radius * offset * Math.cos(angle),
      y: cy + radius * offset * Math.sin(angle),
    };
  };

  // Grid circles
  const gridLevels = [1, 2, 3, 4, 5];

  // Polygon points
  const scorePoints = data.map((d, i) => polar(d.score, i));
  const refPoints = data.map((d, i) => polar(d.ref, i));

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ") + " Z";

  return (
    <div className="relative" style={{ width: size, margin: "0 auto" }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid circles */}
        {gridLevels.map((level) => {
          const r = ((level - minVal) / range) * radius;
          return (
            <circle
              key={level}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {data.map((_, i) => {
          const end = polar(maxVal, i);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}

        {/* Reference polygon */}
        <path
          d={toPath(refPoints)}
          fill="#94a3b8"
          fillOpacity={0.12}
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />

        {/* Score polygon */}
        <path
          d={toPath(scorePoints)}
          fill="#1d4ed8"
          fillOpacity={0.18}
          stroke="#1d4ed8"
          strokeWidth={2}
        />

        {/* Score dots */}
        {scorePoints.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r={4}
            fill="#1d4ed8"
            stroke="white"
            strokeWidth={1.5}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget as SVGCircleElement)
                .closest("svg")!
                .getBoundingClientRect();
              setTooltip({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                item: data[i],
              });
            }}
          />
        ))}

        {/* Labels */}
        {data.map((d, i) => {
          const lp = labelPos(i);
          const angle = startAngle + i * angleStep;
          const anchor =
            Math.abs(Math.cos(angle)) < 0.1
              ? "middle"
              : Math.cos(angle) > 0
              ? "start"
              : "end";
          return (
            <text
              key={i}
              x={lp.x}
              y={lp.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={8.5}
              fill="#6b7280"
              style={{ maxWidth: 60 }}
            >
              {d.dimension.length > 18
                ? d.dimension.substring(0, 18) + "…"
                : d.dimension}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none bg-white border border-border rounded-lg shadow-lg p-3 text-xs z-10"
          style={{
            left: tooltip.x + 8,
            top: tooltip.y - 50,
            minWidth: 160,
          }}
        >
          <p className="font-semibold text-foreground mb-1">{tooltip.item.dimension}</p>
          <p className="text-muted-foreground">
            Média:{" "}
            <span className="font-bold text-foreground">
              {tooltip.item.score.toFixed(2)}
            </span>
          </p>
          <p className="text-muted-foreground">
            Ref. Nacional:{" "}
            <span className="font-medium">{tooltip.item.ref.toFixed(2)}</span>
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-blue-700" />
          <span className="text-xs text-muted-foreground">Empresa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="20" height="4">
            <line
              x1="0"
              y1="2"
              x2="20"
              y2="2"
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
          </svg>
          <span className="text-xs text-muted-foreground">Ref. nacional</span>
        </div>
      </div>
    </div>
  );
}

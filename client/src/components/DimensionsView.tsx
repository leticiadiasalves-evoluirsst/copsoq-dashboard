/*
 * DimensionsView — Detailed view of all COPSOQ II dimensions
 * Shows: Horizontal bar chart with traffic light colors + reference line
 * Grouped by category
 */

import { useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { CATEGORIES, RISK_COLORS, RISK_BG_COLORS, RISK_LABELS, DimensionScore } from "@/lib/copsoq";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Risk badge component
function RiskBadge({ level }: { level: "green" | "amber" | "red" }) {
  const labels = { green: "Favorável", amber: "Intermédia", red: "Risco" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        backgroundColor: RISK_BG_COLORS[level],
        color: RISK_COLORS[level],
        border: `1px solid ${RISK_COLORS[level]}30`,
      }}
    >
      {labels[level]}
    </span>
  );
}

// Single dimension row with animated bar
function DimensionRow({ score }: { score: DimensionScore }) {
  const { dimension, score: value, riskLevel } = score;
  const pct = ((value - 1) / 4) * 100; // 1–5 scale → 0–100%
  const refPct = ((dimension.refMean - 1) / 4) * 100;

  return (
    <div className="py-3 border-b border-border/50 last:border-0">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{dimension.name}</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                <Info size={13} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p className="font-medium mb-1">{dimension.name}</p>
              <p className="text-muted-foreground">
                {dimension.isRiskDirect
                  ? "Pontuação alta indica maior exposição ao risco."
                  : "Pontuação alta indica situação favorável."}
              </p>
              <p className="mt-1">
                Perguntas: Q{dimension.questions.join(", Q")}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <RiskBadge level={riskLevel} />
          <span
            className="text-base font-bold tabular-nums"
            style={{ color: RISK_COLORS[riskLevel] }}
          >
            {value.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-5 bg-muted rounded-full overflow-hidden">
        {/* Colored fill bar */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: RISK_COLORS[riskLevel],
            opacity: 0.85,
          }}
        />
        {/* Reference line */}
        <div
          className="absolute top-0 h-full w-0.5 bg-slate-500/60 z-10"
          style={{ left: `${refPct}%` }}
          title={`Ref. nacional: ${dimension.refMean.toFixed(2)}`}
        />
        {/* Scale labels */}
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <span className="text-[9px] text-white/80 font-medium z-10">1</span>
          <span className="text-[9px] text-white/80 font-medium z-10">5</span>
        </div>
      </div>

      {/* Reference annotation */}
      <div className="flex items-center gap-1 mt-1">
        <div className="w-3 h-px bg-slate-500/60" />
        <span className="text-[10px] text-muted-foreground">
          Ref. nacional: {dimension.refMean.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// Category section
function CategorySection({
  category,
  scores,
}: {
  category: string;
  scores: DimensionScore[];
}) {
  const [expanded, setExpanded] = useState(true);
  const redCount = scores.filter((s) => s.riskLevel === "red").length;
  const amberCount = scores.filter((s) => s.riskLevel === "amber").length;

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Category header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3
            className="text-base font-semibold text-foreground"
            style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
          >
            {category}
          </h3>
          <div className="flex items-center gap-1.5">
            {redCount > 0 && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: RISK_BG_COLORS.red, color: RISK_COLORS.red }}
              >
                {redCount} risco
              </span>
            )}
            {amberCount > 0 && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: RISK_BG_COLORS.amber, color: RISK_COLORS.amber }}
              >
                {amberCount} atenção
              </span>
            )}
          </div>
        </div>
        <span className="text-muted-foreground text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Dimensions */}
      {expanded && (
        <div className="px-5 pb-2">
          {scores.map((s) => (
            <DimensionRow key={s.dimension.id} score={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DimensionsView() {
  const { scores } = useDashboard();

  // Group scores by category
  const grouped = CATEGORIES.map((cat) => ({
    category: cat,
    scores: scores.filter((s) => s.dimension.category === cat),
  })).filter((g) => g.scores.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          Dimensões Psicossociais
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Análise detalhada por dimensão com comparação à referência nacional portuguesa (N=4.162)
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg border border-border text-xs">
        <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Legenda:</span>
        {(["green", "amber", "red"] as const).map((level) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: RISK_COLORS[level] }} />
            <span className="text-muted-foreground">{RISK_LABELS[level]}</span>
            <span className="text-muted-foreground/60">
              {level === "green" && "(≤ 2,33 ou ≥ 3,66*)"}
              {level === "amber" && "(2,34 – 3,65)"}
              {level === "red" && "(≥ 3,66 ou ≤ 2,33*)"}
            </span>
          </div>
        ))}
        <span className="text-muted-foreground/60 ml-auto text-[10px]">
          * Depende da direção do fator
        </span>
      </div>

      {/* Category sections */}
      <div className="space-y-4">
        {grouped.map(({ category, scores: catScores }) => (
          <CategorySection key={category} category={category} scores={catScores} />
        ))}
      </div>
    </div>
  );
}

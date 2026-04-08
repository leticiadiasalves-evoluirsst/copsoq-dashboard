/*
 * Overview — Executive summary section
 * Shows: KPI cards (green/amber/red counts), radar chart, top risks, category summary, all-dimensions bar
 * Design: Structured Report / Institutional Analytics
 * Charts: Pure SVG (no Recharts) to avoid React 19 compatibility issues
 */

import { useDashboard } from "@/contexts/DashboardContext";
import { RISK_LABELS, RISK_COLORS, RISK_BG_COLORS, CATEGORIES } from "@/lib/copsoq";
import { AlertTriangle, CheckCircle2, AlertCircle, Users, TrendingUp } from "lucide-react";
import { HorizontalBarChart, RadarChart } from "./Charts";

function KpiCard({
  label,
  value,
  icon,
  color,
  bg,
  description,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
  description: string;
}) {
  return (
    <div
      className="rounded-xl border p-5 flex items-start gap-4 shadow-sm"
      style={{ backgroundColor: bg, borderColor: `${color}30` }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-3xl font-bold" style={{ color }}>
          {value}
        </p>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function Overview() {
  const { scores, greenCount, amberCount, redCount, totalRespondents } = useDashboard();

  // Radar data — first 12 dimensions
  const radarData = scores.slice(0, 12).map((s) => ({
    dimension: s.dimension.name,
    score: s.score,
    ref: s.dimension.refMean,
  }));

  // Bar chart data — all dimensions
  const barData = scores.map((s) => ({
    name:
      s.dimension.name.length > 24
        ? s.dimension.name.substring(0, 24) + "…"
        : s.dimension.name,
    fullName: s.dimension.name,
    score: s.score,
    ref: s.dimension.refMean,
    riskLevel: s.riskLevel,
  }));

  // Category summary
  const categorySummary = CATEGORIES.map((cat) => {
    const catScores = scores.filter((s) => s.dimension.category === cat);
    const red = catScores.filter((s) => s.riskLevel === "red").length;
    const amber = catScores.filter((s) => s.riskLevel === "amber").length;
    const green = catScores.filter((s) => s.riskLevel === "green").length;
    const worstLevel: "green" | "amber" | "red" =
      red > 0 ? "red" : amber > 0 ? "amber" : "green";
    return { cat, red, amber, green, total: catScores.length, worstLevel };
  }).filter((c) => c.total > 0);

  // Priority dimensions
  const priorityDimensions = scores
    .filter((s) => s.riskLevel === "red" || s.riskLevel === "amber")
    .sort((a, b) => {
      if (a.riskLevel === "red" && b.riskLevel !== "red") return -1;
      if (b.riskLevel === "red" && a.riskLevel !== "red") return 1;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          Visão Geral
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Resumo executivo dos riscos psicossociais avaliados pelo COPSOQ II
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-white p-5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
            <Users size={20} />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{totalRespondents}</p>
            <p className="text-sm font-semibold text-foreground">Respondentes</p>
            <p className="text-xs text-muted-foreground mt-0.5">Questionários válidos</p>
          </div>
        </div>
        <KpiCard
          label="Situação Favorável"
          value={greenCount}
          icon={<CheckCircle2 size={20} />}
          color={RISK_COLORS.green}
          bg={RISK_BG_COLORS.green}
          description="Dimensões sem risco"
        />
        <KpiCard
          label="Situação Intermédia"
          value={amberCount}
          icon={<AlertCircle size={20} />}
          color={RISK_COLORS.amber}
          bg={RISK_BG_COLORS.amber}
          description="Dimensões de atenção"
        />
        <KpiCard
          label="Risco para a Saúde"
          value={redCount}
          icon={<AlertTriangle size={20} />}
          color={RISK_COLORS.red}
          bg={RISK_BG_COLORS.red}
          description="Dimensões críticas"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-base font-semibold text-foreground mb-1">
            Perfil Psicossocial
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Comparação das principais dimensões (escala 1–5)
          </p>
          <RadarChart data={radarData} size={300} />
        </div>

        {/* Priority dimensions */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Dimensões Prioritárias
            </h3>
            <p className="text-xs text-muted-foreground">
              Dimensões que requerem atenção ou intervenção
            </p>
          </div>

          {priorityDimensions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <div className="text-center">
                <CheckCircle2
                  size={40}
                  className="mx-auto mb-2"
                  style={{ color: RISK_COLORS.green }}
                />
                <p className="text-sm font-medium text-foreground">
                  Nenhuma dimensão crítica
                </p>
                <p className="text-xs text-muted-foreground">
                  Todas as dimensões estão em situação favorável
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[280px] pr-1">
              {priorityDimensions.map((s) => (
                <div
                  key={s.dimension.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{
                    backgroundColor: RISK_BG_COLORS[s.riskLevel],
                    border: `1px solid ${RISK_COLORS[s.riskLevel]}25`,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {s.dimension.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.dimension.category}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p
                      className="text-lg font-bold"
                      style={{ color: RISK_COLORS[s.riskLevel] }}
                    >
                      {s.score.toFixed(2)}
                    </p>
                    <p
                      className="text-[10px]"
                      style={{ color: RISK_COLORS[s.riskLevel] }}
                    >
                      {s.riskLevel === "red" ? "Risco" : "Atenção"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Category summary */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <h3 className="text-base font-semibold text-foreground mb-1">
          Resumo por Categoria
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Distribuição do nível de risco por categoria temática do COPSOQ II
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categorySummary.map(({ cat, red, amber, green, total, worstLevel }) => (
            <div
              key={cat}
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: RISK_BG_COLORS[worstLevel],
                borderColor: `${RISK_COLORS[worstLevel]}25`,
              }}
            >
              <p className="text-xs font-semibold text-foreground mb-2 leading-tight">
                {cat}
              </p>
              <div className="flex items-center gap-2">
                {red > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: RISK_COLORS.red + "20",
                      color: RISK_COLORS.red,
                    }}
                  >
                    {red}×
                  </span>
                )}
                {amber > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: RISK_COLORS.amber + "20",
                      color: RISK_COLORS.amber,
                    }}
                  >
                    {amber}△
                  </span>
                )}
                {green > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: RISK_COLORS.green + "20",
                      color: RISK_COLORS.green,
                    }}
                  >
                    {green}✓
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {total} dim.
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All dimensions bar chart */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={16} className="text-primary" />
          <h3 className="text-base font-semibold text-foreground">
            Todas as Dimensões — Comparação com Referência Nacional
          </h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Linha tracejada representa os limiares (2,33 / 3,66) e a referência
          nacional (N=4.162)
        </p>
        <HorizontalBarChart data={barData} height={scores.length * 26 + 40} />
      </div>
    </div>
  );
}

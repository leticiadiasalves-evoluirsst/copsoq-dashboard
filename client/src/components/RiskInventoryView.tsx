/*
 * RiskInventoryView — Inventário de Riscos por Grupo
 * Design: Structured Report / Institutional Analytics
 *
 * Exibe uma tabela cruzada de riscos psicossociais segmentada por:
 *   - Empresa
 *   - Setor
 *   - Função
 * Para cada grupo: N respondentes, contagem semáforo, dimensões críticas.
 */

import { useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { calcAllScores, DIMENSIONS, type DimensionScore, type Respondent } from "@/lib/copsoq";
import { cn } from "@/lib/utils";
import { Building2, Layers, UserCog, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, AlertCircle, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type GroupKey = "empresa" | "setor" | "funcao";

interface GroupRow {
  groupKey: GroupKey;
  groupValue: string;
  respondentCount: number;
  scores: DimensionScore[];
  greenCount: number;
  amberCount: number;
  redCount: number;
  criticalDimensions: DimensionScore[];
  attentionDimensions: DimensionScore[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildGroupRows(respondents: Respondent[], key: GroupKey): GroupRow[] {
  const groups = new Map<string, Respondent[]>();
  for (const r of respondents) {
    const val = r[key] || "Não informado";
    if (!groups.has(val)) groups.set(val, []);
    groups.get(val)!.push(r);
  }
  return Array.from(groups.entries())
    .map(([groupValue, members]) => {
      const scores = calcAllScores(members);
      const criticalDimensions = scores.filter((s) => s.riskLevel === "red");
      const attentionDimensions = scores.filter((s) => s.riskLevel === "amber");
      return {
        groupKey: key,
        groupValue,
        respondentCount: members.length,
        scores,
        greenCount: scores.filter((s) => s.riskLevel === "green").length,
        amberCount: attentionDimensions.length,
        redCount: criticalDimensions.length,
        criticalDimensions,
        attentionDimensions,
      };
    })
    .sort((a, b) => b.redCount - a.redCount || b.amberCount - a.amberCount);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RiskBadge({ level, count }: { level: "green" | "amber" | "red"; count: number }) {
  const styles = {
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  const labels = { green: "Favorável", amber: "Atenção", red: "Risco" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
        styles[level]
      )}
    >
      {count} {labels[level]}
    </span>
  );
}

function MiniBar({ green, amber, red }: { green: number; amber: number; red: number }) {
  const total = green + amber + red;
  if (total === 0) return null;
  const gPct = (green / total) * 100;
  const aPct = (amber / total) * 100;
  const rPct = (red / total) * 100;
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden gap-px bg-slate-100">
      {gPct > 0 && <div style={{ width: `${gPct}%` }} className="bg-green-500" />}
      {aPct > 0 && <div style={{ width: `${aPct}%` }} className="bg-amber-500" />}
      {rPct > 0 && <div style={{ width: `${rPct}%` }} className="bg-red-500" />}
    </div>
  );
}

function GroupRowDetail({ row }: { row: GroupRow }) {
  const [expanded, setExpanded] = useState(false);
  const hasCritical = row.redCount > 0;
  const hasAttention = row.amberCount > 0;

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all",
      hasCritical ? "border-red-200" : hasAttention ? "border-amber-200" : "border-slate-200"
    )}>
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
          hasCritical ? "bg-red-50/40 hover:bg-red-50/70" :
          hasAttention ? "bg-amber-50/30 hover:bg-amber-50/60" :
          "bg-slate-50/50 hover:bg-slate-100/60"
        )}
      >
        {/* Expand icon */}
        <span className="text-slate-400 flex-shrink-0">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>

        {/* Group name */}
        <span className="flex-1 font-semibold text-sm text-slate-800 truncate">
          {row.groupValue}
        </span>

        {/* Respondent count */}
        <span className="text-xs text-slate-500 flex-shrink-0 mr-2">
          {row.respondentCount} {row.respondentCount === 1 ? "respondente" : "respondentes"}
        </span>

        {/* Mini bar */}
        <div className="w-24 flex-shrink-0">
          <MiniBar green={row.greenCount} amber={row.amberCount} red={row.redCount} />
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
          {row.redCount > 0 && <RiskBadge level="red" count={row.redCount} />}
          {row.amberCount > 0 && <RiskBadge level="amber" count={row.amberCount} />}
          {row.redCount === 0 && row.amberCount === 0 && (
            <RiskBadge level="green" count={row.greenCount} />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-200 bg-white px-4 py-4">
          {/* Summary stats */}
          <div className="flex gap-4 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-green-600" />
              <span className="text-xs text-slate-600"><strong className="text-green-700">{row.greenCount}</strong> Favorável</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-600" />
              <span className="text-xs text-slate-600"><strong className="text-amber-700">{row.amberCount}</strong> Atenção</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-red-600" />
              <span className="text-xs text-slate-600"><strong className="text-red-700">{row.redCount}</strong> Risco</span>
            </div>
          </div>

          {/* Critical dimensions */}
          {row.criticalDimensions.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlertTriangle size={11} /> Dimensões em Risco
              </p>
              <div className="space-y-1.5">
                {row.criticalDimensions.map((s) => (
                  <div key={s.dimension.id} className="flex items-center justify-between bg-red-50 border border-red-100 rounded px-3 py-1.5">
                    <div>
                      <span className="text-xs font-medium text-red-800">{s.dimension.name}</span>
                      <span className="text-[10px] text-red-500 ml-2">{s.dimension.category}</span>
                    </div>
                    <span className="text-xs font-bold text-red-700 ml-4 flex-shrink-0">{s.score.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attention dimensions */}
          {row.attentionDimensions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                <AlertCircle size={11} /> Dimensões de Atenção
              </p>
              <div className="space-y-1.5">
                {row.attentionDimensions.map((s) => (
                  <div key={s.dimension.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded px-3 py-1.5">
                    <div>
                      <span className="text-xs font-medium text-amber-800">{s.dimension.name}</span>
                      <span className="text-[10px] text-amber-500 ml-2">{s.dimension.category}</span>
                    </div>
                    <span className="text-xs font-bold text-amber-700 ml-4 flex-shrink-0">{s.score.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {row.criticalDimensions.length === 0 && row.attentionDimensions.length === 0 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded px-3 py-2">
              <CheckCircle2 size={14} />
              <span className="text-xs font-medium">Todas as dimensões em situação favorável para este grupo.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab panel ────────────────────────────────────────────────────────────────
function GroupPanel({ rows, emptyLabel }: { rows: GroupRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
        <Info size={16} />
        <span className="text-sm">{emptyLabel}</span>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <GroupRowDetail key={row.groupValue} row={row} />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RiskInventoryView() {
  const { respondents } = useDashboard();
  const [activeTab, setActiveTab] = useState<GroupKey>("empresa");

  const empresaRows = useMemo(() => buildGroupRows(respondents, "empresa"), [respondents]);
  const setorRows   = useMemo(() => buildGroupRows(respondents, "setor"),   [respondents]);
  const funcaoRows  = useMemo(() => buildGroupRows(respondents, "funcao"),  [respondents]);

  // Summary counts across all groups
  const totalGroups = {
    empresa: empresaRows.length,
    setor:   setorRows.length,
    funcao:  funcaoRows.length,
  };
  const criticalGroups = {
    empresa: empresaRows.filter((r) => r.redCount > 0).length,
    setor:   setorRows.filter((r) => r.redCount > 0).length,
    funcao:  funcaoRows.filter((r) => r.redCount > 0).length,
  };

  const tabs: { key: GroupKey; label: string; icon: React.ReactNode }[] = [
    { key: "empresa", label: "Por Empresa",  icon: <Building2 size={15} /> },
    { key: "setor",   label: "Por Setor",    icon: <Layers size={15} /> },
    { key: "funcao",  label: "Por Função",   icon: <UserCog size={15} /> },
  ];

  const activeRows = activeTab === "empresa" ? empresaRows : activeTab === "setor" ? setorRows : funcaoRows;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Inventário de Riscos por Grupo
        </h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Distribuição dos riscos psicossociais segmentada por empresa, setor e função
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {tabs.map((tab) => {
          const total = totalGroups[tab.key];
          const critical = criticalGroups[tab.key];
          const pct = total > 0 ? Math.round((critical / total) * 100) : 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "text-left p-4 rounded-lg border transition-all",
                activeTab === tab.key
                  ? "border-primary bg-blue-50/60 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("p-1.5 rounded", activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500")}>
                  {tab.icon}
                </span>
                <span className={cn("text-sm font-semibold", activeTab === tab.key ? "text-primary" : "text-slate-700")}>
                  {tab.label}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{total}</p>
                  <p className="text-xs text-slate-500">{total === 1 ? "grupo" : "grupos"}</p>
                </div>
                {critical > 0 && (
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{critical}</p>
                    <p className="text-xs text-red-500">com risco ({pct}%)</p>
                  </div>
                )}
                {critical === 0 && total > 0 && (
                  <div className="text-right">
                    <CheckCircle2 size={20} className="text-green-500 ml-auto" />
                    <p className="text-xs text-green-600">sem risco</p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab navigation */}
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              {tab.icon}
              {tab.label}
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500"
              )}>
                {totalGroups[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
        <span className="font-medium text-slate-600">Legenda:</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Situação Favorável (≤2,33 ou ≥3,66)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Atenção (2,34–3,65)</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Risco (≥3,66 ou ≤2,33)</span>
        <span className="ml-auto text-slate-400 italic">Clique em cada grupo para expandir os detalhes</span>
      </div>

      {/* Group rows */}
      <GroupPanel
        rows={activeRows}
        emptyLabel={`Nenhum grupo de ${activeTab} encontrado nos dados carregados.`}
      />
    </div>
  );
}

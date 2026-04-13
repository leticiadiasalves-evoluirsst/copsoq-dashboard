/*
 * RespondentsView — Table of individual respondents with their scores
 */

import { useState, useCallback } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAuth } from "@/contexts/AuthContext";
import { DIMENSIONS, calcDimensionScore, RISK_COLORS, RISK_BG_COLORS } from "@/lib/copsoq";
import { ChevronDown, ChevronRight, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

function RiskDot({ level }: { level: "green" | "amber" | "red" }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: RISK_COLORS[level] }}
    />
  );
}

export default function RespondentsView() {
  const { filteredRespondents, refreshFromServer } = useDashboard();
  const { isAdmin, token } = useAuth();
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | number | null>(null);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const handleDelete = useCallback(async () => {
    if (pendingDeleteId == null || !token) return;
    setDeletingId(pendingDeleteId);
    setPendingDeleteId(null);
    try {
      const res = await fetch(`/api/responses/${pendingDeleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || "Erro ao excluir.");
      }
      toast.success("Respondente excluído com sucesso.");
      setExpandedId(null);
      await refreshFromServer();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir respondente.");
    } finally {
      setDeletingId(null);
    }
  }, [pendingDeleteId, token, refreshFromServer]);

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          Respondentes
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Detalhamento individual dos questionários respondidos
        </p>
      </div>

      {filteredRespondents.length === 0 ? (
        <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
          <User size={40} className="mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">Nenhum respondente encontrado com os filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRespondents.map((r) => {
            const isExpanded = expandedId === r.id;
            const scores = DIMENSIONS.map((d) => calcDimensionScore(d, [r]));
            const redCount = scores.filter((s) => s.riskLevel === "red").length;
            const amberCount = scores.filter((s) => s.riskLevel === "amber").length;
            const greenCount = scores.filter((s) => s.riskLevel === "green").length;

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-border shadow-sm overflow-hidden"
              >
                {/* Respondent header */}
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors text-left"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {r.nome || `Respondente ${r.id}`}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[r.empresa, r.setor, r.funcao].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <RiskDot level="red" />
                      <span className="font-semibold" style={{ color: RISK_COLORS.red }}>{redCount}</span>
                      <RiskDot level="amber" />
                      <span className="font-semibold" style={{ color: RISK_COLORS.amber }}>{amberCount}</span>
                      <RiskDot level="green" />
                      <span className="font-semibold" style={{ color: RISK_COLORS.green }}>{greenCount}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown size={16} className="text-muted-foreground" />
                    ) : (
                      <ChevronRight size={16} className="text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-border/50">
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {scores.map((s) => (
                        <div
                          key={s.dimension.id}
                          className="flex items-center justify-between p-2.5 rounded-lg text-xs"
                          style={{
                            backgroundColor: RISK_BG_COLORS[s.riskLevel],
                            border: `1px solid ${RISK_COLORS[s.riskLevel]}20`,
                          }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <RiskDot level={s.riskLevel} />
                            <span className="text-foreground font-medium truncate">
                              {s.dimension.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span
                              className="font-bold tabular-nums"
                              style={{ color: RISK_COLORS[s.riskLevel] }}
                            >
                              {s.score.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground/60">
                              / {s.dimension.refMean.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-3">
                      Formato: Pontuação individual / Referência nacional
                    </p>
                    {isAdmin && (
                      <div className="flex justify-end mt-3 pt-3 border-t border-border/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDeleteId(r.id);
                          }}
                          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={14} />
                          Excluir respondente
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir respondente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente os dados deste respondente do banco de dados. Esta operação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

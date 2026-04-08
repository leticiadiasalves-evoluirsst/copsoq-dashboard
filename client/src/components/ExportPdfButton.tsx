/*
 * ExportPdfButton — Triggers PDF report generation from COPSOQ II dashboard data
 * Uses jsPDF (pure JS, no canvas capture) for reliable cross-browser output
 */

import { useState, useCallback } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";
import { toast } from "sonner";
import { generateCopsoqPdf } from "@/lib/generatePdf";

export default function ExportPdfButton() {
  const { scores, totalRespondents, greenCount, amberCount, redCount, filters, empresas, respondents } =
    useDashboard();
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await generateCopsoqPdf({
        scores,
        totalRespondents,
        greenCount,
        amberCount,
        redCount,
        filters,
        empresas,
        respondents,
      });
      toast.success("Relatório PDF exportado com sucesso!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Erro ao gerar o relatório PDF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [loading, scores, totalRespondents, greenCount, amberCount, redCount, filters, empresas, respondents]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading || totalRespondents === 0}
      className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50 transition-all"
    >
      {loading ? (
        <>
          <Loader2 size={14} className="animate-spin" />
          <span>Gerando PDF…</span>
        </>
      ) : (
        <>
          <FileDown size={14} />
          <span>Exportar PDF</span>
        </>
      )}
    </Button>
  );
}

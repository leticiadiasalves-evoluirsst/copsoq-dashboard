/*
 * ExportPdfButton — Triggers PDF report generation from COPSOQ II dashboard data
 * Includes a modal to collect cover page information before generating the PDF
 */
import { useState, useCallback } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";
import { toast } from "sonner";
import { generateCopsoqPdf } from "@/lib/generatePdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ExportPdfButton() {
  const { scores, totalRespondents, greenCount, amberCount, redCount, filters, empresas, filteredRespondents } =
    useDashboard();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [coverInfo, setCoverInfo] = useState({
    empresaNome: "",
    cnpj: "",
    dataRelatorio: new Date().toLocaleDateString("pt-BR"),
    responsavel: "",
  });

  const handleOpenModal = useCallback(() => {
    if (totalRespondents === 0) return;
    const empresaPreFill = filters.empresa || (empresas.length === 1 ? empresas[0] : "");
    setCoverInfo((prev) => ({ ...prev, empresaNome: empresaPreFill || prev.empresaNome }));
    setShowModal(true);
  }, [totalRespondents, filters.empresa, empresas]);

  const handleExport = useCallback(async () => {
    setShowModal(false);
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
        respondents: filteredRespondents,
        coverInfo,
      });
      toast.success("Relatório PDF exportado com sucesso!");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Erro ao gerar o relatório PDF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [scores, totalRespondents, greenCount, amberCount, redCount, filters, empresas, filteredRespondents, coverInfo]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenModal}
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Informações da Capa do Relatório</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="empresaNome">Empresa Avaliada</Label>
              <Input
                id="empresaNome"
                placeholder="Nome da empresa"
                value={coverInfo.empresaNome}
                onChange={(e) => setCoverInfo((prev) => ({ ...prev, empresaNome: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={coverInfo.cnpj}
                onChange={(e) => setCoverInfo((prev) => ({ ...prev, cnpj: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataRelatorio">Data do Relatório</Label>
              <Input
                id="dataRelatorio"
                placeholder="dd/mm/aaaa"
                value={coverInfo.dataRelatorio}
                onChange={(e) => setCoverInfo((prev) => ({ ...prev, dataRelatorio: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="responsavel">Responsável pelas Informações</Label>
              <Input
                id="responsavel"
                placeholder="Nome do responsável"
                value={coverInfo.responsavel}
                onChange={(e) => setCoverInfo((prev) => ({ ...prev, responsavel: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport}>
              <FileDown size={14} className="mr-2" />
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/*
 * UploadView — Import data from Microsoft Forms Excel export
 * Supports drag-and-drop or file picker
 */

import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import { Respondent, textToValue } from "@/lib/copsoq";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type UploadState = "idle" | "dragging" | "processing" | "success" | "error";

function parseFormsExcel(workbook: import("xlsx").WorkBook): Respondent[] {
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });

  if (rows.length === 0) return [];

  // Identify question columns (not metadata columns)
  const metaCols = new Set([
    "Id", "Hora de início", "Hora de conclusão", "Email", "Nome",
    "Total de pontos", "Comentários do teste", "Hora de postagem da nota",
    "Empresa", "Pontos – Empresa", "Comentários – Empresa",
    "Setor", "Pontos – Setor", "Comentários – Setor",
    "Função", "Pontos – Função", "Comentários – Função",
    "Nome1", "Pontos – Nome1", "Comentários – Nome1",
  ]);

  const allKeys = Object.keys(rows[0] || {});
  const questionKeys = allKeys.filter(
    (k) =>
      !metaCols.has(k) &&
      !k.startsWith("Pontos –") &&
      !k.startsWith("Comentários –")
  );

  return rows
    .filter((row: Record<string, unknown>) => row["Id"] !== null && row["Id"] !== undefined && row["Id"] !== "=COUNT(A1:A140)")
    .map((row: Record<string, unknown>, idx: number) => {
      const respostas: Record<string, number | null> = {};
      questionKeys.forEach((key, i) => {
        respostas[`Q${i + 1}`] = textToValue(row[key] as string);
      });
      return {
        id: (row["Id"] as string | number) ?? idx,
        empresa: ((row["Empresa"] as string) ?? "").trim(),
        setor: ((row["Setor"] as string) ?? "").trim(),
        funcao: ((row["Função"] as string) ?? (row["Funcao"] as string) ?? "").trim(),
        nome: ((row["Nome1"] as string) ?? "").trim(),
        respostas,
      };
    });
}

export default function UploadView() {
  const { loadRespondents } = useDashboard();
  const [state, setState] = useState<UploadState>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setError("Formato inválido. Por favor, envie um arquivo .xlsx ou .xls.");
        setState("error");
        return;
      }
      setState("processing");
      setFileName(file.name);
      try {
        const buffer = await file.arrayBuffer();
        // Dynamically import xlsx
        const XLSXLib = await import("xlsx");
        const wb = XLSXLib.read(buffer, { type: "array" });
        const respondents = parseFormsExcel(wb);
        if (respondents.length === 0) {
          throw new Error("Nenhum respondente encontrado no arquivo. Verifique o formato.");
        }
        loadRespondents(respondents);
        setCount(respondents.length);
        setState("success");
        toast.success(`${respondents.length} respondente(s) importado(s) com sucesso!`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao processar o arquivo.");
        setState("error");
        toast.error("Erro ao importar dados.");
      }
    },
    [loadRespondents]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState("idle");
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const reset = () => {
    setState("idle");
    setFileName(null);
    setError(null);
    setCount(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2
          className="text-2xl font-bold text-foreground"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          Importar Dados
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Importe o relatório exportado do Microsoft Forms (.xlsx) para atualizar o painel
        </p>
      </div>

      {/* Upload area */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
          ${state === "dragging" ? "border-primary bg-primary/5 scale-[1.01]" : "border-border bg-white"}
          ${state === "success" ? "border-green-500/50 bg-green-50/50" : ""}
          ${state === "error" ? "border-red-500/50 bg-red-50/50" : ""}
        `}
        onDragOver={(e) => { e.preventDefault(); setState("dragging"); }}
        onDragLeave={() => setState("idle")}
        onDrop={handleDrop}
      >
        {state === "idle" || state === "dragging" ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Upload size={28} className="text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              Arraste o arquivo aqui
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              ou clique para selecionar o arquivo exportado do Microsoft Forms
            </p>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-white hover:bg-muted text-sm font-medium transition-colors">
              <input
                id="file-upload-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <FileSpreadsheet size={14} />
              Selecionar arquivo .xlsx
            </label>
            <p className="text-xs text-muted-foreground mt-4">
              Formatos aceitos: .xlsx, .xls (exportação padrão do Microsoft Forms)
            </p>
          </>
        ) : state === "processing" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Processando {fileName}...</p>
          </div>
        ) : state === "success" ? (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 size={48} className="text-green-600" />
            <p className="text-base font-semibold text-foreground">
              {count} respondente(s) importado(s) com sucesso
            </p>
            <p className="text-sm text-muted-foreground">{fileName}</p>
            <Button variant="outline" size="sm" onClick={reset} className="mt-2">
              <X size={14} className="mr-1" />
              Importar outro arquivo
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <AlertCircle size={48} className="text-red-600" />
            <p className="text-base font-semibold text-foreground">Erro ao importar</p>
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={reset} className="mt-2">
              <X size={14} className="mr-1" />
              Tentar novamente
            </Button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-6">
        <h3
          className="text-base font-semibold text-foreground mb-4"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
        >
          Como exportar os dados do Microsoft Forms
        </h3>
        <ol className="space-y-3">
          {[
            "Acesse o formulário no Microsoft Forms (forms.office.com)",
            "Clique em \"Respostas\" no menu superior",
            "Clique em \"Abrir no Excel\" ou \"Exportar para Excel\"",
            "Salve o arquivo .xlsx gerado",
            "Importe o arquivo nesta tela usando o botão acima",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-foreground">{step}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            <strong>Nota:</strong> O arquivo deve ser o exportado diretamente do Microsoft Forms, sem modificações na estrutura das colunas. Os dados dos respondentes são processados localmente no seu navegador e não são enviados a nenhum servidor.
          </p>
        </div>
      </div>
    </div>
  );
}

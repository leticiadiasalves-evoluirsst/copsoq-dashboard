/*
 * DashboardContext — Global state for COPSOQ II dashboard
 * Manages: respondent data, filters, computed scores
 */

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import {
  Respondent,
  DimensionScore,
  calcAllScores,
  textToValue,
  QUESTION_LABELS,
} from "@/lib/copsoq";

// ─── Sample data (from the Forms Excel file) ────────────────────────────────
const SAMPLE_RESPONDENTS: Respondent[] = [
  {
    id: 448,
    empresa: "Giselle Rodrigues de Pina Eireli",
    setor: "Instrutor",
    funcao: "Personal",
    nome: "Pedro Henrique",
    respostas: {
      Q1: 2, Q2: 1, Q3: 1, Q4: 4, Q5: 5, Q6: 4, Q7: 4, Q8: 5, Q9: 4,
      Q10: 1, Q11: 2, Q12: 5, Q13: 1, Q14: 5, Q15: 2, Q16: 5, Q17: 3,
      Q18: 4, Q19: 5, Q20: 5, Q21: 4, Q22: 3, Q23: 5, Q24: 4, Q25: 5,
      Q26: 2, Q27: 5, Q28: 2, Q29: 3, Q30: 1, Q31: 1, Q32: 3, Q33: 4,
      Q34: 3, Q35: 1, Q36: 2, Q37: 2, Q38: 1, Q39: 1, Q40: 1, Q41: 1,
    },
  },
  {
    id: 449,
    empresa: "Giselle Rodrigues de Pina Eireli",
    setor: "Instrutora",
    funcao: "Personal",
    nome: "Jaqueline",
    respostas: {
      Q1: 3, Q2: 1, Q3: 1, Q4: 5, Q5: 3, Q6: 4, Q7: 5, Q8: 4, Q9: 5,
      Q10: 2, Q11: 5, Q12: 5, Q13: 5, Q14: 5, Q15: 4, Q16: 5, Q17: 3,
      Q18: 3, Q19: 5, Q20: 5, Q21: 5, Q22: 5, Q23: 4, Q24: 4, Q25: 4,
      Q26: 3, Q27: 4, Q28: 5, Q29: 5, Q30: 3, Q31: 3, Q32: 1, Q33: 1,
      Q34: 2, Q35: 2, Q36: 1, Q37: 1, Q38: 1, Q39: 1, Q40: 1, Q41: 1,
    },
  },
  {
    id: 450,
    empresa: "Life Training Personal Studio",
    setor: "Salão de musculação",
    funcao: "Personal trainer",
    nome: "Nathalia",
    respostas: {
      Q1: 1, Q2: 1, Q3: 3, Q4: 5, Q5: 3, Q6: 3, Q7: 4, Q8: 5, Q9: 4,
      Q10: 3, Q11: 4, Q12: 5, Q13: 3, Q14: 3, Q15: 5, Q16: 4, Q17: 4,
      Q18: 4, Q19: 4, Q20: 4, Q21: 3, Q22: 3, Q23: 4, Q24: 4, Q25: 5,
      Q26: 2, Q27: 4, Q28: 5, Q29: 3, Q30: 1, Q31: 2, Q32: 1, Q33: 3,
      Q34: 1, Q35: 3, Q36: 1, Q37: 1, Q38: 1, Q39: 1, Q40: 1, Q41: 1,
    },
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface Filters {
  empresa: string;
  setor: string;
  funcao: string;
}

interface DashboardContextValue {
  respondents: Respondent[];
  filteredRespondents: Respondent[];
  scores: DimensionScore[];
  filters: Filters;
  setFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
  loadRespondents: (data: Respondent[]) => void;
  empresas: string[];
  setores: string[];
  funcoes: string[];
  totalRespondents: number;
  greenCount: number;
  amberCount: number;
  redCount: number;
  renameEmpresa: (oldValue: string, newValue: string) => void;
  renameSetor: (oldValue: string, newValue: string) => void;
  renameFuncao: (oldValue: string, newValue: string) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [respondents, setRespondents] = useState<Respondent[]>([]);
  const [filters, setFilters] = useState<Filters>({
    empresa: "",
    setor: "",
    funcao: "",
  });

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ empresa: "", setor: "", funcao: "" });
  }, []);

  const loadRespondents = useCallback((data: Respondent[]) => {
    setRespondents(data);
    setFilters({ empresa: "", setor: "", funcao: "" });
  }, []);

  // Unique filter options
  const empresas = useMemo(
    () => Array.from(new Set(respondents.map((r) => r.empresa).filter(Boolean))).sort(),
    [respondents]
  );
  const setores = useMemo(
    () =>      Array.from(new Set(
          respondents
            .filter((r) => !filters.empresa || r.empresa === filters.empresa)
            .map((r) => r.setor)
            .filter(Boolean)
        )).sort(),
    [respondents, filters.empresa]
  );
  const funcoes = useMemo(
    () =>
      Array.from(new Set(
          respondents
            .filter(
              (r) =>
                (!filters.empresa || r.empresa === filters.empresa) &&
                (!filters.setor || r.setor === filters.setor)
            )
            .map((r) => r.funcao)
            .filter(Boolean)
        )).sort(),
    [respondents, filters.empresa, filters.setor]
  );

  // Filtered respondents
  const filteredRespondents = useMemo(
    () =>
      respondents.filter(
        (r) =>
          (!filters.empresa || r.empresa === filters.empresa) &&
          (!filters.setor || r.setor === filters.setor) &&
          (!filters.funcao || r.funcao === filters.funcao)
      ),
    [respondents, filters]
  );

  // Computed scores
  const scores = useMemo(
    () => calcAllScores(filteredRespondents),
    [filteredRespondents]
  );

  const greenCount = useMemo(
    () => scores.filter((s) => s.riskLevel === "green").length,
    [scores]
  );
  const amberCount = useMemo(
    () => scores.filter((s) => s.riskLevel === "amber").length,
    [scores]
  );
  const redCount = useMemo(
    () => scores.filter((s) => s.riskLevel === "red").length,
    [scores]
  );

  // Rename functions
  const renameEmpresa = useCallback((oldValue: string, newValue: string) => {
    if (oldValue === newValue || !oldValue || !newValue) return;
    setRespondents((prev) =>
      prev.map((r) =>
        r.empresa === oldValue ? { ...r, empresa: newValue } : r
      )
    );
  }, []);

  const renameSetor = useCallback((oldValue: string, newValue: string) => {
    if (oldValue === newValue || !oldValue || !newValue) return;
    setRespondents((prev) =>
      prev.map((r) =>
        r.setor === oldValue ? { ...r, setor: newValue } : r
      )
    );
  }, []);

  const renameFuncao = useCallback((oldValue: string, newValue: string) => {
    if (oldValue === newValue || !oldValue || !newValue) return;
    setRespondents((prev) =>
      prev.map((r) =>
        r.funcao === oldValue ? { ...r, funcao: newValue } : r
      )
    );
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        respondents,
        filteredRespondents,
        scores,
        filters,
        setFilter,
        clearFilters,
        loadRespondents,
        empresas,
        setores,
        funcoes,
        totalRespondents: filteredRespondents.length,
        greenCount,
        amberCount,
        redCount,
        renameEmpresa,
        renameSetor,
        renameFuncao,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

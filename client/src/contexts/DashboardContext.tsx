/*
 * DashboardContext — Global state for COPSOQ II dashboard
 * Manages: respondent data, filters, computed scores
 * Now supports loading from backend API (saved questionnaire responses)
 */

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import {
  Respondent,
  DimensionScore,
  calcAllScores,
  textToValue,
  QUESTION_LABELS,
} from "@/lib/copsoq";

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
  addRespondent: (data: Respondent) => void;
  refreshFromServer: () => Promise<void>;
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

  const addRespondent = useCallback((data: Respondent) => {
    setRespondents((prev) => [...prev, data]);
  }, []);

  // Load saved responses from server on mount
  const refreshFromServer = useCallback(async () => {
    try {
      const res = await fetch("/api/responses");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: Respondent[] = data.map((r: any) => ({
            id: r.id,
            empresa: r.empresa || "",
            setor: r.setor || "",
            funcao: r.funcao || "",
            nome: r.nome || "",
            respostas: r.respostas || {},
          }));
          setRespondents((prev) => {
            // Merge: keep existing respondents that are not from server, add server ones
            const serverIds = new Set(mapped.map((m) => m.id));
            const nonServer = prev.filter((p) => !serverIds.has(p.id));
            return [...nonServer, ...mapped];
          });
        }
      }
    } catch {
      // Silently fail — server may not be running in dev/static mode
    }
  }, []);

  useEffect(() => {
    refreshFromServer();
  }, [refreshFromServer]);

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
        addRespondent,
        refreshFromServer,
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

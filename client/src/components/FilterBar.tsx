/*
 * FilterBar — Empresa / Setor / Função filters
 * Design: Compact horizontal filter row with select dropdowns
 */

import { X, Filter } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function FilterBar() {
  const { filters, setFilter, clearFilters, empresas, setores, funcoes, totalRespondents } =
    useDashboard();

  const hasFilters = filters.empresa || filters.setor || filters.funcao;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white border border-border rounded-lg shadow-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Filter size={14} />
        <span className="text-xs font-semibold uppercase tracking-wider">Filtros</span>
      </div>

      {/* Empresa */}
      <Select
        value={filters.empresa || "__all__"}
        onValueChange={(v) => setFilter("empresa", v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-8 text-sm w-[200px]">
          <SelectValue placeholder="Todas as empresas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas as empresas</SelectItem>
          {empresas.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Setor */}
      <Select
        value={filters.setor || "__all__"}
        onValueChange={(v) => setFilter("setor", v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-8 text-sm w-[180px]">
          <SelectValue placeholder="Todos os setores" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todos os setores</SelectItem>
          {setores.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Função */}
      <Select
        value={filters.funcao || "__all__"}
        onValueChange={(v) => setFilter("funcao", v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-8 text-sm w-[180px]">
          <SelectValue placeholder="Todas as funções" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Todas as funções</SelectItem>
          {funcoes.map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <X size={12} />
          Limpar
        </Button>
      )}

      {/* Respondent count */}
      <div className="ml-auto text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{totalRespondents}</span>{" "}
        respondente{totalRespondents !== 1 ? "s" : ""}
        {hasFilters ? " (filtrado)" : ""}
      </div>
    </div>
  );
}

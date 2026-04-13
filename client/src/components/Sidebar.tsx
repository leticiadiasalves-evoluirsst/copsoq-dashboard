/*
 * Sidebar — Navigation component for COPSOQ II Dashboard
 * Design: Dark navy sidebar with section-based navigation
 */

import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Upload,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  ClipboardList,
  ShieldAlert,
  Database,
  FileEdit,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  separator?: boolean;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "overview", label: "Visão Geral", icon: <LayoutDashboard size={18} /> },
  { id: "dimensions", label: "Dimensões", icon: <BarChart3 size={18} /> },
  { id: "inventory", label: "Inventário de Riscos", icon: <ClipboardList size={18} /> },
  { id: "actions", label: "Plano de Ação", icon: <ShieldAlert size={18} /> },
  { id: "respondents", label: "Respondentes", icon: <Users size={18} /> },
  { id: "manage", label: "Gerenciar Dados", icon: <Database size={18} /> },
  { id: "upload", label: "Importar Dados", icon: <Upload size={18} /> },
  { id: "questionario", label: "Questionário", icon: <FileEdit size={18} />, separator: true },
  { id: "users", label: "Usuários", icon: <UserCog size={18} />, adminOnly: true },
];

interface SidebarProps {
  activeSection: string;
  onSectionChange: (id: string) => void;
}

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out",
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663309569596/OnnnmFKgchOrSoVP.png"
              alt="Evoluir SST"
              className="flex-shrink-0 w-8 h-8 object-contain"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-widest uppercase text-sidebar-primary truncate">
                Evoluir SST
              </p>
              <p className="text-[10px] text-sidebar-foreground/60 truncate">
                Avaliação Psicossocial
              </p>
            </div>
          </div>
        )}
        {collapsed && (
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663309569596/OnnnmFKgchOrSoVP.png"
            alt="Evoluir SST"
            className="w-8 h-8 object-contain mx-auto"
          />
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            aria-label="Recolher menu"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 p-1.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
          aria-label="Expandir menu"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/40">
            Painel
          </p>
        )}
        {visibleItems.map((item) => (
          <div key={item.id}>
            {item.separator && (
              <div className="my-3">
                {!collapsed && (
                  <div className="flex items-center gap-2 px-3 mb-2">
                    <div className="flex-1 h-px bg-sidebar-border" />
                    <p className="text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/40">
                      Coleta
                    </p>
                    <div className="flex-1 h-px bg-sidebar-border" />
                  </div>
                )}
                {collapsed && <div className="h-px bg-sidebar-border mx-2" />}
              </div>
            )}
            <button
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center" : "",
                activeSection === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-sidebar-foreground/40">
            <BookOpen size={12} />
            <p className="text-[10px] leading-tight">
              Baseado na metodologia<br />
              <span className="text-sidebar-foreground/60 font-medium">COPSOQ II — Versão Portuguesa</span>
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

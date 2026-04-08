/*
 * Home — Main dashboard page
 * Layout: Fixed sidebar (left) + scrollable content area (right)
 * Design: Structured Report / Institutional Analytics
 */

import { useState } from "react";
import { DashboardProvider } from "@/contexts/DashboardContext";
import Sidebar from "@/components/Sidebar";
import FilterBar from "@/components/FilterBar";
import Overview from "@/components/Overview";
import DimensionsView from "@/components/DimensionsView";
import RespondentsView from "@/components/RespondentsView";
import UploadView from "@/components/UploadView";
import ExportPdfButton from "@/components/ExportPdfButton";
import RiskInventoryView from "@/components/RiskInventoryView";
import ActionPlanView from "@/components/ActionPlanView";

type Section = "overview" | "dimensions" | "inventory" | "actions" | "respondents" | "upload";

function DashboardContent() {
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <Overview />;
      case "dimensions":
        return <DimensionsView />;
      case "respondents":
        return <RespondentsView />;
      case "inventory":
        return <RiskInventoryView />;
      case "actions":
        return <ActionPlanView />;
      case "upload":
        return <UploadView />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar activeSection={activeSection} onSectionChange={(id) => setActiveSection(id as Section)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex-shrink-0 bg-white border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310419663031272139/nMBkaAmAqguAoZSh.webp"
              alt="Evoluir SST"
              className="h-10 w-auto object-contain"
            />
            <div>
              <h1
                className="text-lg font-bold text-foreground"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                Painel de Avaliação Psicossocial
              </h1>
              <p className="text-xs text-muted-foreground">
                NR-17 · Metodologia COPSOQ II — Versão Portuguesa
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportPdfButton />
          </div>
        </header>

        {/* Filters */}
        {activeSection !== "upload" && (
          <div className="flex-shrink-0 px-6 pt-4">
            <FilterBar />
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

/*
 * Home — Main dashboard page
 * Layout: Fixed sidebar (left) + scrollable content area (right)
 * Design: Structured Report / Institutional Analytics
 * 
 * FIX: All section components are now rendered once and toggled via CSS (display: none/block)
 * instead of being conditionally mounted/unmounted. This prevents the CopsoqForm from
 * being remounted on parent re-renders, which was causing the cursor to leave input fields.
 */

import { useState, useCallback } from "react";
import { DashboardProvider, useDashboard } from "@/contexts/DashboardContext";
import Sidebar from "@/components/Sidebar";
import FilterBar from "@/components/FilterBar";
import Overview from "@/components/Overview";
import DimensionsView from "@/components/DimensionsView";
import RespondentsView from "@/components/RespondentsView";
import UploadView from "@/components/UploadView";
import ExportPdfButton from "@/components/ExportPdfButton";
import RiskInventoryView from "@/components/RiskInventoryView";
import ActionPlanView from "@/components/ActionPlanView";
import ManageDataView from "@/components/ManageDataView";
import CopsoqForm from "@/components/CopsoqForm";

type Section = "overview" | "dimensions" | "inventory" | "actions" | "respondents" | "manage" | "upload" | "questionario";

function DashboardContent() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const { refreshFromServer } = useDashboard();

  const handleFormSubmitted = useCallback(() => {
    refreshFromServer();
  }, [refreshFromServer]);

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

        {/* Filters — hidden for certain sections */}
        <div
          className="flex-shrink-0 px-6 pt-4"
          style={{
            display: activeSection === "upload" || activeSection === "manage" || activeSection === "questionario"
              ? "none"
              : "block",
          }}
        >
          <FilterBar />
        </div>

        {/* Page content — all sections rendered, visibility controlled by CSS */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Overview section */}
          <div style={{ display: activeSection === "overview" ? "block" : "none" }}>
            <Overview />
          </div>

          {/* Dimensions section */}
          <div style={{ display: activeSection === "dimensions" ? "block" : "none" }}>
            <DimensionsView />
          </div>

          {/* Respondents section */}
          <div style={{ display: activeSection === "respondents" ? "block" : "none" }}>
            <RespondentsView />
          </div>

          {/* Risk Inventory section */}
          <div style={{ display: activeSection === "inventory" ? "block" : "none" }}>
            <RiskInventoryView />
          </div>

          {/* Action Plan section */}
          <div style={{ display: activeSection === "actions" ? "block" : "none" }}>
            <ActionPlanView />
          </div>

          {/* Manage Data section */}
          <div style={{ display: activeSection === "manage" ? "block" : "none" }}>
            <ManageDataView />
          </div>

          {/* Upload section */}
          <div style={{ display: activeSection === "upload" ? "block" : "none" }}>
            <UploadView />
          </div>

          {/* COPSOQ Questionnaire section — THIS WAS THE PROBLEMATIC COMPONENT */}
          <div style={{ display: activeSection === "questionario" ? "block" : "none" }}>
            <CopsoqForm onSubmitted={handleFormSubmitted} />
          </div>
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

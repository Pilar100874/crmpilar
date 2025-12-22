import { useState } from "react";
import { MessageSquare, Calendar, Mail, Receipt, User, ChevronLeft, Phone, Building2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileTab {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface MobileAtendimentoLayoutProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: MobileTab[];
  listContent: React.ReactNode;
  mainContent: React.ReactNode;
  detailsContent?: React.ReactNode;
  showDetails: boolean;
  onToggleDetails: () => void;
  hasSelectedItem: boolean;
  onBack?: () => void;
  selectedItemName?: string;
  footerContent?: React.ReactNode;
}

type MobileView = "list" | "main" | "details";

export function MobileAtendimentoLayout({
  activeTab,
  onTabChange,
  tabs,
  listContent,
  mainContent,
  detailsContent,
  showDetails,
  onToggleDetails,
  hasSelectedItem,
  onBack,
  selectedItemName,
  footerContent,
}: MobileAtendimentoLayoutProps) {
  const [mobileView, setMobileView] = useState<MobileView>("list");

  // Quando seleciona um item, vai para a view principal
  const handleItemSelected = () => {
    if (hasSelectedItem) {
      setMobileView("main");
    }
  };

  // Voltar para a lista
  const handleBack = () => {
    if (mobileView === "details") {
      setMobileView("main");
    } else if (mobileView === "main") {
      setMobileView("list");
      onBack?.();
    }
  };

  // Ver detalhes
  const handleShowDetails = () => {
    setMobileView("details");
    onToggleDetails();
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Mobile */}
      {mobileView !== "list" && (
        <div className="flex-shrink-0 px-3 py-2.5 bg-card border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleBack}
              className="h-8 w-8 p-0 rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            {selectedItemName && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium text-sm truncate max-w-[150px]">
                  {selectedItemName}
                </span>
              </div>
            )}
          </div>
          {mobileView === "main" && detailsContent && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleShowDetails}
              className="h-8 px-3 rounded-full text-xs"
            >
              <Building2 className="h-4 w-4 mr-1" />
              Detalhes
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Lista */}
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-300 ease-out",
            mobileView === "list" ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="h-full flex flex-col">
            {listContent}
            {footerContent && (
              <div className="flex-shrink-0 border-t bg-card p-3">
                {footerContent}
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-300 ease-out",
            mobileView === "main" ? "translate-x-0" : mobileView === "list" ? "translate-x-full" : "-translate-x-full"
          )}
        >
          {mainContent}
        </div>

        {/* Detalhes */}
        {detailsContent && (
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-300 ease-out bg-card",
              mobileView === "details" ? "translate-x-0" : "translate-x-full"
            )}
          >
            {detailsContent}
          </div>
        )}
      </div>

      {/* Bottom Navigation - Sempre visível */}
      <div className="flex-shrink-0 bg-card border-t border-border/50 px-2 py-1.5 safe-area-bottom">
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all relative",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  {tab.badge && tab.badge > 0 && (
                    <Badge
                      className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 text-[10px] bg-destructive text-destructive-foreground border-0"
                    >
                      {tab.badge > 99 ? "99+" : tab.badge}
                    </Badge>
                  )}
                </div>
                <span className={cn("text-[10px] mt-0.5 font-medium", isActive && "text-primary")}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Hook para gerenciar a navegação mobile
export function useMobileAtendimentoNavigation() {
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const goToList = () => setMobileView("list");
  const goToMain = () => setMobileView("main");
  const goToDetails = () => setMobileView("details");

  return {
    mobileView,
    goToList,
    goToMain,
    goToDetails,
    setMobileView,
  };
}

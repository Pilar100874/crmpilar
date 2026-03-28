import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save, Play, ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkflowBuilderLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  flowName: string;
  onFlowNameChange: (name: string) => void;
  onSave: () => void;
  isSaving?: boolean;
  onTest?: () => void;
  showTest?: boolean;
  testLabel?: string;
  isTestActive?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onAddBlock?: () => void;
  isLocked?: boolean;
  onToggleLock?: () => void;
  hasUnsavedChanges?: boolean;
  defaultReturnUrl?: string;
  leftContent?: ReactNode;
  rightContent?: ReactNode;
  centerContent?: ReactNode;
}

export function WorkflowBuilderLayout({
  children,
  title,
  subtitle,
  flowName,
  onFlowNameChange,
  onSave,
  isSaving = false,
  onTest,
  showTest = false,
  testLabel = "Testar",
  isTestActive = false,
  onZoomIn,
  onZoomOut,
  onFitView,
  onAddBlock,
  isLocked = false,
  onToggleLock,
  hasUnsavedChanges = false,
  defaultReturnUrl = "/",
  leftContent,
  rightContent,
  centerContent,
}: WorkflowBuilderLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Captura a URL de origem para retornar ao fechar
  const [originUrl] = useState(() => {
    const state = location.state as { from?: string } | null;
    return state?.from || defaultReturnUrl;
  });

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      navigate(originUrl);
    }
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    navigate(originUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 min-h-[3.5rem] border-b border-border flex items-center justify-between px-2 sm:px-4 bg-gradient-to-r from-primary/5 to-primary/10 shadow-sm">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {/* Title - Hidden on small screens */}
          <div className="hidden lg:block">
            <h2 className="text-sm font-bold text-foreground leading-tight truncate">{title}</h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground leading-tight truncate">{subtitle}</p>
            )}
          </div>

          {/* Separator */}
          <div className="hidden lg:block h-8 w-px bg-border" />

          {/* Flow Name Input */}
          <Input
            value={flowName}
            onChange={(e) => onFlowNameChange(e.target.value)}
            className="w-[120px] sm:w-[160px] md:w-[200px] h-8 text-xs sm:text-sm"
            placeholder="Nome do fluxo"
          />

          {/* Zoom Controls */}
          {(onZoomIn || onZoomOut || onFitView || onAddBlock || onToggleLock) && (
            <>
              <div className="hidden sm:block h-8 w-px bg-border" />
              <div className="hidden sm:flex items-center gap-1">
                {onAddBlock && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onAddBlock}
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                    title="Adicionar bloco"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                {onZoomIn && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onZoomIn}
                    className="h-8 w-8 rounded-full"
                    title="Aumentar zoom"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                )}
                {onZoomOut && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onZoomOut}
                    className="h-8 w-8 rounded-full"
                    title="Diminuir zoom"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                )}
                {onFitView && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onFitView}
                    className="h-8 w-8 rounded-full"
                    title="Centralizar"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                )}
                {onToggleLock && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onToggleLock}
                    className={`h-8 w-8 rounded-full ${isLocked ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}`}
                    title={isLocked ? "Desbloquear canvas" : "Bloquear canvas"}
                  >
                    {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </>
          )}

          {/* AI Generator */}
          {aiGeneratorContent}

          {/* Custom Left Content */}
          {leftContent}
        </div>

        {/* Center Content */}
        {centerContent && (
          <div className="hidden md:flex items-center gap-2">
            {centerContent}
          </div>
        )}

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Custom Right Content */}
          {rightContent}

          {/* Test Button */}
          {onTest && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              className={`h-8 text-xs sm:text-sm px-2 sm:px-3 ${isTestActive ? 'bg-primary/10' : ''}`}
            >
              <Play className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{showTest ? "Fechar" : testLabel}</span>
            </Button>
          )}

          {/* Save Button */}
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className={`h-8 text-xs sm:text-sm px-2 sm:px-3 ${isSaving ? 'bg-green-600' : ''}`}
          >
            <Save className={`h-4 w-4 mr-1 sm:mr-2 ${isSaving ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">{isSaving ? "Salvando..." : "Salvar"}</span>
          </Button>

          {/* Close Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClose}
            className="h-8 text-xs sm:text-sm px-2 sm:px-3"
          >
            <X className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Fechar</span>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Tem certeza que deseja sair sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

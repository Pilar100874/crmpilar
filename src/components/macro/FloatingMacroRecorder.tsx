import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMacro } from "@/contexts/MacroContext";
import { Button } from "@/components/ui/button";
import { Circle, Square, Pause, Play, List, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FloatingMacroRecorder() {
  const navigate = useNavigate();
  const {
    isRecording,
    recordingSteps,
    startRecording,
    stopRecording,
    addRecordingStep,
    clearRecordingSteps,
  } = useMacro();

  const hasSteps = recordingSteps.length > 0;

  // Captura automática de cliques em elementos com data-macro-id
  useEffect(() => {
    if (!isRecording) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Procura pelo elemento ou ancestral com data-macro-id
      const macroElement = target.closest('[data-macro-id]') as HTMLElement;
      if (macroElement) {
        const macroId = macroElement.getAttribute('data-macro-id');
        if (macroId) {
          // Determina o tipo baseado no elemento
          const tagName = macroElement.tagName.toLowerCase();
          const isInput = tagName === 'input' || tagName === 'textarea';
          const isSelect = macroElement.closest('[role="combobox"]') || tagName === 'select';
          
          if (!isInput && !isSelect) {
            // É um clique
            const label = macroElement.textContent?.trim().substring(0, 50) || macroId;
            addRecordingStep({
              type: 'click',
              target: macroId,
              meta: { label: `Clique: ${label}` }
            });
          }
        }
      }
    };

    // Captura mudanças em inputs
    const handleGlobalInput = (e: Event) => {
      const target = e.target as HTMLElement;
      const macroId = target.getAttribute('data-macro-id');
      
      if (macroId && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const value = (target as HTMLInputElement).value;
        addRecordingStep({
          type: 'setValue',
          target: macroId,
          value,
          meta: { label: `Preencher: ${macroId} = ${value.substring(0, 30)}...` }
        });
      }
    };

    // Adiciona listeners
    document.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('change', handleGlobalInput, true);

    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('change', handleGlobalInput, true);
    };
  }, [isRecording, addRecordingStep]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-lg">
      {/* Indicador de status */}
      <div className={`flex items-center gap-2 ${isRecording ? 'text-destructive' : 'text-muted-foreground'}`}>
        <div className={isRecording ? "animate-pulse" : ""}>
          <Circle className="h-3 w-3 fill-current" />
        </div>
        <span className="text-xs font-medium">
          {isRecording ? "Gravando" : hasSteps ? "Gravado" : "Macro"}
        </span>
        {hasSteps && (
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {recordingSteps.length}
          </Badge>
        )}
      </div>

      <div className="h-4 w-px bg-border mx-1" />

      {/* Botões de controle */}
      {!isRecording ? (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={startRecording}
            className="h-7 w-7 p-0"
            title="Iniciar gravação"
          >
            <Circle className="h-4 w-4 text-destructive" />
          </Button>
          
          {hasSteps && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/macros?tab=recorder")}
                className="h-7 w-7 p-0"
                title="Ver passos gravados"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={clearRecordingSteps}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                title="Descartar gravação"
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <Button
            size="sm"
            variant="ghost"
            onClick={stopRecording}
            className="h-7 w-7 p-0"
            title="Parar gravação"
          >
            <Square className="h-4 w-4 text-destructive fill-destructive" />
          </Button>
        </>
      )}
    </div>
  );
}

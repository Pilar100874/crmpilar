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
    recordingMeta,
    startRecording,
    resumeRecording,
    stopRecording,
    addRecordingStep,
    clearRecordingSteps,
    saveCurrentRecording,
  } = useMacro();

  const hasSteps = recordingSteps.length > 0;

  // Gera um identificador para o elemento
  const generateElementId = (element: HTMLElement): string => {
    // Prioriza data-macro-id
    const macroId = element.getAttribute('data-macro-id');
    if (macroId) return macroId;

    // Usa id se existir
    if (element.id) return `#${element.id}`;

    // Usa nome do formulário se for input
    const name = element.getAttribute('name');
    if (name) return `[name="${name}"]`;

    // Usa classe principal + tag
    const tagName = element.tagName.toLowerCase();
    const className = element.className?.split?.(' ')?.[0];
    if (className && typeof className === 'string') {
      return `${tagName}.${className}`;
    }

    // Fallback: tag + texto truncado
    const text = element.textContent?.trim().substring(0, 20) || '';
    return `${tagName}${text ? `:${text}` : ''}`;
  };

  // Captura automática de cliques e inputs
  useEffect(() => {
    if (!isRecording) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Ignora cliques no próprio botão flutuante
      if (target.closest('.fixed.bottom-4.right-4')) return;
      
      const tagName = target.tagName.toLowerCase();
      const isInput = tagName === 'input' || tagName === 'textarea';
      const isSelect = target.closest('[role="combobox"]') || tagName === 'select';
      
      // Só grava cliques (não inputs/selects que são tratados separadamente)
      if (!isInput && !isSelect) {
        const elementId = generateElementId(target);
        const label = target.textContent?.trim().substring(0, 50) || elementId;
        addRecordingStep({
          type: 'click',
          target: elementId,
          meta: { label: `Clique: ${label}` }
        });
      }
    };

    // Captura mudanças em inputs
    const handleGlobalInput = (e: Event) => {
      const target = e.target as HTMLElement;
      
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const elementId = generateElementId(target);
        const value = (target as HTMLInputElement).value;
        addRecordingStep({
          type: 'setValue',
          target: elementId,
          value,
          meta: { label: `Preencher: ${elementId} = ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}` }
        });
      }
    };

    // Adiciona listeners
    document.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('input', handleGlobalInput, true);
    document.addEventListener('change', handleGlobalInput, true);
 
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
      document.removeEventListener('input', handleGlobalInput, true);
      document.removeEventListener('change', handleGlobalInput, true);
    };
  }, [isRecording, addRecordingStep]);

  const handleRecordClick = () => {
    if (!recordingMeta) {
      alert('Antes de gravar, vá na aba "Gravador" e preencha Nome, Descrição e Atalho.');
      return;
    }

    if (hasSteps) {
      resumeRecording();
    } else {
      startRecording();
    }
  };

  const handleFinishClick = async () => {
    if (!recordingMeta) {
      alert('Antes de encerrar, vá na aba "Gravador" e preencha Nome, Descrição e Atalho.');
      return;
    }

    if (isRecording) {
      stopRecording();
    }

    await saveCurrentRecording();
  };

  // Só mostra o botão flutuante quando o usuário clicou em "Iniciar Gravação" na aba Gravador
  if (!recordingMeta) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-card px-3 py-2 shadow-lg">
      {/* Indicador de status */}
      <div className={`flex items-center gap-2 ${isRecording ? 'text-destructive' : 'text-muted-foreground'}`}>
        <div className={isRecording ? 'animate-pulse' : ''}>
          <Circle className="h-3 w-3 fill-current" />
        </div>
        <span className="text-xs font-medium">
          {isRecording ? 'Gravando' : hasSteps ? 'Pausado' : 'Macro'}
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
            onClick={handleRecordClick}
            className="h-7 w-7 p-0"
            title={hasSteps ? 'Retomar gravação' : 'Iniciar gravação'}
          >
            {hasSteps ? <Play className="h-4 w-4" /> : <Circle className="h-4 w-4 text-destructive" />}
          </Button>

          {hasSteps && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate('/macros?tab=recorder')}
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
            title="Pausar gravação"
          >
            <Pause className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFinishClick}
            className="h-7 w-7 p-0 text-destructive"
            title="Encerrar e salvar macro"
          >
            <Square className="h-4 w-4 text-destructive fill-destructive" />
          </Button>
        </>
      )}
    </div>
  );
}

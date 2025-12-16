import { useState, useEffect, useRef } from 'react';
import { useMacro } from '@/contexts/MacroContext';
import { MacroStep } from '@/types/macro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Circle, 
  Square, 
  X,
  Save,
  Navigation,
  Type,
  Trash2,
  MousePointerClick,
  Check,
  Crosshair
} from 'lucide-react';
import { toast } from 'sonner';
import { ElementSelector, ElementInfo } from './ElementSelector';

function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function FloatingMacroRecorder() {
  const { saveMacro } = useMacro();
  const recorderRef = useRef<HTMLDivElement>(null);
  
  const [isVisible, setIsVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const [macroName, setMacroName] = useState('');
  const [steps, setSteps] = useState<MacroStep[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [lastCapturedPath, setLastCapturedPath] = useState<string | null>(null);
  
  // Estado para escolha de ação
  const [pendingElement, setPendingElement] = useState<{selector: string, info: ElementInfo, element: HTMLElement} | null>(null);
  const [showActionChoice, setShowActionChoice] = useState(false);
  const [isWaitingForInput, setIsWaitingForInput] = useState(false);
  const [originalValue, setOriginalValue] = useState('');

  const startRecording = () => {
    setSteps([]);
    setIsRecording(true);
    setLastCapturedPath(null);
    toast.success('Gravação iniciada! Clique em "Selecionar" para capturar elementos.');
  };

  const stopRecording = () => {
    setIsSelectingElement(false);
    setShowActionChoice(false);
    setIsWaitingForInput(false);
    setPendingElement(null);
    if (steps.length === 0) {
      toast.error('Nenhum passo gravado');
      setIsRecording(false);
      return;
    }
    setIsRecording(false);
    setShowNameInput(true);
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setIsSelectingElement(false);
    setShowActionChoice(false);
    setIsWaitingForInput(false);
    setPendingElement(null);
    setSteps([]);
    setShowNameInput(false);
    setMacroName('');
    setLastCapturedPath(null);
  };

  const saveMacroHandler = async () => {
    if (!macroName.trim()) {
      toast.error('Digite um nome para a macro');
      return;
    }

    await saveMacro({
      name: macroName,
      enabled: true,
      steps
    });

    toast.success('Macro salva com sucesso!');
    setShowNameInput(false);
    setMacroName('');
    setSteps([]);
    setIsVisible(false);
  };

  const startElementSelection = () => {
    setIsSelectingElement(true);
  };

  const handleElementSelected = (selector: string, info: ElementInfo, element: HTMLElement) => {
    setIsSelectingElement(false);
    setPendingElement({ selector, info, element });
    setShowActionChoice(true);
  };

  const addNavigationStep = () => {
    const currentPath = window.location.pathname;
    if (lastCapturedPath !== currentPath) {
      const step: MacroStep = {
        id: generateStepId(),
        type: 'navigate',
        value: currentPath,
        label: `Abrir: ${currentPath}`,
        enabled: true
      };
      setSteps(prev => [...prev, step]);
      setLastCapturedPath(currentPath);
    }
  };

  const executeClickAction = () => {
    if (!pendingElement) return;
    
    const { selector, info, element } = pendingElement;
    
    addNavigationStep();
    
    const elementLabel = info.placeholder || info.text?.slice(0, 20) || info.tagName.toLowerCase();
    
    setSteps(prev => [...prev, {
      id: generateStepId(),
      type: 'click',
      value: selector,
      target: selector,
      label: `Clicar: ${elementLabel}`,
      enabled: true
    }]);
    
    try {
      element.click();
      toast.success('Clique executado!');
    } catch {
      toast.error('Erro ao clicar');
    }
    
    setShowActionChoice(false);
    setPendingElement(null);
  };

  const startTypeAction = () => {
    if (!pendingElement) return;
    
    const { element } = pendingElement;
    const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
    setOriginalValue(inputEl.value || '');
    
    setShowActionChoice(false);
    setIsWaitingForInput(true);
    
    setTimeout(() => {
      inputEl.focus();
      inputEl.select();
    }, 100);
    
    toast.info('Digite no campo e clique em Confirmar');
  };

  const confirmTypeAction = () => {
    if (!pendingElement) return;
    
    const { selector, info, element } = pendingElement;
    const inputEl = element as HTMLInputElement | HTMLTextAreaElement;
    const typedValue = inputEl.value;
    
    addNavigationStep();
    
    const elementLabel = info.placeholder || info.text?.slice(0, 20) || info.tagName.toLowerCase();
    
    setSteps(prev => [...prev, {
      id: generateStepId(),
      type: 'typeText',
      value: typedValue,
      target: selector,
      label: `Digitar "${typedValue.slice(0, 15)}${typedValue.length > 15 ? '...' : ''}" em: ${elementLabel}`,
      enabled: true
    }]);
    
    toast.success('Texto capturado!');
    
    setIsWaitingForInput(false);
    setPendingElement(null);
  };

  const cancelTypeAction = () => {
    if (pendingElement) {
      const inputEl = pendingElement.element as HTMLInputElement | HTMLTextAreaElement;
      inputEl.value = originalValue;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    setIsWaitingForInput(false);
    setShowActionChoice(true);
  };

  const removeStep = (stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId));
  };

  // Hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible && !isRecording) {
    return (
      <Button
        className="fixed bottom-4 left-4 z-[9999999] rounded-full shadow-lg"
        size="sm"
        onClick={() => setIsVisible(true)}
      >
        <Circle className="h-4 w-4 mr-2 text-red-500" />
        Macro
      </Button>
    );
  }

  return (
    <>
      <div 
        ref={recorderRef}
        className="fixed bottom-4 left-4 z-[9999999] bg-background border rounded-lg shadow-xl p-3 min-w-[280px]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isRecording && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            <span className="font-medium text-sm">
              {showNameInput ? 'Salvar Macro' : 
               isWaitingForInput ? 'Digite no campo...' :
               showActionChoice ? 'Escolha a ação' :
               isSelectingElement ? 'Clique no elemento' :
               isRecording ? 'Gravando' : 'Gravador de Macro'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              if (isRecording) cancelRecording();
              setIsVisible(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Aguardando input */}
        {isWaitingForInput && pendingElement && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Campo: <span className="font-medium text-foreground">
                {pendingElement.info.placeholder || pendingElement.info.tagName}
              </span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={confirmTypeAction}>
                <Check className="h-4 w-4 mr-1" />
                Confirmar
              </Button>
              <Button size="sm" variant="outline" onClick={cancelTypeAction}>
                Voltar
              </Button>
            </div>
          </div>
        )}

        {/* Escolha de ação */}
        {showActionChoice && pendingElement && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Elemento: <span className="font-medium text-foreground">
                {pendingElement.info.placeholder || pendingElement.info.text?.slice(0, 25) || pendingElement.info.tagName}
              </span>
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={executeClickAction}>
                <MousePointerClick className="h-4 w-4 mr-1" />
                Clicar
              </Button>
              <Button size="sm" variant="secondary" className="flex-1" onClick={startTypeAction}>
                <Type className="h-4 w-4 mr-1" />
                Digitar
              </Button>
            </div>
          </div>
        )}

        {/* Nome da macro */}
        {showNameInput && (
          <div className="space-y-3">
            <Input
              placeholder="Nome da macro..."
              value={macroName}
              onChange={(e) => setMacroName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={saveMacroHandler}>
                <Save className="h-4 w-4 mr-1" />
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={cancelRecording}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
        
        {/* Controles principais */}
        {!showNameInput && !showActionChoice && !isWaitingForInput && !isSelectingElement && (
          <>
            <div className="flex items-center gap-2 mb-3">
              {!isRecording ? (
                <Button size="sm" onClick={startRecording} className="flex-1">
                  <Circle className="h-4 w-4 mr-1 text-red-500" />
                  Gravar
                </Button>
              ) : (
                <>
                  <Button size="sm" onClick={startElementSelection} variant="secondary" className="flex-1">
                    <Crosshair className="h-4 w-4 mr-1" />
                    Selecionar
                  </Button>
                  <Button size="sm" onClick={stopRecording} variant="destructive">
                    <Square className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {/* Lista de passos */}
            {steps.length > 0 && (
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-1">Passos: {steps.length}</p>
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2 text-xs p-1.5 bg-muted/50 rounded group">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    {step.type === 'navigate' ? (
                      <Badge variant="outline" className="text-xs py-0 flex-1 truncate">
                        <Navigation className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">{step.value}</span>
                      </Badge>
                    ) : step.type === 'click' ? (
                      <Badge variant="default" className="text-xs py-0 flex-1 truncate">
                        <MousePointerClick className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">{step.label}</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs py-0 flex-1 truncate">
                        <Type className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">{step.label}</span>
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isRecording && steps.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Clique em Selecionar para capturar elementos
              </p>
            )}
          </>
        )}
      </div>

      <ElementSelector
        isActive={isSelectingElement}
        onSelect={handleElementSelected}
        onCancel={() => setIsSelectingElement(false)}
      />
    </>
  );
}

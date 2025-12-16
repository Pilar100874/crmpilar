import { useState, useEffect } from 'react';
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
  MousePointerClick
} from 'lucide-react';
import { toast } from 'sonner';
import { ElementSelector, ElementInfo } from './ElementSelector';

function generateStepId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function FloatingMacroRecorder() {
  const { saveMacro } = useMacro();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const [macroName, setMacroName] = useState('');
  const [steps, setSteps] = useState<MacroStep[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [lastCapturedPath, setLastCapturedPath] = useState<string | null>(null);

  const startRecording = () => {
    setSteps([]);
    setIsRecording(true);
    setLastCapturedPath(null);
    setIsSelectingElement(true);
    toast.success('Gravação iniciada! Clique nos elementos.');
  };

  const stopRecording = () => {
    setIsSelectingElement(false);
    
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

    toast.success('Macro salva!');
    setShowNameInput(false);
    setMacroName('');
    setSteps([]);
    setIsVisible(false);
  };

  const handleElementSelected = (selector: string, info: ElementInfo, element: HTMLElement, action: 'click' | 'type', typedValue?: string) => {
    // Adiciona navegação se mudou de tela
    const currentPath = window.location.pathname;
    if (lastCapturedPath !== currentPath) {
      setSteps(prev => [...prev, {
        id: generateStepId(),
        type: 'navigate',
        value: currentPath,
        label: `Abrir: ${currentPath}`,
        enabled: true
      }]);
      setLastCapturedPath(currentPath);
    }
    
    const elementLabel = info.placeholder || info.text?.slice(0, 15) || info.tagName.toLowerCase();
    
    if (action === 'click') {
      // Desativa seleção para liberar event listeners
      setIsSelectingElement(false);
      
      // Adiciona passo de clique
      setSteps(prev => [...prev, {
        id: generateStepId(),
        type: 'click',
        value: selector,
        target: selector,
        label: `Clicar: ${elementLabel}`,
        enabled: true
      }]);
      
      // Executa o clique após os listeners serem removidos
      setTimeout(() => {
        element.click();
        toast.success('Clique capturado!');
        // Reativa seleção para próximo elemento
        setTimeout(() => setIsSelectingElement(true), 200);
      }, 50);
    } else {
      // Ação de digitar - o ElementSelector já capturou o texto
      if (typedValue) {
        setSteps(prev => [...prev, {
          id: generateStepId(),
          type: 'typeText',
          value: typedValue,
          target: selector,
          label: `Digitar "${typedValue.slice(0, 12)}${typedValue.length > 12 ? '...' : ''}" em: ${elementLabel}`,
          enabled: true
        }]);
        toast.success('Texto capturado!');
      }
      setTimeout(() => setIsSelectingElement(true), 300);
    }
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
        data-element-selector
        className="fixed bottom-4 left-4 z-[9999999] bg-background border rounded-lg shadow-xl p-3 min-w-[260px]"
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
               isSelectingElement ? 'Selecione o elemento' :
               isRecording ? 'Gravando' : 'Macro'}
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

        {/* Nome da macro */}
        {showNameInput && (
          <div className="space-y-3">
            <Input
              placeholder="Nome da macro..."
              value={macroName}
              onChange={(e) => setMacroName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveMacroHandler()}
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
        
        {/* Controles */}
        {!showNameInput && (
          <>
            <div className="flex items-center gap-2 mb-3">
              {!isRecording ? (
                <Button size="sm" onClick={startRecording} className="flex-1">
                  <Circle className="h-4 w-4 mr-1 text-red-500" />
                  Gravar
                </Button>
              ) : (
                <Button size="sm" onClick={stopRecording} variant="destructive" className="flex-1">
                  <Square className="h-4 w-4 mr-1" />
                  Parar
                </Button>
              )}
            </div>

            {/* Lista de passos */}
            {steps.length > 0 && (
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-1">Passos: {steps.length}</p>
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-1 text-xs p-1 bg-muted/50 rounded group">
                    <span className="text-muted-foreground w-4">{index + 1}.</span>
                    {step.type === 'navigate' ? (
                      <Badge variant="outline" className="text-xs py-0 flex-1 truncate">
                        <Navigation className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">{step.value}</span>
                      </Badge>
                    ) : step.type === 'click' ? (
                      <Badge variant="default" className="text-xs py-0 flex-1 truncate">
                        <MousePointerClick className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">{step.label?.replace('Clicar: ', '')}</span>
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs py-0 flex-1 truncate">
                        <Type className="h-3 w-3 mr-1 shrink-0" />
                        <span className="truncate">{step.label?.replace('Digitar ', '').replace(' em:', ' →')}</span>
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0"
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
                Clique nos elementos da página
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

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
  
  // Estado para escolha de ação após selecionar elemento
  const [pendingElement, setPendingElement] = useState<{selector: string, info: ElementInfo} | null>(null);
  const [showActionChoice, setShowActionChoice] = useState(false);

  // Ativa o seletor de elementos quando está gravando e não tem escolha pendente
  useEffect(() => {
    if (isRecording && !showNameInput && !isSelectingElement && !showActionChoice) {
      const timer = setTimeout(() => {
        setIsSelectingElement(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRecording, showNameInput, isSelectingElement, showActionChoice]);

  const startRecording = () => {
    setSteps([]);
    setIsRecording(true);
    setLastCapturedPath(null);
    toast.success('Gravação iniciada! Clique no elemento que deseja capturar.');
  };

  const stopRecording = () => {
    setIsSelectingElement(false);
    setShowActionChoice(false);
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
  };

  const handleElementSelected = (selector: string, info: ElementInfo) => {
    setIsSelectingElement(false);
    setPendingElement({ selector, info });
    setShowActionChoice(true);
  };

  const addStepWithAction = (actionType: 'click' | 'typeText') => {
    if (!pendingElement) return;
    
    const { selector, info } = pendingElement;
    const currentPath = window.location.pathname;
    const newSteps: MacroStep[] = [];
    
    // Adiciona navegação se mudou de tela
    if (lastCapturedPath !== currentPath) {
      newSteps.push({
        id: generateStepId(),
        type: 'navigate',
        value: currentPath,
        label: `Abrir: ${currentPath}`,
        enabled: true
      });
      setLastCapturedPath(currentPath);
    }
    
    // Adiciona a ação escolhida
    const elementLabel = info.placeholder || info.text?.slice(0, 20) || info.tagName.toLowerCase();
    
    if (actionType === 'click') {
      newSteps.push({
        id: generateStepId(),
        type: 'click',
        value: selector,
        target: selector,
        label: `Clicar: ${elementLabel}`,
        enabled: true
      });
    } else {
      newSteps.push({
        id: generateStepId(),
        type: 'typeText',
        value: '',
        target: selector,
        label: `Digitar: ${elementLabel}`,
        enabled: true
      });
    }
    
    setSteps(prev => [...prev, ...newSteps]);
    setShowActionChoice(false);
    setPendingElement(null);
    toast.success('Ação adicionada! Continue selecionando ou pare a gravação.');
  };

  const removeStep = (stepId: string) => {
    setSteps(prev => prev.filter(s => s.id !== stepId));
  };

  // Hotkey para abrir/fechar gravador
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
        className="fixed bottom-4 left-4 z-[99999] rounded-full shadow-lg"
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
      <div className="fixed bottom-4 left-4 z-[99999] bg-background border rounded-lg shadow-xl p-3 min-w-[300px]">
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
               showActionChoice ? 'Escolha a ação' :
               isRecording ? 'Selecione os campos...' : 'Gravador de Macro'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              if (isRecording) {
                cancelRecording();
              }
              setIsVisible(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Escolha de ação após selecionar elemento */}
        {showActionChoice && pendingElement && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Elemento: <span className="font-medium text-foreground">
                {pendingElement.info.placeholder || pendingElement.info.text?.slice(0, 30) || pendingElement.info.tagName}
              </span>
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="default"
                className="flex-1"
                onClick={() => addStepWithAction('click')}
              >
                <MousePointerClick className="h-4 w-4 mr-1" />
                Clicar
              </Button>
              <Button 
                size="sm" 
                variant="secondary"
                className="flex-1"
                onClick={() => addStepWithAction('typeText')}
              >
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
        
        {/* Controles e lista de passos */}
        {!showNameInput && !showActionChoice && (
          <>
            {/* Controles */}
            <div className="flex items-center gap-2 mb-3">
              {!isRecording ? (
                <Button size="sm" onClick={startRecording} className="flex-1">
                  <Circle className="h-4 w-4 mr-1 text-red-500" />
                  Gravar
                </Button>
              ) : (
                <Button size="sm" onClick={stopRecording} variant="destructive" className="flex-1">
                  <Square className="h-4 w-4 mr-1" />
                  Parar Gravação
                </Button>
              )}
            </div>

            {/* Lista de passos */}
            {steps.length > 0 && (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-1">
                  Passos gravados: {steps.length}
                </p>
                {steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className="flex items-center gap-2 text-xs p-1.5 bg-muted/50 rounded group"
                  >
                    <span className="text-muted-foreground">{index + 1}.</span>
                    {step.type === 'navigate' ? (
                      <Badge variant="outline" className="text-xs py-0 flex-1">
                        <Navigation className="h-3 w-3 mr-1" />
                        {step.value}
                      </Badge>
                    ) : step.type === 'click' ? (
                      <Badge variant="default" className="text-xs py-0 flex-1">
                        <MousePointerClick className="h-3 w-3 mr-1" />
                        {step.label}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs py-0 flex-1">
                        <Type className="h-3 w-3 mr-1" />
                        {step.label}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Dica */}
            {isRecording && steps.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Navegue até a tela desejada e clique nos campos
              </p>
            )}
          </>
        )}
      </div>

      {/* Element Selector Overlay */}
      <ElementSelector
        isActive={isSelectingElement && isRecording}
        onSelect={handleElementSelected}
        onCancel={() => {
          setIsSelectingElement(false);
        }}
      />
    </>
  );
}

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
  Trash2
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

  // Sempre ativa o seletor de elementos quando está gravando
  useEffect(() => {
    if (isRecording && !showNameInput && !isSelectingElement) {
      // Pequeno delay para permitir que o UI atualize
      const timer = setTimeout(() => {
        setIsSelectingElement(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isRecording, showNameInput, isSelectingElement]);

  const startRecording = () => {
    setSteps([]);
    setIsRecording(true);
    setLastCapturedPath(null);
    toast.success('Gravação iniciada! Clique no elemento que deseja capturar.');
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

    toast.success('Macro salva com sucesso!');
    setShowNameInput(false);
    setMacroName('');
    setSteps([]);
  };

  const handleElementSelected = (selector: string, info: ElementInfo) => {
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
    
    // Adiciona o campo capturado
    newSteps.push({
      id: generateStepId(),
      type: 'typeText',
      value: '',
      target: selector,
      label: `Campo: ${info.placeholder || info.text?.slice(0, 20) || info.tagName.toLowerCase()}`,
      enabled: true
    });
    
    setSteps(prev => [...prev, ...newSteps]);
    toast.success('Campo capturado! Clique em outro ou pare a gravação.');
    
    // Reativa o seletor para continuar capturando
    setTimeout(() => {
      if (isRecording) {
        setIsSelectingElement(true);
      }
    }, 300);
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
              {showNameInput ? 'Salvar Macro' : isRecording ? 'Selecione os campos...' : 'Gravador de Macro'}
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

        {/* Nome da macro */}
        {showNameInput ? (
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
        ) : (
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

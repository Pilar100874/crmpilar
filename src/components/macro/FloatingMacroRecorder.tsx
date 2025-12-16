import { useState, useEffect, useCallback } from 'react';
import { useMacro } from '@/contexts/MacroContext';
import { MacroStep } from '@/types/macro';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Circle, 
  Square, 
  Pause, 
  Play,
  X,
  Save,
  MousePointer2,
  Navigation,
  Type
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
  const [isPaused, setIsPaused] = useState(false);
  const [isSelectingElement, setIsSelectingElement] = useState(false);
  const [macroName, setMacroName] = useState('');
  const [steps, setSteps] = useState<MacroStep[]>([]);
  const [showNameInput, setShowNameInput] = useState(false);

  // Captura navegação
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const handleNavigation = () => {
      const path = window.location.pathname;
      
      // Evita duplicar navegação para mesma rota
      const lastStep = steps[steps.length - 1];
      if (lastStep?.type === 'navigate' && lastStep.value === path) return;
      
      const newStep: MacroStep = {
        id: generateStepId(),
        type: 'navigate',
        value: path,
        label: `Abrir: ${path}`,
        enabled: true
      };
      
      setSteps(prev => [...prev, newStep]);
    };

    window.addEventListener('popstate', handleNavigation);
    
    // Captura navegação inicial
    handleNavigation();

    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [isRecording, isPaused]);

  const startRecording = () => {
    setSteps([]);
    setIsRecording(true);
    setIsPaused(false);
    toast.success('Gravação iniciada! Clique em "Selecionar Campo" para capturar elementos.');
  };

  const pauseRecording = () => {
    setIsPaused(true);
    toast.info('Gravação pausada');
  };

  const resumeRecording = () => {
    setIsPaused(false);
    toast.info('Gravação retomada');
  };

  const stopRecording = () => {
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
    setIsPaused(false);
    setSteps([]);
    setShowNameInput(false);
    setMacroName('');
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

  const startElementSelection = () => {
    setIsPaused(true);
    setIsSelectingElement(true);
  };

  const handleElementSelected = (selector: string, info: ElementInfo) => {
    setIsSelectingElement(false);
    
    const newStep: MacroStep = {
      id: generateStepId(),
      type: 'typeText',
      value: '',
      target: selector,
      label: `Campo: ${info.placeholder || info.text?.slice(0, 20) || info.tagName.toLowerCase()}`,
      enabled: true
    };
    
    setSteps(prev => [...prev, newStep]);
    setIsPaused(false);
    toast.success('Campo capturado!');
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
        className="fixed bottom-4 left-4 z-50 rounded-full shadow-lg"
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
      <div className="fixed bottom-4 left-4 z-50 bg-background border rounded-lg shadow-xl p-3 min-w-[300px]">
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
              {showNameInput ? 'Salvar Macro' : isRecording ? (isPaused ? 'Pausado' : 'Gravando...') : 'Gravador de Macro'}
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
                <>
                  {isPaused ? (
                    <Button size="sm" onClick={resumeRecording} variant="outline">
                      <Play className="h-4 w-4 mr-1" />
                      Continuar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={pauseRecording} variant="outline">
                      <Pause className="h-4 w-4 mr-1" />
                      Pausar
                    </Button>
                  )}
                  <Button size="sm" onClick={stopRecording} variant="default">
                    <Square className="h-4 w-4 mr-1" />
                    Parar
                  </Button>
                </>
              )}
            </div>

            {/* Botão de selecionar elemento */}
            {isRecording && (
              <Button 
                size="sm" 
                variant="secondary" 
                className="w-full mb-3"
                onClick={startElementSelection}
                disabled={isSelectingElement}
              >
                <MousePointer2 className="h-4 w-4 mr-2" />
                Selecionar Campo
              </Button>
            )}

            {/* Lista de passos */}
            {steps.length > 0 && (
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                <p className="text-xs text-muted-foreground mb-1">
                  Passos gravados: {steps.length}
                </p>
                {steps.map((step, index) => (
                  <div 
                    key={step.id}
                    className="flex items-center gap-2 text-xs p-1.5 bg-muted/50 rounded"
                  >
                    <span className="text-muted-foreground">{index + 1}.</span>
                    {step.type === 'navigate' ? (
                      <Badge variant="outline" className="text-xs py-0">
                        <Navigation className="h-3 w-3 mr-1" />
                        {step.value}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs py-0">
                        <Type className="h-3 w-3 mr-1" />
                        {step.label}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Dica */}
            {isRecording && steps.length === 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Navegue pelas telas e use "Selecionar Campo" para capturar elementos
              </p>
            )}
          </>
        )}
      </div>

      {/* Element Selector Overlay */}
      <ElementSelector
        isActive={isSelectingElement}
        onSelect={handleElementSelected}
        onCancel={() => {
          setIsSelectingElement(false);
          setIsPaused(false);
        }}
      />
    </>
  );
}

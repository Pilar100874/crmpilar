import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Undo,
  Redo,
  ChevronsUp,
  ArrowUp,
  ArrowDown,
  ChevronsDown,
  Copy,
  Lock,
  Unlock,
  Trash2,
} from "lucide-react";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export const ObjectActionsMenu = () => {
  const { fabricCanvas } = useCanvas();
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [isUndoRedoing, setIsUndoRedoing] = useState(false);

  useEffect(() => {
    if (!fabricCanvas) return;

    const updateActiveObject = () => {
      const obj = fabricCanvas.getActiveObject();
      setSelectedObject(obj);
    };

    const saveState = () => {
      // Don't save state during undo/redo operations
      if (isUndoRedoing) return;
      
      const json = JSON.stringify(fabricCanvas.toJSON());
      
      setHistory(prev => {
        // Remove any future states if we're not at the end
        const newHistory = prev.slice(0, historyStep + 1);
        newHistory.push(json);
        // Keep last 50 states
        return newHistory.slice(-50);
      });
      
      setHistoryStep(prev => {
        const newStep = prev + 1;
        return Math.min(newStep, 49);
      });
    };

    fabricCanvas.on('selection:created', updateActiveObject);
    fabricCanvas.on('selection:updated', updateActiveObject);
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));
    fabricCanvas.on('object:added', saveState);
    fabricCanvas.on('object:modified', saveState);
    fabricCanvas.on('object:removed', saveState);

    // Save initial state only once
    if (history.length === 0) {
      const initialJson = JSON.stringify(fabricCanvas.toJSON());
      setHistory([initialJson]);
      setHistoryStep(0);
    }

    return () => {
      fabricCanvas.off('selection:created', updateActiveObject);
      fabricCanvas.off('selection:updated', updateActiveObject);
      fabricCanvas.off('selection:cleared');
      fabricCanvas.off('object:added', saveState);
      fabricCanvas.off('object:modified', saveState);
      fabricCanvas.off('object:removed', saveState);
    };
  }, [fabricCanvas, historyStep, isUndoRedoing, history.length]);

  // Show menu even without selection for undo/redo
  if (!fabricCanvas) return null;

  const handleUndo = () => {
    if (historyStep > 0 && fabricCanvas) {
      setIsUndoRedoing(true);
      const prevStep = historyStep - 1;
      
      fabricCanvas.loadFromJSON(history[prevStep]).then(() => {
        fabricCanvas.renderAll();
        setHistoryStep(prevStep);
        setIsUndoRedoing(false);
        toast.success("Desfeito!");
      }).catch((err) => {
        console.error("Erro ao desfazer:", err);
        setIsUndoRedoing(false);
        toast.error("Erro ao desfazer");
      });
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1 && fabricCanvas) {
      setIsUndoRedoing(true);
      const nextStep = historyStep + 1;
      
      fabricCanvas.loadFromJSON(history[nextStep]).then(() => {
        fabricCanvas.renderAll();
        setHistoryStep(nextStep);
        setIsUndoRedoing(false);
        toast.success("Refeito!");
      }).catch((err) => {
        console.error("Erro ao refazer:", err);
        setIsUndoRedoing(false);
        toast.error("Erro ao refazer");
      });
    }
  };

  const handleBringToFront = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.bringObjectToFront(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Objeto movido para frente!");
  };

  const handleBringForward = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.bringObjectForward(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Subiu uma camada!");
  };

  const handleSendBackward = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.sendObjectBackwards(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Desceu uma camada!");
  };

  const handleSendToBack = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.sendObjectToBack(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Objeto enviado para trás!");
  };

  const handleDuplicate = () => {
    if (!selectedObject || !fabricCanvas) return;
    selectedObject.clone().then((cloned: any) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      fabricCanvas.renderAll();
      toast.success("Objeto duplicado!");
    });
  };

  const handleToggleLock = () => {
    if (!selectedObject || !fabricCanvas) return;
    const isLocked = (selectedObject as any).locked || false;
    
    selectedObject.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
      selectable: isLocked,
    });
    
    (selectedObject as any).locked = !isLocked;
    fabricCanvas.renderAll();
    toast.success(isLocked ? "Desbloqueado!" : "Bloqueado!");
  };

  const handleDelete = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Objeto removido!");
  };

  const canUndo = historyStep > 0;
  const canRedo = historyStep < history.length - 1;

  const globalActions = [
    { id: 'undo', icon: Undo, label: 'Desfazer', onClick: handleUndo, disabled: !canUndo, variant: undefined },
    { id: 'redo', icon: Redo, label: 'Refazer', onClick: handleRedo, disabled: !canRedo, variant: undefined },
  ];

  const objectActions = selectedObject ? (() => {
    const isLocked = (selectedObject as any).locked || false;
    return [
      { id: 'front', icon: ChevronsUp, label: 'Trazer para Frente', onClick: handleBringToFront, disabled: false, variant: undefined },
      { id: 'forward', icon: ArrowUp, label: 'Subir uma Camada', onClick: handleBringForward, disabled: false, variant: undefined },
      { id: 'backward', icon: ArrowDown, label: 'Descer uma Camada', onClick: handleSendBackward, disabled: false, variant: undefined },
      { id: 'back', icon: ChevronsDown, label: 'Enviar para Trás', onClick: handleSendToBack, disabled: false, variant: undefined },
      { id: 'duplicate', icon: Copy, label: 'Duplicar', onClick: handleDuplicate, disabled: false, variant: undefined },
      { id: 'lock', icon: isLocked ? Unlock : Lock, label: isLocked ? 'Desbloquear' : 'Bloquear', onClick: handleToggleLock, disabled: false, variant: undefined },
      { id: 'delete', icon: Trash2, label: 'Deletar', onClick: handleDelete, disabled: false, variant: 'destructive' as const },
    ];
  })() : [];

  const actions = [...globalActions, ...objectActions];

  return (
    <div className="fixed right-2 top-1/2 -translate-y-1/2 
                    flex flex-col items-center w-10 bg-card border border-border 
                    rounded-xl shadow-lg z-50 py-2 gap-1">
      {actions.map((action, index) => {
        const Icon = action.icon;
        const showSeparator = index === 1 && objectActions.length > 0; // After redo, before object actions
        
        return (
          <div key={action.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={action.variant || "ghost"}
                  size="icon"
                  disabled={action.disabled}
                  className={`
                    w-8 h-8 rounded-lg transition-all duration-200
                    ${action.variant === 'destructive' 
                      ? 'hover:bg-destructive hover:text-destructive-foreground' 
                      : 'hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                  onClick={action.onClick}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="bg-popover text-popover-foreground border shadow-md z-[60]">
                <p className="text-xs">{action.label}</p>
              </TooltipContent>
            </Tooltip>
            {showSeparator && (
              <div className="w-6 h-px bg-border mx-auto my-1" />
            )}
          </div>
        );
      })}
    </div>
  );
};

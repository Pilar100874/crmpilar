import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, PencilBrush, FabricImage } from "fabric";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "@/lib/toast-config";
import { Card } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Copy, Trash2, Lock, Unlock, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown } from "lucide-react";
import { applyOffsetWrap, applyOffsetWrapWithCutLine } from "@/lib/utils";
import { CutLineDialog } from "@/components/editor/CutLineDialog";
import { PlatformPreset } from "@/components/editor/PlatformSelectionDialog";

interface CanvasWorkspaceProps {
  selectedSize: string;
  platformPreset?: PlatformPreset | null;
}

const CanvasWorkspace = ({ selectedSize, platformPreset }: CanvasWorkspaceProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [showCutLineDialog, setShowCutLineDialog] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const historyRef = useRef<string[]>([]);
  const historyStepRef = useRef<number>(0);
  const isLoadingStateRef = useRef<boolean>(false);
  const { isLoading, setIsLoading, setFabricCanvas: setContextCanvas, setLoadingProgress } = useCanvas();

  useEffect(() => {
    if (!canvasRef.current) return;

    let canvas: FabricCanvas | null = null;
    let handleObjectAdded: (() => void) | null = null;
    let handleObjectModified: (() => void) | null = null;
    let handleObjectRemoved: (() => void) | null = null;
    let onCanvasUndo: (() => void) | null = null;
    let onCanvasRedo: (() => void) | null = null;
    let handleKeyDown: ((e: KeyboardEvent) => void) | null = null;

    setIsLoading(true);
    setLoadingProgress?.(10);
    
    const initCanvas = async () => {
      try {
        // Calcular dimensões do canvas
        const container = (canvasRef.current?.closest('[data-canvas-area]') as HTMLElement | null) ?? canvasRef.current?.parentElement;
        if (!container) throw new Error('Container não encontrado');
        
        const containerRect = container.getBoundingClientRect();
        
        // Use platformPreset dimensions if available, otherwise use container size
        let width, height;
        if (platformPreset) {
          // Calculate scale to fit preset dimensions in container - maximize screen usage
          const containerWidth = Math.max(300, containerRect.width - 32);
          const containerHeight = Math.max(300, containerRect.height - 32);
          const scaleX = containerWidth / platformPreset.width;
          const scaleY = containerHeight / platformPreset.height;
          const scale = Math.min(scaleX, scaleY); // Remover limite - permite escalar para cima
          
          width = Math.floor(platformPreset.width * scale);
          height = Math.floor(platformPreset.height * scale);
        } else {
          width = Math.max(300, containerRect.width - 32);
          height = Math.max(300, containerRect.height - 32);
        }
        
        console.log('Canvas size:', { 
          width, 
          height, 
          preset: platformPreset ? `${platformPreset.label} (${platformPreset.width}x${platformPreset.height})` : 'auto',
          containerWidth: containerRect.width, 
          containerHeight: containerRect.height 
        });
        setLoadingProgress?.(30);
      
        canvas = new FabricCanvas(canvasRef.current!, {
          width,
          height,
          backgroundColor: '#ffffff',
          preserveObjectStacking: true,
          selection: true,
          selectionBorderColor: '#4F46E5',
          selectionColor: 'rgba(79, 70, 229, 0.1)',
          selectionLineWidth: 2,
        });
        
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        setCanvasSize({ width, height });
        setLoadingProgress?.(50);

        // Carregar design se estiver editando do carrinho
        const designToLoad = sessionStorage.getItem('designToLoad');
        if (designToLoad) {
          try {
            canvas.loadFromJSON(designToLoad).then(() => {
              canvas.renderAll();
              sessionStorage.removeItem('designToLoad');
            });
          } catch (error) {
            console.error('Erro ao carregar design:', error);
          }
        }

        setLoadingProgress?.(70);

        // Customizar controles
        const cornerSize = 12;
        const cornerColor = '#ffffff';
        const cornerStrokeColor = '#4F46E5';
        const borderColor = '#4F46E5';
        const rotatingPointOffset = 40;
        
        FabricCanvas.prototype.selectionLineWidth = 2;
        
        const customizeControls = (obj: any) => {
          obj.set({
            borderColor: borderColor,
            borderScaleFactor: 2,
            cornerColor: cornerColor,
            cornerStrokeColor: cornerStrokeColor,
            cornerStyle: 'circle',
            cornerSize: cornerSize,
            transparentCorners: false,
            borderDashArray: [0],
            rotatingPointOffset: rotatingPointOffset,
            padding: 0,
            hasControls: true,
            hasBorders: true,
            lockScalingFlip: false,
          });
        };

        canvas.on('object:added', (e) => {
          if (e.target) customizeControls(e.target);
        });

        canvas.on('selection:created', (e) => {
          if (e.selected && e.selected.length > 1) {
            const activeSelection = canvas.getActiveObject();
            if (activeSelection) {
              customizeControls(activeSelection);
            }
          }
        });

        canvas.on('selection:updated', (e) => {
          const activeSelection = canvas.getActiveObject();
          if (activeSelection && activeSelection.type === 'activeSelection') {
            customizeControls(activeSelection);
          }
        });

        // Configurar brush padrão
        canvas.freeDrawingBrush = new PencilBrush(canvas);
        canvas.freeDrawingBrush.color = '#000000';
        canvas.freeDrawingBrush.width = 2;

        setFabricCanvas(canvas);
        setContextCanvas(canvas);
        
        (window as any).fabricCanvas = canvas;
        
        setLoadingProgress?.(100);
        setIsLoading(false);
        toast.success("Editor carregado com sucesso!");

        // Listener para atualizar objeto selecionado
        const handleSelection = () => {
          const active = canvas.getActiveObject();
          setSelectedObject(active);
        };

        const handleTextDoubleClick = (evt: any) => {
          const target = evt?.target as any;
          if (!target) return;
          if (target.type === 'textbox' || target.type === 'text' || target.type === 'i-text') {
            canvas.setActiveObject(target);
            canvas.renderAll();
            requestAnimationFrame(() => {
              try {
                target.enterEditing?.();
                target.selectAll?.();
                const hiddenTextarea = target.hiddenTextarea as HTMLTextAreaElement | undefined;
                hiddenTextarea?.focus?.();
              } catch {
                // noop
              }
            });
          }
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', () => setSelectedObject(null));
        canvas.on('mouse:dblclick', handleTextDoubleClick);

        // Histórico
        const saveState = () => {
          if (isLoadingStateRef.current || (window as any).pauseCanvasHistory) return;
          
          const json = JSON.stringify(canvas.toJSON());
          historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
          historyRef.current.push(json);
          historyStepRef.current = historyRef.current.length - 1;
          
          if (historyRef.current.length > 50) {
            historyRef.current.shift();
            historyStepRef.current--;
          }

          console.info('history:save', { index: historyStepRef.current, length: historyRef.current.length });
          window.dispatchEvent(
            new CustomEvent('canvas-history', {
              detail: { index: historyStepRef.current, length: historyRef.current.length },
            })
          );
        };

        saveState();

        handleObjectAdded = () => saveState();
        handleObjectModified = () => saveState();
        handleObjectRemoved = () => saveState();

        canvas.on('object:added', handleObjectAdded);
        canvas.on('object:modified', handleObjectModified);
        canvas.on('object:removed', handleObjectRemoved);

        // Centralizar objetos novos
        canvas.on('object:added', (evt) => {
          const obj: any = evt.target;
          if (!obj) return;
          if (isLoadingStateRef.current) return;
          if (obj.selectable === false || obj.evented === false) return;
          const l = typeof obj.left === 'number' ? obj.left : 0;
          const t = typeof obj.top === 'number' ? obj.top : 0;
          const isDefaultPos = Math.abs(l - 100) <= 2 && Math.abs(t - 100) <= 2;
          if (!isDefaultPos) return;
          try {
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = canvas.getZoom();
            const centerX = (canvas.getWidth() / 2 - vpt[4]) / zoom;
            const centerY = (canvas.getHeight() / 2 - vpt[5]) / zoom;
            obj.set({ left: centerX, top: centerY });
            obj.setCoords?.();
            canvas.setActiveObject(obj);
            canvas.renderAll();
          } catch (e) {
            // noop
          }
        });

        // History helpers
        ;(window as any).getCanvasHistory = () => ({ index: historyStepRef.current, length: historyRef.current.length });

        // Undo/Redo
        onCanvasUndo = () => {
          console.info('history:undo:request', { index: historyStepRef.current, length: historyRef.current.length });
          if (historyStepRef.current > 0) {
            isLoadingStateRef.current = true;
            historyStepRef.current--;
            const stateStr = historyRef.current[historyStepRef.current];
            let json: any = stateStr;
            try { json = JSON.parse(stateStr); } catch {}
            canvas.loadFromJSON(json).then(() => {
              canvas.renderAll();
              isLoadingStateRef.current = false;
              console.info('history:undo:done', { index: historyStepRef.current, length: historyRef.current.length });
              window.dispatchEvent(new CustomEvent('canvas-history', { detail: { index: historyStepRef.current, length: historyRef.current.length } }));
            }).catch((e) => {
              isLoadingStateRef.current = false;
              console.error('Erro ao desfazer (loadFromJSON):', e);
            });
          }
        };

        onCanvasRedo = () => {
          console.info('history:redo:request', { index: historyStepRef.current, length: historyRef.current.length });
          if (historyStepRef.current < historyRef.current.length - 1) {
            isLoadingStateRef.current = true;
            historyStepRef.current++;
            const stateStr = historyRef.current[historyStepRef.current];
            let json: any = stateStr;
            try { json = JSON.parse(stateStr); } catch {}
            canvas.loadFromJSON(json).then(() => {
              canvas.renderAll();
              isLoadingStateRef.current = false;
              console.info('history:redo:done', { index: historyStepRef.current, length: historyRef.current.length });
              window.dispatchEvent(new CustomEvent('canvas-history', { detail: { index: historyStepRef.current, length: historyRef.current.length } }));
            }).catch((e) => {
              isLoadingStateRef.current = false;
              console.error('Erro ao refazer (loadFromJSON):', e);
            });
          }
        };

        (window as any).canvasUndo = onCanvasUndo;
        (window as any).canvasRedo = onCanvasRedo;
        window.addEventListener('canvas-undo', onCanvasUndo as EventListener);
        window.addEventListener('canvas-redo', onCanvasRedo as EventListener);

        // Keyboard handler
        handleKeyDown = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement | null;
          const tag = target?.tagName?.toLowerCase();
          const isEditableTarget = !!(
            tag === 'input' ||
            tag === 'textarea' ||
            (target && (target as HTMLElement).isContentEditable)
          );

          const activeObj: any = canvas.getActiveObject?.();
          const fabricIsEditing = !!(activeObj && typeof activeObj.isEditing === 'boolean' && activeObj.isEditing);

          if (isEditableTarget || fabricIsEditing) return;

          if (e.key === 'Delete' || e.key === 'Backspace') {
            const activeObjects = canvas.getActiveObjects();
            if (activeObjects.length > 0) {
              e.preventDefault();
              activeObjects.forEach(obj => canvas.remove(obj));
              canvas.discardActiveObject();
              canvas.renderAll();
              toast.success(`${activeObjects.length} elemento(s) deletado(s)`);
            }
          }
        };

        // Resize handler
        const handleResize = () => {
          const container = (canvasRef.current?.closest('[data-canvas-area]') as HTMLElement | null) ?? canvasRef.current?.parentElement;
          if (!container) return;
          
          const containerRect = container.getBoundingClientRect();
          const width = Math.max(300, containerRect.width - 32);
          const height = Math.max(300, containerRect.height - 32);
          
          canvas.setDimensions({ width, height });
          setCanvasSize({ width, height });
          canvas.renderAll();
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);
      } catch (error) {
        console.error('Erro ao inicializar editor:', error);
        toast.error("Erro ao carregar o editor");
        setIsLoading(false);
      }
    };

    initCanvas();

    // Cleanup function
    return () => {
      if (canvas) {
        if (handleObjectAdded) canvas.off('object:added', handleObjectAdded);
        if (handleObjectModified) canvas.off('object:modified', handleObjectModified);
        if (handleObjectRemoved) canvas.off('object:removed', handleObjectRemoved);
        if (onCanvasUndo) window.removeEventListener('canvas-undo', onCanvasUndo as EventListener);
        if (onCanvasRedo) window.removeEventListener('canvas-redo', onCanvasRedo as EventListener);
        if (handleKeyDown) window.removeEventListener('keydown', handleKeyDown);
        delete (window as any).canvasUndo;
        delete (window as any).canvasRedo;
        delete (window as any).getCanvasHistory;
        delete (window as any).fabricCanvas;
        
        // Dispose canvas
        canvas.dispose();
        
        // CRITICAL: Clean up fabric-created elements
        const canvasElement = canvasRef.current;
        if (canvasElement && canvasElement.parentElement) {
          const parent = canvasElement.parentElement;
          const upperCanvas = parent.querySelector('.upper-canvas');
          if (upperCanvas) upperCanvas.remove();
          
          const canvasContainer = parent.querySelector('.canvas-container');
          if (canvasContainer) {
            // Move original canvas back if needed
            if (canvasElement.parentElement === canvasContainer) {
              parent.appendChild(canvasElement);
            }
            canvasContainer.remove();
          }
        }
        
        setContextCanvas(null);
        setFabricCanvas(null);
      }
    };
  }, [setIsLoading, setContextCanvas]);

  // Separate effect to handle platform preset changes without destroying the canvas
  useEffect(() => {
    if (!fabricCanvas || !platformPreset) return;

    const recalculateSize = () => {
      const container = (canvasRef.current?.closest('[data-canvas-area]') as HTMLElement | null) ?? canvasRef.current?.parentElement;
      if (!container) return;

      // Usar setTimeout para garantir que o container está com o tamanho correto
      setTimeout(() => {
        const containerRect = container.getBoundingClientRect();
        const containerWidth = Math.max(300, containerRect.width - 32);
        const containerHeight = Math.max(300, containerRect.height - 32);
        const scaleX = containerWidth / platformPreset.width;
        const scaleY = containerHeight / platformPreset.height;
        const scale = Math.min(scaleX, scaleY);
        
        const newWidth = Math.floor(platformPreset.width * scale);
        const newHeight = Math.floor(platformPreset.height * scale);

        console.log('Recalculando canvas para', platformPreset.label, ':', {
          container: { width: containerRect.width, height: containerRect.height },
          platform: { width: platformPreset.width, height: platformPreset.height },
          scale,
          newSize: { width: newWidth, height: newHeight },
          currentSize: { width: fabricCanvas.width, height: fabricCanvas.height }
        });

        // Sempre aplicar o novo tamanho
        fabricCanvas.setDimensions({ width: newWidth, height: newHeight });
        setCanvasSize({ width: newWidth, height: newHeight });
        fabricCanvas.renderAll();
        fabricCanvas.requestRenderAll();
      }, 100);
    };

    // Recalcular imediatamente
    recalculateSize();

    // Adicionar listener para resize da janela com debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        recalculateSize();
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [platformPreset, fabricCanvas]);

  const handleOpenCutLineDialog = () => {
    if (!selectedObject || !(selectedObject instanceof FabricImage)) {
      toast.error("Selecione uma imagem primeiro");
      return;
    }

    const imageElement = selectedObject.getElement() as HTMLImageElement;
    setCurrentImageUrl(imageElement.src);
    setShowCutLineDialog(true);
  };

  const handleApplyCutLine = async (cutLinePosition: number) => {
    if (!selectedObject || !fabricCanvas || !(selectedObject instanceof FabricImage)) return;

    try {
      toast.loading("Aplicando espelhamento com linha de corte...");
      
      const imageElement = selectedObject.getElement() as HTMLImageElement;
      const processedDataUrl = await applyOffsetWrapWithCutLine(imageElement, cutLinePosition);

      FabricImage.fromURL(processedDataUrl, { crossOrigin: 'anonymous' }).then((newImg) => {
        newImg.set({
          left: selectedObject.left,
          top: selectedObject.top,
          scaleX: selectedObject.scaleX,
          scaleY: selectedObject.scaleY,
          angle: selectedObject.angle,
        });

        fabricCanvas.remove(selectedObject);
        fabricCanvas.add(newImg);
        fabricCanvas.setActiveObject(newImg);
        fabricCanvas.renderAll();

        toast.dismiss();
        toast.success("Espelhamento com linha de corte aplicado!");
      });
    } catch (error) {
      toast.dismiss();
      toast.error("Erro ao aplicar espelhamento");
      console.error(error);
    }
  };

  const handleFillCanvas = () => {
    if (!selectedObject || !fabricCanvas) return;

    if (!(selectedObject instanceof FabricImage)) {
      toast.error("Essa função só funciona com imagens");
      return;
    }

    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    
    const imgWidth = selectedObject.width || 1;
    const imgHeight = selectedObject.height || 1;

    const scaleX = canvasWidth / imgWidth;
    const scaleY = canvasHeight / imgHeight;
    const scale = Math.max(scaleX, scaleY);

    selectedObject.set({
      scaleX: scale,
      scaleY: scale,
      left: canvasWidth / 2,
      top: canvasHeight / 2,
      originX: 'center',
      originY: 'center',
    });

    fabricCanvas.renderAll();
    toast.success("Imagem ajustada para preencher o canvas!");
  };

  const handleCopy = () => {
    if (!selectedObject || !fabricCanvas) return;
    
    selectedObject.clone().then((cloned: any) => {
      cloned.set({
        left: (selectedObject.left || 0) + 10,
        top: (selectedObject.top || 0) + 10,
      });
      fabricCanvas.add(cloned);
      fabricCanvas.setActiveObject(cloned);
      fabricCanvas.renderAll();
      toast.success("Objeto duplicado!");
    });
  };

  const handleDelete = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Objeto deletado!");
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
    toast.success(isLocked ? "Objeto desbloqueado!" : "Objeto bloqueado!");
  };

  const handleBringForward = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.bringObjectForward(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Objeto movido uma camada acima!");
  };

  const handleSendBackward = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.sendObjectBackwards(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Objeto movido uma camada abaixo!");
  };

  const handleBringToFront = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.bringObjectToFront(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Objeto movido para frente de tudo!");
  };

  const handleSendToBack = () => {
    if (!selectedObject || !fabricCanvas) return;
    fabricCanvas.sendObjectToBack(selectedObject);
    fabricCanvas.renderAll();
    toast.success("Objeto movido para trás de tudo!");
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold mb-2">Carregando Editor</h3>
          <p className="text-muted-foreground">Inicializando canvas...</p>
        </Card>
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="w-full h-full overflow-hidden bg-muted/20 flex items-center justify-center p-4">
          <canvas ref={canvasRef} className="border border-border shadow-lg" />
        </div>
      </ContextMenuTrigger>
      
      {selectedObject && (
        <ContextMenuContent className="w-56 bg-background">
          <ContextMenuItem onClick={handleBringToFront}>
            <ChevronsUp className="h-4 w-4 mr-2" />
            Trazer para Frente
          </ContextMenuItem>

          <ContextMenuItem onClick={handleBringForward}>
            <ArrowUp className="h-4 w-4 mr-2" />
            Subir uma Camada
          </ContextMenuItem>

          <ContextMenuItem onClick={handleSendBackward}>
            <ArrowDown className="h-4 w-4 mr-2" />
            Descer uma Camada
          </ContextMenuItem>

          <ContextMenuItem onClick={handleSendToBack}>
            <ChevronsDown className="h-4 w-4 mr-2" />
            Enviar para Trás
          </ContextMenuItem>
          
          <ContextMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </ContextMenuItem>
          
          <ContextMenuItem onClick={handleToggleLock}>
            {(selectedObject as any).locked ? (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                Desbloquear
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Bloquear
              </>
            )}
          </ContextMenuItem>
          
          <ContextMenuItem onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Deletar
          </ContextMenuItem>
        </ContextMenuContent>
      )}
      
      <CutLineDialog
        open={showCutLineDialog}
        onOpenChange={setShowCutLineDialog}
        imageUrl={currentImageUrl}
        onApply={handleApplyCutLine}
      />
    </ContextMenu>
  );
};

export default CanvasWorkspace;

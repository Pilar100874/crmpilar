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

interface CanvasWorkspaceProps {
  selectedSize: string;
}

const CanvasWorkspace = ({ selectedSize }: CanvasWorkspaceProps) => {
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

    setIsLoading(true);
    setLoadingProgress?.(10);
    
    const initCanvas = async () => {
      try {
        // Calcular dimensões do canvas - usar 100% do container
        const container = canvasRef.current.parentElement;
        if (!container) throw new Error('Container não encontrado');
        
        const containerRect = container.getBoundingClientRect();
        const width = Math.max(300, containerRect.width - 32); // 32px = padding
        const height = Math.max(300, containerRect.height - 32);
        
        console.log('Canvas size:', { width, height, containerWidth: containerRect.width, containerHeight: containerRect.height });
        setLoadingProgress?.(30);
      
        const canvas = new FabricCanvas(canvasRef.current, {
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

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', () => setSelectedObject(null));

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
        };

        saveState();

        const handleObjectAdded = () => saveState();
        const handleObjectModified = () => saveState();
        const handleObjectRemoved = () => saveState();

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

        // Undo/Redo
        (window as any).canvasUndo = () => {
          if (historyStepRef.current > 0) {
            isLoadingStateRef.current = true;
            historyStepRef.current--;
            const state = historyRef.current[historyStepRef.current];
            canvas.loadFromJSON(state).then(() => {
              canvas.renderAll();
              isLoadingStateRef.current = false;
            });
          }
        };

        (window as any).canvasRedo = () => {
          if (historyStepRef.current < historyRef.current.length - 1) {
            isLoadingStateRef.current = true;
            historyStepRef.current++;
            const state = historyRef.current[historyStepRef.current];
            canvas.loadFromJSON(state).then(() => {
              canvas.renderAll();
              isLoadingStateRef.current = false;
            });
          }
        };

        // Keyboard handler
        const handleKeyDown = (e: KeyboardEvent) => {
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
          const container = canvasRef.current?.parentElement;
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

        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('keydown', handleKeyDown);
          canvas.off('selection:created', handleSelection);
          canvas.off('selection:updated', handleSelection);
          canvas.off('selection:cleared');
          canvas.off('object:added', handleObjectAdded);
          canvas.off('object:modified', handleObjectModified);
          canvas.off('object:removed', handleObjectRemoved);
          delete (window as any).canvasUndo;
          delete (window as any).canvasRedo;
          canvas.dispose();
          setContextCanvas(null);
        };
      } catch (error) {
        console.error('Erro ao inicializar editor:', error);
        toast.error("Erro ao carregar o editor");
        setIsLoading(false);
      }
    };

    initCanvas();
  }, [setIsLoading, setContextCanvas]);

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

      FabricImage.fromURL(processedDataUrl).then((newImg) => {
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

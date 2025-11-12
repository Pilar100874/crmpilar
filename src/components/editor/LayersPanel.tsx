import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "@/lib/toast-config";
import { Layers, Eye, EyeOff, Trash2, GripVertical, Lock, Unlock, ChevronUp, ChevronDown } from "lucide-react";
import { FabricObject } from "fabric";

const LayersPanel = () => {
  const { fabricCanvas } = useCanvas();
  const [layers, setLayers] = useState<FabricObject[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<FabricObject | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingLayer, setEditingLayer] = useState<FabricObject | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fabricCanvas) return;

    const updateLayers = () => {
      const objects = fabricCanvas.getObjects();
      setLayers([...objects].reverse()); // Reversed to show top layer first
    };

    updateLayers();

    fabricCanvas.on('object:added', updateLayers);
    fabricCanvas.on('object:removed', updateLayers);
    fabricCanvas.on('object:modified', updateLayers);
    fabricCanvas.on('selection:created', (e) => setSelectedLayer(e.selected?.[0] || null));
    fabricCanvas.on('selection:updated', (e) => setSelectedLayer(e.selected?.[0] || null));
    fabricCanvas.on('selection:cleared', () => setSelectedLayer(null));

    return () => {
      fabricCanvas.off('object:added', updateLayers);
      fabricCanvas.off('object:removed', updateLayers);
      fabricCanvas.off('object:modified', updateLayers);
    };
  }, [fabricCanvas]);

  const getLayerName = (obj: FabricObject): string => {
    // Check if object has a custom name
    if ((obj as any).customName) {
      return (obj as any).customName;
    }
    
    if (obj.type === 'textbox' || obj.type === 'text') return '📝 Texto';
    if (obj.type === 'image') return '🖼️ Imagem';
    if (obj.type === 'circle') return '🔵 Círculo';
    if (obj.type === 'rect') return '🟦 Retângulo';
    if (obj.type === 'triangle') return '🔺 Triângulo';
    if (obj.type === 'path') return '✏️ Desenho';
    return `📄 ${obj.type}`;
  };

  const selectLayer = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    fabricCanvas.setActiveObject(obj);
    fabricCanvas.renderAll();
    setSelectedLayer(obj);
  };

  const toggleVisibility = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    obj.visible = !obj.visible;
    fabricCanvas.renderAll();
    setLayers([...layers]);
    toast.success(obj.visible ? "Camada visível" : "Camada oculta");
  };

  const toggleLock = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    const isLocked = (obj as any).locked || false;
    
    obj.set({
      lockMovementX: !isLocked,
      lockMovementY: !isLocked,
      lockRotation: !isLocked,
      lockScalingX: !isLocked,
      lockScalingY: !isLocked,
      selectable: isLocked,
    });
    
    (obj as any).locked = !isLocked;
    fabricCanvas.renderAll();
    setLayers([...layers]);
    toast.success(isLocked ? "Camada desbloqueada" : "Camada bloqueada");
  };

  const deleteLayer = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    fabricCanvas.remove(obj);
    fabricCanvas.renderAll();
    toast.success("Camada deletada");
  };

  const moveLayer = (obj: FabricObject, direction: 'up' | 'down') => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects();
    const currentIndex = objects.indexOf(obj);
    
    if (direction === 'up' && currentIndex < objects.length - 1) {
      // Move up means higher z-index
      const newIndex = currentIndex + 1;
      fabricCanvas.remove(obj);
      fabricCanvas.insertAt(newIndex, obj);
      toast.success("Camada movida para frente");
    } else if (direction === 'down' && currentIndex > 0) {
      // Move down means lower z-index
      const newIndex = currentIndex - 1;
      fabricCanvas.remove(obj);
      fabricCanvas.insertAt(newIndex, obj);
      toast.success("Camada movida para trás");
    }
    
    fabricCanvas.renderAll();
    setLayers([...fabricCanvas.getObjects()].reverse());
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex || !fabricCanvas) return;

    const draggedLayer = layers[draggedIndex];
    
    // Convert visual index (reversed) to actual canvas index
    const actualDraggedIndex = layers.length - 1 - draggedIndex;
    const actualDropIndex = layers.length - 1 - dropIndex;
    
    // Remove and reinsert at new position
    fabricCanvas.remove(draggedLayer);
    fabricCanvas.insertAt(actualDropIndex, draggedLayer);
    fabricCanvas.renderAll();
    
    // Update layers state
    setLayers([...fabricCanvas.getObjects()].reverse());
    setDraggedIndex(null);
    
    toast.success("Camada reordenada");
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const startEditing = (obj: FabricObject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLayer(obj);
    setEditingName(getLayerName(obj));
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const finishEditing = () => {
    if (editingLayer && editingName.trim()) {
      (editingLayer as any).customName = editingName.trim();
      setLayers([...layers]); // Force re-render
      toast.success("Nome da camada alterado");
    }
    setEditingLayer(null);
    setEditingName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditingLayer(null);
      setEditingName("");
    }
  };


  return (
    <div className="w-80 h-full flex flex-col bg-accent/5 border-r border-accent/20">
      <div className="p-4 pb-3 border-b border-accent/20 bg-accent/10">
        <h2 className="text-base font-semibold flex items-center gap-2 text-accent-foreground">
          <Layers className="h-4 w-4" />
          Camadas
        </h2>
      </div>

      <div className="flex-1 p-0 overflow-hidden">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <Layers className="h-12 w-12 text-accent/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma camada ainda
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Adicione elementos ao canvas
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {layers.map((obj, index) => (
                <div
                  key={index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group flex items-center gap-2 p-2 rounded-md cursor-move transition-all ${
                    selectedLayer === obj
                      ? 'bg-accent/30 border border-accent/40'
                      : 'hover:bg-accent/10 border border-transparent'
                  } ${
                    draggedIndex === index
                      ? 'opacity-50 scale-95'
                      : ''
                  }`}
                  onClick={() => selectLayer(obj)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    {editingLayer === obj ? (
                      <Input
                        ref={inputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={finishEditing}
                        onKeyDown={handleKeyDown}
                        className="h-6 text-sm px-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p 
                        className="text-sm font-medium truncate cursor-text"
                        onDoubleClick={(e) => startEditing(obj, e)}
                      >
                        {getLayerName(obj)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(obj, 'up');
                      }}
                      title="Mover para frente"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(obj, 'down');
                      }}
                      title="Mover para trás"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleVisibility(obj);
                      }}
                    >
                      {obj.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLock(obj);
                      }}
                    >
                      {(obj as any).locked ? (
                        <Lock className="h-4 w-4" />
                      ) : (
                        <Unlock className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(obj);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default LayersPanel;